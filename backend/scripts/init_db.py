# backend/scripts/init_db.py
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import engine, Base

# Importer TOUS les modèles
from app.modules.contacts.models import Contact
from app.modules.tasks.models import Task
from app.modules.messages.models import Message
from app.modules.documents.models import Folder, Document, DocumentShare, DocumentVersion
from app.modules.calendar.models import Event, EventParticipant, EventReminder
from app.modules.projects.models import (
    Project, ProjectMember, ProjectTask, 
    ProjectDocument, ProjectEvent, ProjectActivity
)

def init_database():
    print("Creating database tables...")
    
    # Afficher les modèles détectés
    print(f"Modèles détectés: {[table.name for table in Base.metadata.tables.values()]}")
    
    Base.metadata.create_all(bind=engine)
    print("✅ Tables created successfully!")

if __name__ == "__main__":
    init_database()