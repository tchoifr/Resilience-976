#!/usr/bin/env bash
# Vide les donnees de prod (sqlite + events.jsonl) pour repartir avec un
# modele propre. Le schema est recree automatiquement par le backend
# (CREATE TABLE IF NOT EXISTS a l'ouverture de la base, cf. getDatabase()
# dans server/analytics-server.mjs), donc rien a rejouer manuellement.
#
# Aucune sauvegarde n'est faite : les fichiers sont supprimes definitivement.
# A executer en SSH sur le VPS avec un utilisateur ayant les droits sudo
# (ex: ubuntu), depuis n'importe quel repertoire.
#
# Usage : ./deploy/reset-data.sh

set -euo pipefail

APP_DIR="/var/www/resilience-976"
DATA_DIR="$APP_DIR/server/data"
SERVICE="resilience-976-analytics"

echo "==> Arret du backend analytics"
sudo systemctl stop "$SERVICE"

echo "==> Suppression des donnees ($DATA_DIR)"
sudo rm -f "$DATA_DIR/resilience.sqlite" "$DATA_DIR/events.jsonl"

echo "==> Redemarrage du backend analytics"
sudo systemctl start "$SERVICE"

echo "==> Recreation du schema (declenchee par le premier appel API)"
curl -s -o /dev/null -w 'dashboard: HTTP %{http_code}\n' http://127.0.0.1:8787/api/dashboard

echo "==> Verification"
ls -la "$DATA_DIR"

echo "==> Termine : base vide, modele propre."
