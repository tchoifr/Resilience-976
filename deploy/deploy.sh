#!/usr/bin/env bash
# Deploiement du site + backend sur le VPS.
# A executer depuis /var/www/resilience-976 (ou adapter APP_DIR), en tant
# qu'utilisateur ayant les droits sudo sur les services systemd/nginx.
#
# Usage : ./deploy/deploy.sh [branche]   (defaut : main)

set -euo pipefail

APP_DIR="/var/www/resilience-976"
BRANCH="${1:-main}"

cd "$APP_DIR"

echo "==> Recuperation de la derniere version ($BRANCH)"
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

echo "==> Installation des dependances"
npm ci

echo "==> Build (utilise .env.production pour pointer /api/* en meme-origine)"
npm run build

echo "==> Redemarrage du backend analytics"
sudo systemctl restart resilience-976-analytics

echo "==> Rechargement nginx"
sudo nginx -t
sudo systemctl reload nginx

echo "==> Deploiement termine : $(git rev-parse --short HEAD)"
