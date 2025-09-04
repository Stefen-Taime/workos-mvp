#!/bin/bash
# terraform/scripts/startup-vm2.sh

# Log pour debug
exec > >(tee -a /var/log/startup-script.log)
exec 2>&1

echo "Starting VM2 App Server A setup..."

# Update and install Docker
apt-get update
apt-get install -y docker.io git

# Start Docker
systemctl start docker
systemctl enable docker

# Clone repository
cd /home/ubuntu
git clone ${github_repo} workos-mvp
cd workos-mvp/backend

# Create .env file
cat > .env << EOF
DATABASE_URL=${database_url}
ALLOWED_TENANTS=${allowed_tenants}
SERVER_NAME=${server_name}
SECRET_KEY=dev-secret-key-change-in-production
EOF

# Build and run Docker container
docker build -t workos-backend .
docker run -d \
  --name workos \
  -p 8000:8000 \
  --restart always \
  --env-file .env \
  workos-backend

echo "VM2 setup completed!"