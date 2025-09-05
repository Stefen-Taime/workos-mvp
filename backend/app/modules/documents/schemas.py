from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ContactInfo(BaseModel):
    id: int
    name: str
    email: str

class FolderBase(BaseModel):
    name: str
    parent_id: Optional[int] = None
    description: Optional[str] = None
    is_shared: Optional[bool] = False

class FolderCreate(FolderBase):
    created_by: int

class FolderResponse(FolderBase):
    id: int
    tenant_id: str
    created_by: int
    created_at: datetime
    creator: Optional[ContactInfo] = None
    
    class Config:
        from_attributes = True

class DocumentBase(BaseModel):
    name: str
    folder_id: Optional[int] = None
    is_public: Optional[bool] = False

class DocumentCreate(DocumentBase):
    file_path: str
    file_size: int
    mime_type: str
    uploaded_by: int

class DocumentUpdate(BaseModel):
    name: Optional[str] = None
    folder_id: Optional[int] = None
    is_public: Optional[bool] = None

class DocumentResponse(DocumentBase):
    id: int
    tenant_id: str
    file_path: str
    file_size: int
    mime_type: str
    uploaded_by: int
    version: int
    download_count: int
    created_at: datetime
    updated_at: datetime
    uploader: Optional[ContactInfo] = None
    folder: Optional[FolderResponse] = None
    
    class Config:
        from_attributes = True

class DocumentShareCreate(BaseModel):
    document_id: int
    shared_with: int
    permission: str = "read"
    shared_by: int

class DocumentShareResponse(BaseModel):
    id: int
    document_id: int
    shared_with: int
    permission: str
    shared_by: int
    tenant_id: str
    created_at: datetime
    contact: Optional[ContactInfo] = None
    sharer: Optional[ContactInfo] = None
    
    class Config:
        from_attributes = True

class FolderContents(BaseModel):
    folders: List[FolderResponse]
    documents: List[DocumentResponse]
    total_items: int

class UploadUrlResponse(BaseModel):
    upload_url: str
    storage_path: str
    filename: str

class DownloadResponse(BaseModel):
    download_url: str
    filename: str