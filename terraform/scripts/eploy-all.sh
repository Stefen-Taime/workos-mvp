#!/bin/bash
# scripts/deploy-all.sh

# Variables
VM1_IP=$(terraform output -raw vm1_ip)
VM2_IP=$(terraform output -raw vm2_ip)
VM3_IP=$(terraform output -raw vm3_ip)

echo "🚀 Déploiement WorkOS MVP"
echo "VM1 (LoadBalancer): $VM1_IP"
echo "VM2 (App-A): $VM2_IP"
echo "VM3 (App-B): $VM3_IP"

# Déployer sur VM2
echo "📦 Déploiement VM2..."
scp -r backend ubuntu@$VM2_IP:~/
ssh ubuntu@$VM2_IP 'cd backend && docker build -t workos . && docker run -d -p 8000:8000 workos'

# Déployer sur VM3
echo "📦 Déploiement VM3..."
scp -r backend ubuntu@$VM3_IP:~/
ssh ubuntu@$VM3_IP 'cd backend && docker build -t workos . && docker run -d -p 8000:8000 workos'

# Configurer VM1
echo "🔧 Configuration Nginx..."
ssh ubuntu@$VM1_IP "sudo sed -i 's/VM2_IP/$VM2_IP/g' /etc/nginx/sites-available/workos"
ssh ubuntu@$VM1_IP "sudo sed -i 's/VM3_IP/$VM3_IP/g' /etc/nginx/sites-available/workos"
ssh ubuntu@$VM1_IP "sudo nginx -s reload"

echo "✅ Déploiement terminé!"
echo "🌐 Accès: http://$VM1_IP"