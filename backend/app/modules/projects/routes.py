from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, desc
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.modules.contacts.models import Contact
from app.modules.tasks.models import Task
from app.modules.documents.models import Document
from app.modules.calendar.models import Event
from . import models, schemas

router = APIRouter()

# === PROJECTS ===

@router.get("/api/{tenant_id}/projects", response_model=List[schemas.ProjectResponse])
async def list_projects(
    tenant_id: str,
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    archived: bool = Query(False),
    member_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(models.Project).filter_by(
        tenant_id=tenant_id,
        is_archived=archived
    ).options(
        joinedload(models.Project.creator),
        joinedload(models.Project.client),
        joinedload(models.Project.members).joinedload(models.ProjectMember.contact)
    )
    
    if status:
        query = query.filter(models.Project.status == status)
    
    if priority:
        query = query.filter(models.Project.priority == priority)
    
    if member_id:
        query = query.join(models.ProjectMember).filter(
            models.ProjectMember.contact_id == member_id
        )
    
    projects = query.order_by(desc(models.Project.created_at)).all()
    return projects

@router.post("/api/{tenant_id}/projects", response_model=schemas.ProjectResponse)
async def create_project(
    tenant_id: str,
    project: schemas.ProjectCreate,
    db: Session = Depends(get_db)
):
    # Vérifier que creator existe
    creator = db.query(Contact).filter_by(
        id=project.created_by,
        tenant_id=tenant_id
    ).first()
    
    if not creator:
        raise HTTPException(status_code=404, detail="Creator not found")
    
    # Vérifier client si spécifié
    if project.client_id:
        client = db.query(Contact).filter_by(
            id=project.client_id,
            tenant_id=tenant_id
        ).first()
        
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
    
    # Créer le projet
    project_data = project.dict()
    member_ids = project_data.pop('member_ids', [])
    
    db_project = models.Project(
        **project_data,
        tenant_id=tenant_id
    )
    
    db.add(db_project)
    db.flush()
    
    # Ajouter les membres
    for contact_id in member_ids:
        contact = db.query(Contact).filter_by(
            id=contact_id,
            tenant_id=tenant_id
        ).first()
        
        if contact:
            member = models.ProjectMember(
                project_id=db_project.id,
                contact_id=contact_id,
                role="member" if contact_id != project.created_by else "owner",
                joined_at=datetime.now(),
                tenant_id=tenant_id
            )
            db.add(member)
    
    # Ajouter le créateur comme owner s'il n'est pas dans la liste
    if project.created_by not in member_ids:
        owner = models.ProjectMember(
            project_id=db_project.id,
            contact_id=project.created_by,
            role="owner",
            joined_at=datetime.now(),
            tenant_id=tenant_id
        )
        db.add(owner)
    
    db.commit()
    db.refresh(db_project)
    
    # Recharger avec relations
    db_project = db.query(models.Project).options(
        joinedload(models.Project.creator),
        joinedload(models.Project.client),
        joinedload(models.Project.members).joinedload(models.ProjectMember.contact)
    ).filter_by(id=db_project.id).first()
    
    return db_project

@router.get("/api/{tenant_id}/projects/{project_id}", response_model=schemas.ProjectDetails)
async def get_project_details(
    tenant_id: str,
    project_id: int,
    db: Session = Depends(get_db)
):
    project = db.query(models.Project).options(
        joinedload(models.Project.creator),
        joinedload(models.Project.client),
        joinedload(models.Project.members).joinedload(models.ProjectMember.contact)
    ).filter_by(
        id=project_id,
        tenant_id=tenant_id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Récupérer les tâches du projet
    tasks = db.query(Task).join(models.ProjectTask).filter(
        models.ProjectTask.project_id == project_id,
        Task.tenant_id == tenant_id
    ).all()
    
    # Récupérer les documents du projet
    documents = db.query(Document).join(models.ProjectDocument).filter(
        models.ProjectDocument.project_id == project_id,
        Document.tenant_id == tenant_id
    ).all()
    
    # Récupérer les événements du projet
    events = db.query(Event).join(models.ProjectEvent).filter(
        models.ProjectEvent.project_id == project_id,
        Event.tenant_id == tenant_id
    ).all()
    
    # Statistiques
    completed_tasks = [t for t in tasks if t.status == "done"]
    
    project_dict = {
        **project.__dict__,
        "tasks": tasks,
        "documents": documents,
        "events": events,
        "task_count": len(tasks),
        "completed_task_count": len(completed_tasks),
        "document_count": len(documents),
        "event_count": len(events)
    }
    
    return project_dict

@router.put("/api/{tenant_id}/projects/{project_id}", response_model=schemas.ProjectResponse)
async def update_project(
    tenant_id: str,
    project_id: int,
    project_update: schemas.ProjectUpdate,
    db: Session = Depends(get_db)
):
    project = db.query(models.Project).filter_by(
        id=project_id,
        tenant_id=tenant_id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Mettre à jour les champs fournis
    for field, value in project_update.dict(exclude_unset=True).items():
        setattr(project, field, value)
    
    db.commit()
    db.refresh(project)
    
    return project

# === MEMBRES ===

@router.post("/api/{tenant_id}/projects/{project_id}/members", response_model=schemas.ProjectMemberResponse)
async def add_project_member(
    tenant_id: str,
    project_id: int,
    member: schemas.ProjectMemberCreate,
    db: Session = Depends(get_db)
):
    # Vérifications
    project = db.query(models.Project).filter_by(
        id=project_id,
        tenant_id=tenant_id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    contact = db.query(Contact).filter_by(
        id=member.contact_id,
        tenant_id=tenant_id
    ).first()
    
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    # Vérifier que pas déjà membre
    existing = db.query(models.ProjectMember).filter_by(
        project_id=project_id,
        contact_id=member.contact_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Contact is already a member")
    
    # Créer membre
    db_member = models.ProjectMember(
        project_id=project_id,
        contact_id=member.contact_id,
        role=member.role,
        hourly_rate=member.hourly_rate,
        joined_at=datetime.now(),
        tenant_id=tenant_id
    )
    
    db.add(db_member)
    db.commit()
    db.refresh(db_member)
    
    return db_member

# === LIENS AVEC AUTRES MODULES ===

@router.post("/api/{tenant_id}/projects/{project_id}/tasks/{task_id}")
async def link_task_to_project(
    tenant_id: str,
    project_id: int,
    task_id: int,
    db: Session = Depends(get_db)
):
    # Vérifications
    project = db.query(models.Project).filter_by(
        id=project_id,
        tenant_id=tenant_id
    ).first()
    
    task = db.query(Task).filter_by(
        id=task_id,
        tenant_id=tenant_id
    ).first()
    
    if not project or not task:
        raise HTTPException(status_code=404, detail="Project or task not found")
    
    # Vérifier si déjà lié
    existing = db.query(models.ProjectTask).filter_by(
        project_id=project_id,
        task_id=task_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Task already linked to project")
    
    # Créer lien
    link = models.ProjectTask(
        project_id=project_id,
        task_id=task_id,
        tenant_id=tenant_id
    )
    
    db.add(link)
    db.commit()
    
    return {"message": "Task linked to project successfully"}

@router.post("/api/{tenant_id}/projects/{project_id}/documents/{document_id}")
async def link_document_to_project(
    tenant_id: str,
    project_id: int,
    document_id: int,
    db: Session = Depends(get_db)
):
    # Vérifications
    project = db.query(models.Project).filter_by(
        id=project_id,
        tenant_id=tenant_id
    ).first()
    
    document = db.query(Document).filter_by(
        id=document_id,
        tenant_id=tenant_id
    ).first()
    
    if not project or not document:
        raise HTTPException(status_code=404, detail="Project or document not found")
    
    # Créer lien
    link = models.ProjectDocument(
        project_id=project_id,
        document_id=document_id,
        tenant_id=tenant_id
    )
    
    db.add(link)
    db.commit()
    
    return {"message": "Document linked to project successfully"}

# === STATISTIQUES ===

@router.get("/api/{tenant_id}/projects/stats", response_model=schemas.ProjectStats)
async def get_project_stats(
    tenant_id: str,
    db: Session = Depends(get_db)
):
    total_projects = db.query(models.Project).filter_by(
        tenant_id=tenant_id,
        is_archived=False
    ).count()
    
    active_projects = db.query(models.Project).filter_by(
        tenant_id=tenant_id,
        status="active",
        is_archived=False
    ).count()
    
    completed_projects = db.query(models.Project).filter_by(
        tenant_id=tenant_id,
        status="completed"
    ).count()
    
    # Projets en retard
    now = datetime.now()
    overdue_projects = db.query(models.Project).filter(
        models.Project.tenant_id == tenant_id,
        models.Project.deadline < now,
        models.Project.status.in_(["planning", "active"]),
        models.Project.is_archived == False
    ).count()
    
    # Répartition par statut
    projects_by_status = db.query(
        models.Project.status,
        func.count(models.Project.id)
    ).filter_by(
        tenant_id=tenant_id,
        is_archived=False
    ).group_by(models.Project.status).all()
    
    # Répartition par priorité
    projects_by_priority = db.query(
        models.Project.priority,
        func.count(models.Project.id)
    ).filter_by(
        tenant_id=tenant_id,
        is_archived=False
    ).group_by(models.Project.priority).all()
    
    return {
        "total_projects": total_projects,
        "active_projects": active_projects,
        "completed_projects": completed_projects,
        "overdue_projects": overdue_projects,
        "projects_by_status": {status: count for status, count in projects_by_status},
        "projects_by_priority": {priority: count for priority, count in projects_by_priority}
    }