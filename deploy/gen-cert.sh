#!/usr/bin/env bash
# Genera un certificado TLS autofirmado para arrancar (reemplazar por CA interna / Let's Encrypt en prod).
set -euo pipefail
mkdir -p certs
openssl req -x509 -nodes -newkey rsa:2048 -days 825 \
  -keyout certs/condor.key -out certs/condor.crt \
  -subj "/C=CL/O=CENAE/CN=condor.local"
echo "Certificado autofirmado en deploy/certs/ (condor.crt, condor.key)."
