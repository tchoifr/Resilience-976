#!/usr/bin/env bash
# Deploiement du site + backend sur le VPS.
#
# Le code appartient a l'utilisateur systeme "resilience" (pas de sudo, pas de
# shell de connexion), donc git/npm/build tournent sous son identite via
# `sudo -u`. Le redemarrage du service et le reload nginx demandent sudo.
# A executer en SSH sur le VPS avec un utilisateur ayant les droits sudo
# (ex: ubuntu), depuis n'importe quel repertoire.
#
# Usage : ./deploy/deploy.sh [branche]   (defaut : main)

set -euo pipefail

APP_DIR="/var/www/resilience-976"
APP_USER="resilience"
BRANCH="${1:-main}"

echo "==> Recuperation de la derniere version ($BRANCH)"
sudo -u "$APP_USER" -H bash -c "cd '$APP_DIR' && git fetch origin && git checkout '$BRANCH' && git pull origin '$BRANCH'"

echo "==> Installation des dependances"
sudo -u "$APP_USER" -H bash -c "cd '$APP_DIR' && npm ci"

echo "==> Build (utilise .env.production pour pointer /api/* en meme-origine)"
sudo -u "$APP_USER" -H bash -c "cd '$APP_DIR' && npm run build"

echo "==> Redemarrage du backend analytics"
sudo systemctl restart resilience-976-analytics

echo "==> Rechargement nginx"
sudo nginx -t
sudo systemctl reload nginx

echo "==> Deploiement termine : $(sudo -u "$APP_USER" git -C "$APP_DIR" rev-parse --short HEAD)"
