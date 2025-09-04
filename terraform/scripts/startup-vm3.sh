#!/bin/bash
# terraform/scripts/startup-vm2.sh (et même chose pour vm3.sh)

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

# Install Node Exporter for monitoring
cd /tmp
wget https://github.com/prometheus/node_exporter/releases/download/v1.6.1/node_exporter-1.6.1.linux-amd64.tar.gz
tar xvf node_exporter-1.6.1.linux-amd64.tar.gz

# Create monitoring user
useradd --no-create-home --shell /bin/false node_exporter || true

# Install Node Exporter
cp node_exporter-1.6.1.linux-amd64/node_exporter /usr/local/bin/
chown node_exporter:node_exporter /usr/local/bin/node_exporter

# Create systemd service
cat > /etc/systemd/system/node_exporter.service << 'EOF'
[Unit]
Description=Node Exporter
Wants=network-online.target
After=network-online.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
systemctl daemon-reload
systemctl enable node_exporter
systemctl start node_exporter

# Clean up
rm -rf /tmp/node_exporter-*

echo "VM3 setup completed with monitoring!"