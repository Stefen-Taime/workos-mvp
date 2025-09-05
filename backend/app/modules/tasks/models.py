from sqlalchemy import Column, String, Boolean, DateTime, Integer, ForeignKey
from app.core.models import BaseModel

class Task(BaseModel):
    __tablename__ = "tasks"
    
    title = Column(String(200), nullable=False)
    description = Column(String(1000))
    assignee_id = Column(Integer, ForeignKey("contacts.id"))
    status = Column(String(20), default="todo")  # todo, in_progress, done
    priority = Column(String(10), default="medium")  # low, medium, high
    due_date = Column(DateTime)