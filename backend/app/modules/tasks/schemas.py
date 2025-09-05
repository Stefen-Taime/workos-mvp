from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    assignee_id: Optional[int] = None
    status: Optional[str] = "todo"
    priority: Optional[str] = "medium"
    due_date: Optional[datetime] = None

class TaskCreate(TaskBase):
    pass

class TaskResponse(TaskBase):
    id: int
    tenant_id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True