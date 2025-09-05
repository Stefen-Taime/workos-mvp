# app/modules/calendar/models.py
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from app.core.models import BaseModel
from .schemas import EventTypeEnum, RecurrenceTypeEnum

class Event(BaseModel):
    __tablename__ = "events"
    
    title = Column(String(255), nullable=False)
    description = Column(Text)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    location = Column(String(255))
    event_type = Column(Enum(EventTypeEnum), default=EventTypeEnum.MEETING)
    is_all_day = Column(Boolean, default=False)
    
    # Organisation
    created_by = Column(Integer, ForeignKey("contacts.id"), nullable=False)
    
    # Récurrence
    recurrence_type = Column(Enum(RecurrenceTypeEnum), default=RecurrenceTypeEnum.NONE)
    recurrence_end = Column(DateTime)
    parent_event_id = Column(Integer, ForeignKey("events.id"))
    
    # Intégrations
    related_task_id = Column(Integer, ForeignKey("tasks.id"))
    
    # Relations
    creator = relationship("Contact", foreign_keys=[created_by])
    related_task = relationship("Task", foreign_keys=[related_task_id])
    parent_event = relationship("Event", remote_side="Event.id")
    participants = relationship("EventParticipant", back_populates="event", cascade="all, delete-orphan")
    reminders = relationship("EventReminder", back_populates="event", cascade="all, delete-orphan")

class EventParticipant(BaseModel):
    __tablename__ = "event_participants"
    
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=False)
    status = Column(String(20), default="pending")  # pending, accepted, declined, tentative
    role = Column(String(20), default="attendee")   # organizer, attendee
    
    # Relations
    event = relationship("Event", back_populates="participants")
    contact = relationship("Contact")

class EventReminder(BaseModel):
    __tablename__ = "event_reminders"
    
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=False)
    reminder_time = Column(DateTime, nullable=False)
    reminder_type = Column(String(20), default="email")  # email, sms, push
    is_sent = Column(Boolean, default=False)
    
    # Relations
    event = relationship("Event", back_populates="reminders")
    contact = relationship("Contact")