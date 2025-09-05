from sqlalchemy import Column, String, Integer, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.core.models import BaseModel

class Message(BaseModel):
    __tablename__ = "messages"
    
    content = Column(Text, nullable=False)
    sender_id = Column(Integer, ForeignKey("contacts.id"), nullable=False)
    recipient_id = Column(Integer, ForeignKey("contacts.id"))  # Null = message broadcast/channel
    channel = Column(String(100), default="general")  # general, project-specific, etc.
    thread_id = Column(Integer, ForeignKey("messages.id"))  # Pour les réponses
    is_read = Column(Boolean, default=False)
    message_type = Column(String(20), default="text")  # text, file, system
    
    # Relations
    sender = relationship("Contact", foreign_keys=[sender_id])
    recipient = relationship("Contact", foreign_keys=[recipient_id])
    thread_parent = relationship("Message", remote_side="Message.id")