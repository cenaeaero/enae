#!/usr/bin/env bash
# CONDOR — preparación de Rocky Linux 9 para Fase 0 (Podman + tiempo + firewall).
# Uso:  sudo bash install-rocky.sh
set -euo pipefail

echo "==> Actualizando sistema"
dnf -y update

echo "==> Instalando Podman, compose, git, chrony (NTP), openssl"
dnf -y install podman podman-docker git chrony openssl
# podman-compose (vía pip si no está en repos)
if ! command -v podman-compose >/dev/null 2>&1; then
  dnf -y install python3-pip && pip3 install podman-compose
fi

echo "==> Sincronización de tiempo (chrony)"
systemctl enable --now chronyd
chronyc makestep || true

echo "==> Firewall: abrir 80/443"
if systemctl is-active --quiet firewalld; then
  firewall-cmd --permanent --add-service=http
  firewall-cmd --permanent --add-service=https
  firewall-cmd --reload
fi

echo "==> Habilitar servicio de usuario Podman (autostart)"
loginctl enable-linger "${SUDO_USER:-root}" || true

echo "==> Listo. Siguiente: ./gen-cert.sh  y  ./supabase-selfhost.sh  y  podman-compose up -d --build"
podman --version
