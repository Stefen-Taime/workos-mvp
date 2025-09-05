from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text, Enum, Numeric
from sqlalchemy.orm import relationship
from app.core.models import BaseModel
import enum

class ProjectStatus(enum.Enum):
    PLANNING = "planning"
    ACTIVE = "active"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class ProjectPriority(enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class MemberRole(enum.Enum):
    OWNER = "owner"
    MANAGER = "manager"
    MEMBER = "member"
    VIEWER = "viewer"

class Project(BaseModel):
    __tablename__ = "projects"
    
    name = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(String(20), default="planning")  # String au lieu d'Enum pour éviter les pb PostgreSQL
    priority = Column(String(20), default="medium")
    
    # Dates
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    deadline = Column(DateTime)
    
    # Budget et métrics
    budget = Column(Numeric(10, 2))
    estimated_hours = Column(Integer)
    
    # Organisation
    created_by = Column(Integer, ForeignKey("contacts.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("contacts.id"))  # Client externe
    
    # Paramètres
    is_public = Column(Boolean, default=False)
    is_archived = Column(Boolean, default=False)
    color = Column(String(7), default="#3B82F6")  # Couleur hex
    
    # Relations
    creator = relationship("Contact", foreign_keys=[created_by])
    client = relationship("Contact", foreign_keys=[client_id])
    members = relationship("ProjectMember", back_populates="project")
    tasks = relationship("ProjectTask", back_populates="project")
    documents = relationship("ProjectDocument", back_populates="project")
    events = relationship("ProjectEvent", back_populates="project")
    activities = relationship("ProjectActivity", back_populates="project")

class ProjectMember(BaseModel):
    __tablename__ = "project_members"
    
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=False)
    role = Column(String(20), default="member")
    joined_at = Column(DateTime)
    hourly_rate = Column(Numeric(8, 2))  # Taux horaire pour ce projet
    
    # Relations
    project = relationship("Project", back_populates="members")
    contact = relationship("Contact")

class ProjectTask(BaseModel):
    __tablename__ = "project_tasks"
    
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    
    # Relations
    project = relationship("Project", back_populates="tasks")
    task = relationship("Task")

class ProjectDocument(BaseModel):
    __tablename__ = "project_documents"
    
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    
    # Relations
    project = relationship("Project", back_populates="documents")
    document = relationship("Document")

class ProjectEvent(BaseModel):
    __tablename__ = "project_events"
    
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    
    # Relations
    project = relationship("Project", back_populates="events")
    event = relationship("Event")

class ProjectActivity(BaseModel):
    __tablename__ = "project_activities"
    
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=False)
    activity_type = Column(String(50), nullable=False)  # created, updated, completed_task, etc.
    description = Column(Text)
    activity_metadata = Column(Text)  # Renommé de 'metadata' à 'activity_metadata'
    
    # Relations
    project = relationship("Project", back_populates="activities")
    contact = relationship("Contact")