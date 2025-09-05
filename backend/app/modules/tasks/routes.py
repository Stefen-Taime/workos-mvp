from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from . import models, schemas

router = APIRouter()

@router.get("/api/{tenant_id}/tasks", response_model=List[schemas.TaskResponse])
async def list_tasks(tenant_id: str, db: Session = Depends(get_db)):
    tasks = db.query(models.Task).filter_by(tenant_id=tenant_id).all()
    return tasks

@router.post("/api/{tenant_id}/tasks", response_model=schemas.TaskResponse)
async def create_task(
    tenant_id: str,
    task: schemas.TaskCreate,
    db: Session = Depends(get_db)
):
    db_task = models.Task(**task.dict(), tenant_id=tenant_id)
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task