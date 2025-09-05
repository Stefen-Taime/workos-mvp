# app/modules/calendar/schemas.py
from pydantic import BaseModel, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum

class EventTypeEnum(str, Enum):
    MEETING = "meeting"
    TASK_DEADLINE = "task_deadline"
    REMINDER = "reminder"
    APPOINTMENT = "appointment"
    HOLIDAY = "holiday"

class RecurrenceTypeEnum(str, Enum):
    NONE = "none"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"

class ParticipantStatusEnum(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    TENTATIVE = "tentative"

class ContactInfo(BaseModel):
    id: int
    name: str
    email: str

class EventBase(BaseModel):
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    location: Optional[str] = None
    event_type: EventTypeEnum = EventTypeEnum.MEETING
    is_all_day: bool = False
    recurrence_type: RecurrenceTypeEnum = RecurrenceTypeEnum.NONE
    recurrence_end: Optional[datetime] = None
    related_task_id: Optional[int] = None
    
    @validator('end_time')
    def end_after_start(cls, v, values):
        if 'start_time' in values and v <= values['start_time']:
            raise ValueError('end_time must be after start_time')
        return v

class EventCreate(EventBase):
    created_by: int
    participant_ids: Optional[List[int]] = []

class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    location: Optional[str] = None
    event_type: Optional[EventTypeEnum] = None
    is_all_day: Optional[bool] = None

class ParticipantResponse(BaseModel):
    id: int
    event_id: int
    contact_id: int
    status: ParticipantStatusEnum
    role: str
    tenant_id: str
    contact: ContactInfo
    
    class Config:
        from_attributes = True

class EventResponse(EventBase):
    id: int
    tenant_id: str
    created_by: int
    parent_event_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    creator: ContactInfo
    participants: List[ParticipantResponse] = []
    
    class Config:
        from_attributes = True

class ParticipantCreate(BaseModel):
    contact_id: int
    role: str = "attendee"

class ParticipantUpdate(BaseModel):
    status: ParticipantStatusEnum

class CalendarView(BaseModel):
    start_date: datetime
    end_date: datetime
    events: List[EventResponse]
    total_events: int

class EventStats(BaseModel):
    total_events: int
    upcoming_events: int
    events_this_week: int
    events_this_month: int
    events_by_type: dict