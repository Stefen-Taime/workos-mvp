from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from . import models, schemas

# Import des métriques pour le monitoring
from prometheus_client import Counter, Histogram
import time

router = APIRouter()

# Métriques spécifiques aux contacts
contacts_operations = Counter(
    'workos_contacts_operations_total', 
    'Total contact operations',
    ['operation', 'tenant_id', 'status']
)

contacts_db_query_duration = Histogram(
    'workos_contacts_db_query_seconds',
    'Database query duration for contacts',
    ['operation', 'tenant_id']
)

@router.get("/api/{tenant_id}/contacts", response_model=List[schemas.ContactResponse])
async def list_contacts(tenant_id: str, db: Session = Depends(get_db)):
    start_time = time.time()
    
    try:
        contacts = db.query(models.Contact).filter_by(tenant_id=tenant_id).all()
        
        # Métriques de succès
        query_duration = time.time() - start_time
        contacts_db_query_duration.labels(operation="list", tenant_id=tenant_id).observe(query_duration)
        contacts_operations.labels(operation="list", tenant_id=tenant_id, status="success").inc()
        
        return contacts
    
    except Exception as e:
        # Métrique d'erreur
        contacts_operations.labels(operation="list", tenant_id=tenant_id, status="error").inc()
        raise

@router.post("/api/{tenant_id}/contacts", response_model=schemas.ContactResponse)
async def create_contact(
    tenant_id: str,
    contact: schemas.ContactCreate,
    db: Session = Depends(get_db)
):
    start_time = time.time()
    
    try:
        db_contact = models.Contact(**contact.dict(), tenant_id=tenant_id)
        db.add(db_contact)
        db.commit()
        db.refresh(db_contact)
        
        # Métriques de succès
        query_duration = time.time() - start_time
        contacts_db_query_duration.labels(operation="create", tenant_id=tenant_id).observe(query_duration)
        contacts_operations.labels(operation="create", tenant_id=tenant_id, status="success").inc()
        
        return db_contact
    
    except Exception as e:
        # Rollback en cas d'erreur et métrique
        db.rollback()
        contacts_operations.labels(operation="create", tenant_id=tenant_id, status="error").inc()
        raise

@router.get("/api/{tenant_id}/contacts/{contact_id}", response_model=schemas.ContactResponse)
async def get_contact(tenant_id: str, contact_id: int, db: Session = Depends(get_db)):
    start_time = time.time()
    
    try:
        contact = db.query(models.Contact).filter_by(
            id=contact_id, 
            tenant_id=tenant_id
        ).first()
        
        query_duration = time.time() - start_time
        contacts_db_query_duration.labels(operation="get", tenant_id=tenant_id).observe(query_duration)
        
        if not contact:
            contacts_operations.labels(operation="get", tenant_id=tenant_id, status="not_found").inc()
            raise HTTPException(status_code=404, detail="Contact not found")
        
        contacts_operations.labels(operation="get", tenant_id=tenant_id, status="success").inc()
        return contact
    
    except HTTPException:
        # Re-raise HTTPException sans la wrapper
        raise
    except Exception as e:
        # Métrique pour erreurs inattendues
        contacts_operations.labels(operation="get", tenant_id=tenant_id, status="error").inc()
        raise