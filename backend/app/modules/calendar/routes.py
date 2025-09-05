from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func
from typing import List, Optional
from datetime import datetime, timedelta

from app.core.database import get_db
from app.modules.contacts.models import Contact
from app.modules.tasks.models import Task
from . import models, schemas

router = APIRouter()

# === EVENTS ===

@router.get("/api/{tenant_id}/events", response_model=List[schemas.EventResponse])
async def list_events(
    tenant_id: str,
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    event_type: Optional[schemas.EventTypeEnum] = Query(None),
    contact_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(models.Event).filter_by(tenant_id=tenant_id).options(
        joinedload(models.Event.creator),
        joinedload(models.Event.participants).joinedload(models.EventParticipant.contact)
    )
    
    # Filtres par date
    if start_date:
        query = query.filter(models.Event.end_time >= start_date)
    if end_date:
        query = query.filter(models.Event.start_time <= end_date)
    
    # Filtres par type
    if event_type:
        query = query.filter(models.Event.event_type == event_type)
    
    # Filtres par participant
    if contact_id:
        query = query.join(models.EventParticipant).filter(
            models.EventParticipant.contact_id == contact_id
        )
    
    events = query.order_by(models.Event.start_time).all()
    return events

@router.post("/api/{tenant_id}/events", response_model=schemas.EventResponse)
async def create_event(
    tenant_id: str,
    event: schemas.EventCreate,
    db: Session = Depends(get_db)
):
    # Vérifier que creator existe
    creator = db.query(Contact).filter_by(
        id=event.created_by,
        tenant_id=tenant_id
    ).first()
    
    if not creator:
        raise HTTPException(status_code=404, detail="Creator not found")
    
    # Vérifier la tâche reliée si spécifiée
    if event.related_task_id:
        task = db.query(Task).filter_by(
            id=event.related_task_id,
            tenant_id=tenant_id
        ).first()
        
        if not task:
            raise HTTPException(status_code=404, detail="Related task not found")
    
    # Créer l'événement
    event_data = event.dict()
    participant_ids = event_data.pop('participant_ids', [])
    
    db_event = models.Event(
        **event_data,
        tenant_id=tenant_id
    )
    
    db.add(db_event)
    db.flush()  # Pour obtenir l'ID
    
    # Ajouter les participants
    for contact_id in participant_ids:
        # Vérifier que le contact existe
        contact = db.query(Contact).filter_by(
            id=contact_id,
            tenant_id=tenant_id
        ).first()
        
        if contact:
            participant = models.EventParticipant(
                event_id=db_event.id,
                contact_id=contact_id,
                tenant_id=tenant_id,
                role="attendee" if contact_id != event.created_by else "organizer"
            )
            db.add(participant)
    
    # Ajouter le créateur comme organisateur s'il n'est pas déjà dans la liste
    if event.created_by not in participant_ids:
        organizer = models.EventParticipant(
            event_id=db_event.id,
            contact_id=event.created_by,
            tenant_id=tenant_id,
            role="organizer",
            status="accepted"
        )
        db.add(organizer)
    
    db.commit()
    db.refresh(db_event)
    
    # Recharger avec relations
    db_event = db.query(models.Event).options(
        joinedload(models.Event.creator),
        joinedload(models.Event.participants).joinedload(models.EventParticipant.contact)
    ).filter_by(id=db_event.id).first()
    
    return db_event

@router.get("/api/{tenant_id}/events/{event_id}", response_model=schemas.EventResponse)
async def get_event(
    tenant_id: str,
    event_id: int,
    db: Session = Depends(get_db)
):
    event = db.query(models.Event).options(
        joinedload(models.Event.creator),
        joinedload(models.Event.participants).joinedload(models.EventParticipant.contact)
    ).filter_by(
        id=event_id,
        tenant_id=tenant_id
    ).first()
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    return event

@router.put("/api/{tenant_id}/events/{event_id}", response_model=schemas.EventResponse)
async def update_event(
    tenant_id: str,
    event_id: int,
    event_update: schemas.EventUpdate,
    db: Session = Depends(get_db)
):
    event = db.query(models.Event).filter_by(
        id=event_id,
        tenant_id=tenant_id
    ).first()
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Mettre à jour les champs fournis
    for field, value in event_update.dict(exclude_unset=True).items():
        setattr(event, field, value)
    
    db.commit()
    db.refresh(event)
    
    # Recharger avec relations
    event = db.query(models.Event).options(
        joinedload(models.Event.creator),
        joinedload(models.Event.participants).joinedload(models.EventParticipant.contact)
    ).filter_by(id=event_id).first()
    
    return event

@router.delete("/api/{tenant_id}/events/{event_id}")
async def delete_event(
    tenant_id: str,
    event_id: int,
    db: Session = Depends(get_db)
):
    event = db.query(models.Event).filter_by(
        id=event_id,
        tenant_id=tenant_id
    ).first()
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    db.delete(event)
    db.commit()
    
    return {"message": "Event deleted successfully"}

# === PARTICIPANTS ===

@router.post("/api/{tenant_id}/events/{event_id}/participants", response_model=schemas.ParticipantResponse)
async def add_participant(
    tenant_id: str,
    event_id: int,
    participant: schemas.ParticipantCreate,
    db: Session = Depends(get_db)
):
    # Vérifier que l'événement existe
    event = db.query(models.Event).filter_by(
        id=event_id,
        tenant_id=tenant_id
    ).first()
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Vérifier que le contact existe
    contact = db.query(Contact).filter_by(
        id=participant.contact_id,
        tenant_id=tenant_id
    ).first()
    
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    # Vérifier que le participant n'existe pas déjà
    existing = db.query(models.EventParticipant).filter_by(
        event_id=event_id,
        contact_id=participant.contact_id,
        tenant_id=tenant_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Participant already exists")
    
    # Créer le participant
    db_participant = models.EventParticipant(
        event_id=event_id,
        contact_id=participant.contact_id,
        role=participant.role,
        tenant_id=tenant_id
    )
    
    db.add(db_participant)
    db.commit()
    db.refresh(db_participant)
    
    # Recharger avec relations
    db_participant = db.query(models.EventParticipant).options(
        joinedload(models.EventParticipant.contact)
    ).filter_by(id=db_participant.id).first()
    
    return db_participant

@router.put("/api/{tenant_id}/events/{event_id}/participants/{participant_id}", response_model=schemas.ParticipantResponse)
async def update_participant_status(
    tenant_id: str,
    event_id: int,
    participant_id: int,
    participant_update: schemas.ParticipantUpdate,
    db: Session = Depends(get_db)
):
    participant = db.query(models.EventParticipant).filter_by(
        id=participant_id,
        event_id=event_id,
        tenant_id=tenant_id
    ).first()
    
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    participant.status = participant_update.status
    db.commit()
    db.refresh(participant)
    
    return participant

# === VUES CALENDRIER ===

@router.get("/api/{tenant_id}/calendar", response_model=schemas.CalendarView)
async def get_calendar_view(
    tenant_id: str,
    start_date: datetime = Query(...),
    end_date: datetime = Query(...),
    db: Session = Depends(get_db)
):
    events = db.query(models.Event).options(
        joinedload(models.Event.creator),
        joinedload(models.Event.participants).joinedload(models.EventParticipant.contact)
    ).filter(
        models.Event.tenant_id == tenant_id,
        models.Event.start_time <= end_date,
        models.Event.end_time >= start_date
    ).order_by(models.Event.start_time).all()
    
    return {
        "start_date": start_date,
        "end_date": end_date,
        "events": events,
        "total_events": len(events)
    }

@router.get("/api/{tenant_id}/calendar/stats", response_model=schemas.EventStats)
async def get_calendar_stats(
    tenant_id: str,
    db: Session = Depends(get_db)
):
    now = datetime.now()
    week_start = now - timedelta(days=now.weekday())
    month_start = now.replace(day=1)
    
    # Compteurs
    total_events = db.query(models.Event).filter_by(tenant_id=tenant_id).count()
    
    upcoming_events = db.query(models.Event).filter(
        models.Event.tenant_id == tenant_id,
        models.Event.start_time >= now
    ).count()
    
    events_this_week = db.query(models.Event).filter(
        models.Event.tenant_id == tenant_id,
        models.Event.start_time >= week_start,
        models.Event.start_time < week_start + timedelta(days=7)
    ).count()
    
    events_this_month = db.query(models.Event).filter(
        models.Event.tenant_id == tenant_id,
        models.Event.start_time >= month_start
    ).count()
    
    # Répartition par type
    events_by_type = db.query(
        models.Event.event_type,
        func.count(models.Event.id)
    ).filter_by(tenant_id=tenant_id).group_by(models.Event.event_type).all()
    
    events_by_type_dict = {str(event_type): count for event_type, count in events_by_type}
    
    return {
        "total_events": total_events,
        "upcoming_events": upcoming_events,
        "events_this_week": events_this_week,
        "events_this_month": events_this_month,
        "events_by_type": events_by_type_dict
    }