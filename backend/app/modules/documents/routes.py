from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

from app.core.database import get_db
from app.core.storage import storage_backend
from app.modules.contacts.models import Contact
from . import models, schemas

router = APIRouter()

# === FOLDERS ===

@router.get("/api/{tenant_id}/folders", response_model=List[schemas.FolderResponse])
async def list_folders(
    tenant_id: str, 
    parent_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Folder).filter_by(tenant_id=tenant_id).options(
        joinedload(models.Folder.creator)
    )
    
    if parent_id is not None:
        query = query.filter_by(parent_id=parent_id)
    else:
        query = query.filter(models.Folder.parent_id.is_(None))
    
    folders = query.order_by(models.Folder.name).all()
    return folders

@router.post("/api/{tenant_id}/folders", response_model=schemas.FolderResponse)
async def create_folder(
    tenant_id: str,
    folder: schemas.FolderCreate,
    db: Session = Depends(get_db)
):
    # Vérifier que creator existe
    creator = db.query(Contact).filter_by(
        id=folder.created_by,
        tenant_id=tenant_id
    ).first()
    
    if not creator:
        raise HTTPException(status_code=404, detail="Creator not found")
    
    # Vérifier parent folder si spécifié
    if folder.parent_id:
        parent = db.query(models.Folder).filter_by(
            id=folder.parent_id,
            tenant_id=tenant_id
        ).first()
        
        if not parent:
            raise HTTPException(status_code=404, detail="Parent folder not found")
    
    db_folder = models.Folder(
        **folder.dict(),
        tenant_id=tenant_id
    )
    
    db.add(db_folder)
    db.commit()
    db.refresh(db_folder)
    
    # Recharger avec relations
    db_folder = db.query(models.Folder).options(
        joinedload(models.Folder.creator)
    ).filter_by(id=db_folder.id).first()
    
    return db_folder

@router.get("/api/{tenant_id}/folders/{folder_id}/contents", response_model=schemas.FolderContents)
async def get_folder_contents(
    tenant_id: str,
    folder_id: int,
    db: Session = Depends(get_db)
):
    # Vérifier que le dossier existe
    folder = db.query(models.Folder).filter_by(
        id=folder_id,
        tenant_id=tenant_id
    ).first()
    
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    # Récupérer sous-dossiers
    subfolders = db.query(models.Folder).options(
        joinedload(models.Folder.creator)
    ).filter_by(
        tenant_id=tenant_id,
        parent_id=folder_id
    ).order_by(models.Folder.name).all()
    
    # Récupérer documents
    documents = db.query(models.Document).options(
        joinedload(models.Document.uploader),
        joinedload(models.Document.folder)
    ).filter_by(
        tenant_id=tenant_id,
        folder_id=folder_id
    ).order_by(models.Document.name).all()
    
    return {
        "folders": subfolders,
        "documents": documents,
        "total_items": len(subfolders) + len(documents)
    }

# === DOCUMENTS ===

@router.get("/api/{tenant_id}/documents", response_model=List[schemas.DocumentResponse])
async def list_documents(
    tenant_id: str,
    folder_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Document).filter_by(tenant_id=tenant_id).options(
        joinedload(models.Document.uploader),
        joinedload(models.Document.folder)
    )
    
    if folder_id is not None:
        query = query.filter_by(folder_id=folder_id)
    
    documents = query.order_by(models.Document.created_at.desc()).all()
    return documents

@router.post("/api/{tenant_id}/documents/upload", response_model=schemas.DocumentResponse)
async def upload_document(
    tenant_id: str,
    file: UploadFile = File(...),
    folder_id: Optional[int] = Form(None),
    uploaded_by: int = Form(...),
    is_public: bool = Form(False),
    db: Session = Depends(get_db)
):
    # Vérifier uploader
    uploader = db.query(Contact).filter_by(
        id=uploaded_by,
        tenant_id=tenant_id
    ).first()
    
    if not uploader:
        raise HTTPException(status_code=404, detail="Uploader not found")
    
    # Vérifier folder si spécifié
    if folder_id:
        folder = db.query(models.Folder).filter_by(
            id=folder_id,
            tenant_id=tenant_id
        ).first()
        
        if not folder:
            raise HTTPException(status_code=404, detail="Folder not found")
    
    # Lire et sauvegarder le fichier
    try:
        file_content = await file.read()
        file_size = len(file_content)
        
        # Sauvegarder dans GCS
        storage_path, public_url = storage_backend.save_file(
            file_content, 
            tenant_id, 
            file.filename
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")
    
    # Créer document en DB
    db_document = models.Document(
        name=file.filename,
        file_path=storage_path,
        file_size=file_size,
        mime_type=file.content_type or "application/octet-stream",
        folder_id=folder_id,
        uploaded_by=uploaded_by,
        is_public=is_public,
        tenant_id=tenant_id
    )
    
    db.add(db_document)
    db.commit()
    db.refresh(db_document)
    
    # Recharger avec relations
    db_document = db.query(models.Document).options(
        joinedload(models.Document.uploader),
        joinedload(models.Document.folder)
    ).filter_by(id=db_document.id).first()
    
    return db_document

@router.get("/api/{tenant_id}/documents/{document_id}", response_model=schemas.DocumentResponse)
async def get_document(
    tenant_id: str,
    document_id: int,
    db: Session = Depends(get_db)
):
    document = db.query(models.Document).options(
        joinedload(models.Document.uploader),
        joinedload(models.Document.folder)
    ).filter_by(
        id=document_id,
        tenant_id=tenant_id
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return document

@router.get("/api/{tenant_id}/documents/{document_id}/download", response_model=schemas.DownloadResponse)
async def download_document(
    tenant_id: str,
    document_id: int,
    db: Session = Depends(get_db)
):
    document = db.query(models.Document).filter_by(
        id=document_id,
        tenant_id=tenant_id
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Générer URL de téléchargement signée
    try:
        download_url = storage_backend.get_download_url(document.file_path)
        
        # Incrémenter compteur de téléchargement
        document.download_count += 1
        db.commit()
        
        return {
            "download_url": download_url,
            "filename": document.name
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")

@router.delete("/api/{tenant_id}/documents/{document_id}")
async def delete_document(
    tenant_id: str,
    document_id: int,
    db: Session = Depends(get_db)
):
    document = db.query(models.Document).filter_by(
        id=document_id,
        tenant_id=tenant_id
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Supprimer de GCS
    storage_backend.delete_file(document.file_path)
    
    # Supprimer de la DB
    db.delete(document)
    db.commit()
    
    return {"message": "Document deleted successfully"}

# === UPLOAD DIRECT ===

@router.post("/api/{tenant_id}/documents/upload-url", response_model=schemas.UploadUrlResponse)
async def get_upload_url(
    tenant_id: str,
    filename: str,
    uploaded_by: int,
    folder_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Génère URL signée pour upload direct depuis le frontend"""
    
    # Vérifier uploader
    uploader = db.query(Contact).filter_by(
        id=uploaded_by,
        tenant_id=tenant_id
    ).first()
    
    if not uploader:
        raise HTTPException(status_code=404, detail="Uploader not found")
    
    # Générer URL d'upload
    storage_path, upload_url = storage_backend.get_upload_url(tenant_id, filename)
    
    return {
        "upload_url": upload_url,
        "storage_path": storage_path,
        "filename": filename
    }

@router.post("/api/{tenant_id}/documents/confirm-upload", response_model=schemas.DocumentResponse)
async def confirm_upload(
    tenant_id: str,
    storage_path: str = Form(...),
    filename: str = Form(...),
    file_size: int = Form(...),
    mime_type: str = Form(...),
    uploaded_by: int = Form(...),
    folder_id: Optional[int] = Form(None),
    is_public: bool = Form(False),
    db: Session = Depends(get_db)
):
    """Confirme l'upload après upload direct et crée l'entrée DB"""
    
    # Créer document en DB
    db_document = models.Document(
        name=filename,
        file_path=storage_path,
        file_size=file_size,
        mime_type=mime_type,
        folder_id=folder_id,
        uploaded_by=uploaded_by,
        is_public=is_public,
        tenant_id=tenant_id
    )
    
    db.add(db_document)
    db.commit()
    db.refresh(db_document)
    
    # Recharger avec relations
    db_document = db.query(models.Document).options(
        joinedload(models.Document.uploader),
        joinedload(models.Document.folder)
    ).filter_by(id=db_document.id).first()
    
    return db_document

# === PARTAGE ===

@router.post("/api/{tenant_id}/documents/{document_id}/share", response_model=schemas.DocumentShareResponse)
async def share_document(
    tenant_id: str,
    document_id: int,
    share_data: schemas.DocumentShareCreate,
    db: Session = Depends(get_db)
):
    # Vérifier document
    document = db.query(models.Document).filter_by(
        id=document_id,
        tenant_id=tenant_id
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Vérifier contacts
    shared_with_contact = db.query(Contact).filter_by(
        id=share_data.shared_with,
        tenant_id=tenant_id
    ).first()
    
    sharer_contact = db.query(Contact).filter_by(
        id=share_data.shared_by,
        tenant_id=tenant_id
    ).first()
    
    if not shared_with_contact or not sharer_contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    # Créer partage
    db_share = models.DocumentShare(
        document_id=document_id,
        shared_with=share_data.shared_with,
        permission=share_data.permission,
        shared_by=share_data.shared_by,
        tenant_id=tenant_id
    )
    
    db.add(db_share)
    db.commit()
    db.refresh(db_share)
    
    # Recharger avec relations
    db_share = db.query(models.DocumentShare).options(
        joinedload(models.DocumentShare.contact),
        joinedload(models.DocumentShare.sharer)
    ).filter_by(id=db_share.id).first()
    
    return db_share

@router.get("/api/{tenant_id}/documents/{document_id}/shares", response_model=List[schemas.DocumentShareResponse])
async def list_document_shares(
    tenant_id: str,
    document_id: int,
    db: Session = Depends(get_db)
):
    shares = db.query(models.DocumentShare).options(
        joinedload(models.DocumentShare.contact),
        joinedload(models.DocumentShare.sharer)
    ).filter_by(
        document_id=document_id,
        tenant_id=tenant_id
    ).all()
    
    return shares