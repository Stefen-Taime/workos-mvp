# backend/app/core/metrics.py
from prometheus_client import Counter, Histogram, Gauge, generate_latest
from fastapi import Response, Request
import time

# Métriques personnalisées WorkOS
request_count = Counter(
    'workos_requests_total', 
    'Total requests to WorkOS',
    ['method', 'endpoint', 'tenant', 'status_code']
)

request_duration = Histogram(
    'workos_request_duration_seconds',
    'Request duration in seconds',
    ['method', 'endpoint']
)

active_users = Gauge(
    'workos_active_users',
    'Active users per tenant',
    ['tenant']
)

db_connections = Gauge(
    'workos_db_connections_active',
    'Active database connections'
)

# Middleware pour tracker les métriques
async def metrics_middleware(request: Request, call_next):
    start_time = time.time()
    
    # Extraire le tenant depuis l'URL
    path_parts = request.url.path.split("/")
    tenant = path_parts[2] if len(path_parts) > 2 and path_parts[1] == "tenant" else "unknown"
    
    # Exécuter la requête
    response = await call_next(request)
    
    # Enregistrer les métriques
    duration = time.time() - start_time
    
    request_count.labels(
        method=request.method,
        endpoint=request.url.path,
        tenant=tenant,
        status_code=response.status_code
    ).inc()
    
    request_duration.labels(
        method=request.method,
        endpoint=request.url.path
    ).observe(duration)
    
    return response

# Endpoint pour Prometheus
async def metrics_endpoint():
    return Response(generate_latest(), media_type="text/plain")

# Fonction helper pour mettre à jour les métriques utilisateurs actifs
def update_active_users(tenant: str, count: int):
    active_users.labels(tenant=tenant).set(count)

# Fonction helper pour mettre à jour les connexions DB
def update_db_connections(count: int):
    db_connections.set(count)