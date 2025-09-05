import os
import uuid
from abc import ABC, abstractmethod
from pathlib import Path
import mimetypes

class StorageBackend(ABC):
    @abstractmethod
    def save_file(self, file_content: bytes, tenant_id: str, filename: str) -> tuple[str, str]:
        """Retourne (storage_path, public_url)"""
        pass
    
    @abstractmethod
    def delete_file(self, storage_path: str) -> bool:
        pass
    
    @abstractmethod
    def get_download_url(self, storage_path: str, expires_in: int = 3600) -> str:
        pass

# Version simple pour les tests (sans GCS pour l'instant)
class LocalStorage(StorageBackend):
    def __init__(self):
        self.upload_dir = Path("uploads")
        self.upload_dir.mkdir(exist_ok=True)
    
    def save_file(self, file_content: bytes, tenant_id: str, filename: str) -> tuple[str, str]:
        # Créer dossier tenant
        tenant_dir = self.upload_dir / tenant_id
        tenant_dir.mkdir(exist_ok=True)
        
        # Nom unique
        file_extension = Path(filename).suffix
        unique_name = f"{uuid.uuid4()}{file_extension}"
        storage_path = f"{tenant_id}/{unique_name}"
        file_path = tenant_dir / unique_name
        
        # Sauvegarder
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        return storage_path, f"file://{file_path}"
    
    def delete_file(self, storage_path: str) -> bool:
        try:
            file_path = self.upload_dir / storage_path
            if file_path.exists():
                file_path.unlink()
            return True
        except Exception as e:
            print(f"Error deleting file: {e}")
            return False
    
    def get_download_url(self, storage_path: str, expires_in: int = 3600) -> str:
        # Pour les tests, retourner un chemin local
        return f"http://localhost:8000/static/{storage_path}"
    
    def get_upload_url(self, tenant_id: str, filename: str) -> tuple[str, str]:
        # Version simplifiée pour les tests
        file_extension = Path(filename).suffix
        unique_name = f"{uuid.uuid4()}{file_extension}"
        storage_path = f"{tenant_id}/{unique_name}"
        
        return storage_path, f"http://localhost:8000/upload/{storage_path}"

# Instance globale
storage_backend = LocalStorage()