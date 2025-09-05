from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class MessageBase(BaseModel):
    content: str
    recipient_id: Optional[int] = None
    channel: Optional[str] = "general"
    thread_id: Optional[int] = None
    message_type: Optional[str] = "text"

class MessageCreate(MessageBase):
    sender_id: int

class MessageUpdate(BaseModel):
    is_read: Optional[bool] = None

class ContactInfo(BaseModel):
    id: int
    name: str
    email: str

class MessageResponse(MessageBase):
    id: int
    tenant_id: str
    sender_id: int
    is_read: bool
    created_at: datetime
    updated_at: datetime
    sender: Optional[ContactInfo] = None
    recipient: Optional[ContactInfo] = None
    
    class Config:
        from_attributes = True

class ChannelResponse(BaseModel):
    channel: str
    message_count: int
    last_message: Optional[MessageResponse] = None
    unread_count: int