from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from . import models, schemas

router = APIRouter()

@router.get("/api/{tenant_id}/contacts", response_model=List[schemas.ContactResponse])
async def list_contacts(tenant_id: str, db: Session = Depends(get_db)):
    contacts = db.query(models.Contact).filter_by(tenant_id=tenant_id).all()
    return contacts

@router.post("/api/{tenant_id}/contacts", response_model=schemas.ContactResponse)
async def create_contact(
    tenant_id: str,
    contact: schemas.ContactCreate,
    db: Session = Depends(get_db)
):
    db_contact = models.Contact(**contact.dict(), tenant_id=tenant_id)
    db.add(db_contact)
    db.commit()
    db.refresh(db_contact)
    return db_contact

@router.get("/api/{tenant_id}/contacts/{contact_id}", response_model=schemas.ContactResponse)
async def get_contact(tenant_id: str, contact_id: int, db: Session = Depends(get_db)):
    contact = db.query(models.Contact).filter_by(
        id=contact_id, 
        tenant_id=tenant_id
    ).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact