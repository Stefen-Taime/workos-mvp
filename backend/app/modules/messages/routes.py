from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

from app.core.database import get_db
from app.modules.contacts.models import Contact
from . import models, schemas

router = APIRouter()

@router.get("/api/{tenant_id}/messages", response_model=List[schemas.MessageResponse])
async def list_messages(
    tenant_id: str,
    channel: Optional[str] = Query("general"),
    thread_id: Optional[int] = Query(None),
    limit: int = Query(50, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(models.Message).filter_by(
        tenant_id=tenant_id,
        channel=channel
    ).options(
        joinedload(models.Message.sender),
        joinedload(models.Message.recipient)
    )
    
    if thread_id:
        query = query.filter_by(thread_id=thread_id)
    else:
        # Messages principaux seulement (pas les réponses)
        query = query.filter(models.Message.thread_id.is_(None))
    
    messages = query.order_by(models.Message.created_at.desc()).limit(limit).all()
    return messages

@router.post("/api/{tenant_id}/messages", response_model=schemas.MessageResponse)
async def create_message(
    tenant_id: str,
    message: schemas.MessageCreate,
    db: Session = Depends(get_db)
):
    # Vérifier que sender existe dans ce tenant
    sender = db.query(Contact).filter_by(
        id=message.sender_id,
        tenant_id=tenant_id
    ).first()
    
    if not sender:
        raise HTTPException(status_code=404, detail="Sender not found")
    
    # Vérifier recipient si spécifié
    if message.recipient_id:
        recipient = db.query(Contact).filter_by(
            id=message.recipient_id,
            tenant_id=tenant_id
        ).first()
        
        if not recipient:
            raise HTTPException(status_code=404, detail="Recipient not found")
    
    db_message = models.Message(
        **message.dict(),
        tenant_id=tenant_id
    )
    
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    
    # Recharger avec relations
    db_message = db.query(models.Message).options(
        joinedload(models.Message.sender),
        joinedload(models.Message.recipient)
    ).filter_by(id=db_message.id).first()
    
    return db_message

@router.get("/api/{tenant_id}/messages/channels", response_model=List[schemas.ChannelResponse])
async def list_channels(tenant_id: str, db: Session = Depends(get_db)):
    from sqlalchemy import func, desc
    
    # Statistiques basiques par channel
    channels_stats = db.query(
        models.Message.channel,
        func.count(models.Message.id).label('message_count')
    ).filter_by(
        tenant_id=tenant_id
    ).group_by(
        models.Message.channel
    ).all()
    
    result = []
    for channel, msg_count in channels_stats:
        # Compter manuellement les non-lus
        unread_count = db.query(models.Message).filter_by(
            tenant_id=tenant_id,
            channel=channel,
            is_read=False
        ).count()
        
        # Récupérer le dernier message du channel
        last_message = db.query(models.Message).options(
            joinedload(models.Message.sender)
        ).filter_by(
            tenant_id=tenant_id,
            channel=channel
        ).order_by(desc(models.Message.created_at)).first()
        
        result.append({
            "channel": channel,
            "message_count": msg_count,
            "unread_count": unread_count,
            "last_message": last_message
        })
    
    return result

@router.put("/api/{tenant_id}/messages/{message_id}/read", response_model=schemas.MessageResponse)
async def mark_as_read(
    tenant_id: str,
    message_id: int,
    db: Session = Depends(get_db)
):
    message = db.query(models.Message).filter_by(
        id=message_id,
        tenant_id=tenant_id
    ).first()
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    message.is_read = True
    db.commit()
    db.refresh(message)
    
    return message

@router.get("/api/{tenant_id}/messages/{message_id}/thread", response_model=List[schemas.MessageResponse])
async def get_thread(
    tenant_id: str,
    message_id: int,
    db: Session = Depends(get_db)
):
    # Récupérer le message principal
    main_message = db.query(models.Message).filter_by(
        id=message_id,
        tenant_id=tenant_id
    ).first()
    
    if not main_message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Récupérer toutes les réponses
    thread_messages = db.query(models.Message).options(
        joinedload(models.Message.sender),
        joinedload(models.Message.recipient)
    ).filter_by(
        tenant_id=tenant_id,
        thread_id=message_id
    ).order_by(models.Message.created_at.asc()).all()
    
    return [main_message] + thread_messages