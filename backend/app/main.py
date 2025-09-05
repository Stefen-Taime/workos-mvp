from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from app.core.metrics import metrics_middleware, metrics_endpoint
from app.modules.contacts.routes import router as contacts_router
from app.modules.tasks.routes import router as tasks_router
from app.modules.messages.routes import router as messages_router
from app.modules.documents.routes import router as documents_router
from app.modules.calendar.routes import router as calendar_router
from app.modules.projects.routes import router as projects_router  # <-- Cette ligne

app = FastAPI(title="WorkOS MVP")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware de métriques
app.middleware("http")(metrics_middleware)

# Inclure les routes
app.include_router(contacts_router)
app.include_router(tasks_router)
app.include_router(messages_router)
app.include_router(documents_router)
app.include_router(calendar_router)
app.include_router(projects_router)  # <-- Et cette ligne

# Route pour Prometheus metrics
app.add_route("/metrics", metrics_endpoint, methods=["GET"])

@app.get("/")
async def root():
    return {"message": "WorkOS API", "version": "0.1.0"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "server": os.getenv("SERVER_NAME", "local")
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)