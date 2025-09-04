#!/bin/bash
# terraform/scripts/check-deployment.sh

echo "🔍 Vérification du déploiement WorkOS..."

# Get IPs from Terraform
LB_IP=$(terraform output -raw loadbalancer_ip)
APP_A_IP=$(terraform output -raw app_a_ip)
APP_B_IP=$(terraform output -raw app_b_ip)

echo "📍 IPs des VMs:"
echo "   Load Balancer: $LB_IP"
echo "   App Server A: $APP_A_IP"
echo "   App Server B: $APP_B_IP"

# Check each server
echo -e "\n✅ Test App Server A..."
curl -s http://$APP_A_IP:8000/health | jq .

echo -e "\n✅ Test App Server B..."
curl -s http://$APP_B_IP:8000/health | jq .

echo -e "\n✅ Test Load Balancer..."
curl -s http://$LB_IP/api/demo/contacts
echo ""
curl -s http://$LB_IP/api/apple/contacts

echo -e "\n🎉 Si vous voyez des réponses JSON, tout fonctionne!"