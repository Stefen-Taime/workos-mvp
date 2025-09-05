from pydantic import BaseModel, validator
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

class ContactInfo(BaseModel):
    id: int
    name: str
    email: str
    
    class Config:
        from_attributes = True

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    status: str = "planning"
    priority: str = "medium"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    deadline: Optional[datetime] = None
    budget: Optional[Decimal] = None
    estimated_hours: Optional[int] = None
    client_id: Optional[int] = None
    is_public: bool = False
    color: str = "#3B82F6"

class ProjectCreate(ProjectBase):
    created_by: int
    member_ids: Optional[List[int]] = []

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    deadline: Optional[datetime] = None
    budget: Optional[Decimal] = None
    estimated_hours: Optional[int] = None
    client_id: Optional[int] = None
    is_public: Optional[bool] = None
    color: Optional[str] = None
    is_archived: Optional[bool] = None  # Ajouté pour correspondre à update_project

class ProjectMemberResponse(BaseModel):
    id: int
    project_id: int
    contact_id: int
    role: str
    joined_at: Optional[datetime]
    hourly_rate: Optional[Decimal]
    contact: ContactInfo
    
    class Config:
        from_attributes = True

class ProjectResponse(ProjectBase):
    id: int
    tenant_id: str
    created_by: int
    is_archived: bool
    created_at: datetime
    updated_at: datetime
    creator: ContactInfo
    client: Optional[ContactInfo] = None
    members: List[ProjectMemberResponse] = []
    
    class Config:
        from_attributes = True

class ProjectMemberCreate(BaseModel):
    contact_id: int
    role: str = "member"
    hourly_rate: Optional[Decimal] = None

class ProjectMemberUpdate(BaseModel):
    role: Optional[str] = None
    hourly_rate: Optional[Decimal] = None

class TaskSimple(BaseModel):
    id: int
    title: str
    status: str
    assignee_id: Optional[int]
    due_date: Optional[datetime]
    
    class Config:
        from_attributes = True

class DocumentSimple(BaseModel):
    id: int
    name: str
    file_size: int
    mime_type: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class EventSimple(BaseModel):
    id: int
    title: str
    start_time: datetime
    end_time: datetime
    event_type: str
    
    class Config:
        from_attributes = True

class ProjectDetails(ProjectResponse):
    tasks: List[TaskSimple] = []
    documents: List[DocumentSimple] = []
    events: List[EventSimple] = []
    task_count: int = 0
    completed_task_count: int = 0
    document_count: int = 0
    event_count: int = 0

class ProjectStats(BaseModel):
    total_projects: int
    active_projects: int
    completed_projects: int
    overdue_projects: int
    projects_by_status: dict
    projects_by_priority: dict

class ProjectActivity(BaseModel):
    id: int
    project_id: int
    contact_id: int
    activity_type: str
    description: str
    activity_metadata: Optional[str] = None  # Renommé ici aussi
    created_at: datetime
    contact: ContactInfo
    
    class Config:
        from_attributes = True