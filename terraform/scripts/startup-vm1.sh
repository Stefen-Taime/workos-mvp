#!/bin/bash
# terraform/scripts/startup-vm1.sh

# Log tout pour debug
exec > >(tee -a /var/log/startup-script.log)
exec 2>&1

echo "Starting VM1 Load Balancer setup..."

# Update system
apt-get update
apt-get install -y nginx git curl

# Install Node.js pour le frontend
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install Docker
curl -fsSL https://get.docker.com | sh

# Clone the repository
cd /home/ubuntu
git clone ${github_repo} workos-mvp
chown -R ubuntu:ubuntu workos-mvp

# Configure Nginx with template variables
cat > /etc/nginx/sites-available/workos << 'EOF'
upstream app_servers_a {
    server ${vm2_ip}:8000;
}

upstream app_servers_b {
    server ${vm3_ip}:8000;
}

server {
    listen 80;
    server_name _;

    # API routes for tenant group A
    location ~ ^/api/(demo|startup1|startup2)/ {
        proxy_pass http://app_servers_a;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # API routes for tenant group B
    location ~ ^/api/(apple|google|netflix)/ {
        proxy_pass http://app_servers_b;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Frontend (ajouté plus tard)
    location / {
        return 200 'WorkOS Load Balancer Running\n';
        add_header Content-Type text/plain;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/workos /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Restart nginx
systemctl restart nginx

echo "VM1 setup completed!"