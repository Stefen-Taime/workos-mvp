# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from app.modules.contacts.routes import router as contacts_router

app = FastAPI(title="WorkOS MVP")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclure les routes
app.include_router(contacts_router)

@app.get("/")
async def root():
    return {"message": "WorkOS API", "version": "0.1.0"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "server": os.getenv("SERVER_NAME", "local")
    }