#!/bin/bash

# Setup Node Exporter sur chaque VM pour monitoring
# Usage: ./setup-vm-monitoring.sh [vm-role]
# Exemple: ./setup-vm-monitoring.sh app-server

set -e

VM_ROLE=${1:-"unknown"}

echo "Setting up monitoring for VM role: $VM_ROLE"

# Update system
sudo apt update

# Create monitoring user
sudo useradd --no-create-home --shell /bin/false node_exporter || true

# Download Node Exporter
cd /tmp
wget https://github.com/prometheus/node_exporter/releases/download/v1.6.1/node_exporter-1.6.1.linux-amd64.tar.gz
tar xvf node_exporter-1.6.1.linux-amd64.tar.gz

# Install Node Exporter
sudo cp node_exporter-1.6.1.linux-amd64/node_exporter /usr/local/bin/
sudo chown node_exporter:node_exporter /usr/local/bin/node_exporter

# Create systemd service
sudo tee /etc/systemd/system/node_exporter.service << EOF
[Unit]
Description=Node Exporter
Wants=network-online.target
After=network-online.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter \\
    --collector.systemd \\
    --collector.processes \\
    --collector.filesystem.ignored-mount-points='^/(dev|proc|sys|var/lib/docker/.+|run/docker/netns/.+)($|/)'

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable node_exporter
sudo systemctl start node_exporter

# Configure firewall (si ufw est utilisé)
if command -v ufw &> /dev/null; then
    sudo ufw allow 9100/tcp
fi

# Verify installation
sleep 3
if curl -s http://localhost:9100/metrics > /dev/null; then
    echo "✅ Node Exporter installed successfully on $VM_ROLE"
    echo "📊 Metrics available at: http://$(hostname -I | awk '{print $1}'):9100/metrics"
else
    echo "❌ Node Exporter installation failed"
    exit 1
fi

# Install additional monitoring tools based on VM role
case $VM_ROLE in
    "app-server")
        echo "🔧 Installing additional tools for app server..."
        # Install Python monitoring if needed
        sudo apt install -y python3-psutil
        ;;
    "database")
        echo "🔧 Installing database monitoring tools..."
        # Add database specific exporters later
        ;;
    "loadbalancer")
        echo "🔧 Installing load balancer monitoring..."
        # Add nginx/haproxy exporters later
        ;;
esac

# Clean up
rm -rf /tmp/node_exporter-*

echo ""
echo "🎯 VM Monitoring Setup Complete!"
echo "   Role: $VM_ROLE"
echo "   Node Exporter: http://$(hostname -I | awk '{print $1}'):9100"
echo ""
echo "📝 Next steps:"
echo "   1. Add this VM's IP to monitoring/prometheus.yml"
echo "   2. Restart Prometheus to pick up the new target"
echo "   3. Check Grafana dashboards for new metrics"