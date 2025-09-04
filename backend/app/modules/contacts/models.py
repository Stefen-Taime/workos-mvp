from sqlalchemy import Column, String
from app.core.models import BaseModel

class Contact(BaseModel):
    __tablename__ = "contacts"
    
    name = Column(String(100), nullable=False)
    email = Column(String(100))
    phone = Column(String(20))
    company = Column(String(100))
    type = Column(String(50), default='contact')