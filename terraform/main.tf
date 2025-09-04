# terraform/main.tf
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

# Provider configuration
provider "google" {
  credentials = file("${path.module}/.secrets/gcp-credentials.json")
  project     = var.project_id
  region      = var.region
}

# Variables
variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  default     = "us-central1"
}

variable "zone" {
  description = "GCP Zone"
  default     = "us-central1-a"
}

variable "database_url" {
  description = "PostgreSQL connection string from Aiven"
  type        = string
  sensitive   = true
}

variable "github_repo" {
  description = "GitHub repository URL"
  type        = string
}

# Network
resource "google_compute_network" "workos_network" {
  name                    = "workos-network"
  auto_create_subnetworks = true
}

# Firewall rules
resource "google_compute_firewall" "workos_firewall" {
  name    = "workos-allow-web"
  network = google_compute_network.workos_network.name

  allow {
    protocol = "tcp"
    ports = ["22", "80", "443", "8000", "3000", "9090", "9100"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["workos-server"]
}

# VM1 - Load Balancer
resource "google_compute_instance" "vm1_loadbalancer" {
  name         = "workos-loadbalancer"
  machine_type = "e2-micro"
  zone         = var.zone
  tags         = ["workos-server"]

  boot_disk {
    initialize_params {
      image = "ubuntu-os-cloud/ubuntu-2204-lts"
      size  = 10
      type  = "pd-standard"
    }
  }

  network_interface {
    network = google_compute_network.workos_network.name
    
    access_config {
      // Ephemeral public IP
    }
  }

  metadata_startup_script = templatefile("${path.module}/scripts/startup-vm1.sh", {
    github_repo = var.github_repo
    vm2_ip      = google_compute_instance.vm2_app_a.network_interface[0].network_ip
    vm3_ip      = google_compute_instance.vm3_app_b.network_interface[0].network_ip
  })

  metadata = {
    enable-oslogin = "FALSE"
  }
}

# VM2 - App Server A
resource "google_compute_instance" "vm2_app_a" {
  name         = "workos-app-a"
  machine_type = "e2-micro"
  zone         = var.zone
  tags         = ["workos-server"]

  boot_disk {
    initialize_params {
      image = "ubuntu-os-cloud/ubuntu-2204-lts"
      size  = 10
      type  = "pd-standard"
    }
  }

  network_interface {
    network = google_compute_network.workos_network.name
    
    access_config {
      // Ephemeral public IP
    }
  }

  metadata_startup_script = templatefile("${path.module}/scripts/startup-vm2.sh", {
    github_repo     = var.github_repo
    database_url    = var.database_url
    allowed_tenants = "demo,startup1,startup2"
    server_name     = "app-server-a"
  })

  metadata = {
    enable-oslogin = "FALSE"
  }
}

# VM3 - App Server B
resource "google_compute_instance" "vm3_app_b" {
  name         = "workos-app-b"
  machine_type = "e2-micro"
  zone         = var.zone
  tags         = ["workos-server"]

  boot_disk {
    initialize_params {
      image = "ubuntu-os-cloud/ubuntu-2204-lts"
      size  = 10
      type  = "pd-standard"
    }
  }

  network_interface {
    network = google_compute_network.workos_network.name
    
    access_config {
      // Ephemeral public IP
    }
  }

  metadata_startup_script = templatefile("${path.module}/scripts/startup-vm3.sh", {
    github_repo     = var.github_repo
    database_url    = var.database_url
    allowed_tenants = "apple,google,netflix"
    server_name     = "app-server-b"
  })

  metadata = {
    enable-oslogin = "FALSE"
  }
}

# Outputs
output "loadbalancer_ip" {
  value = google_compute_instance.vm1_loadbalancer.network_interface[0].access_config[0].nat_ip
  description = "Public IP of the load balancer"
}

output "app_a_ip" {
  value = google_compute_instance.vm2_app_a.network_interface[0].access_config[0].nat_ip
  description = "Public IP of App Server A"
}

output "app_b_ip" {
  value = google_compute_instance.vm3_app_b.network_interface[0].access_config[0].nat_ip
  description = "Public IP of App Server B"
}

output "access_url" {
  value = "http://${google_compute_instance.vm1_loadbalancer.network_interface[0].access_config[0].nat_ip}"
  description = "URL to access the application"
}