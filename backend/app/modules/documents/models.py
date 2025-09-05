from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, BigInteger
from sqlalchemy.orm import relationship
from app.core.models import BaseModel

class Folder(BaseModel):
    __tablename__ = "folders"  # Correction: double underscore
    
    name = Column(String(255), nullable=False)
    parent_id = Column(Integer, ForeignKey("folders.id"))
    description = Column(String(500))
    is_shared = Column(Boolean, default=False)
    created_by = Column(Integer, ForeignKey("contacts.id"), nullable=False)
    
    # Relations
    parent = relationship("Folder", remote_side="Folder.id")
    creator = relationship("Contact", foreign_keys=[created_by])

class Document(BaseModel):
    __tablename__ = "documents"  # Correction: double underscore
    
    name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)  # Chemin GCS
    file_size = Column(BigInteger)  # Taille en bytes
    mime_type = Column(String(100))
    folder_id = Column(Integer, ForeignKey("folders.id"))
    uploaded_by = Column(Integer, ForeignKey("contacts.id"), nullable=False)
    version = Column(Integer, default=1)
    is_public = Column(Boolean, default=False)
    download_count = Column(Integer, default=0)
    
    # Relations
    folder = relationship("Folder")
    uploader = relationship("Contact", foreign_keys=[uploaded_by])

class DocumentShare(BaseModel):
    __tablename__ = "document_shares"  # Correction: double underscore
    
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    shared_with = Column(Integer, ForeignKey("contacts.id"), nullable=False)
    permission = Column(String(20), default="read")  # read, write, admin
    shared_by = Column(Integer, ForeignKey("contacts.id"), nullable=False)
    
    # Relations
    document = relationship("Document")
    contact = relationship("Contact", foreign_keys=[shared_with])
    sharer = relationship("Contact", foreign_keys=[shared_by])

class DocumentVersion(BaseModel):
    __tablename__ = "document_versions"  # Correction: double underscore
    
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    version_number = Column(Integer, nullable=False)
    file_path = Column(String(500), nullable=False)
    uploaded_by = Column(Integer, ForeignKey("contacts.id"), nullable=False)
    change_notes = Column(String(500))
    
    # Relations
    document = relationship("Document")
    uploader = relationship("Contact", foreign_keys=[uploaded_by])