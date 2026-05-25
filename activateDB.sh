#!/bin/bash

echo "[+]--- STARTING DOCKER CONTAINERS ... ---[+]"
docker compose up -d
sleep 7

echo "[+]--- INITIALIZING DB ... ---[+]"
docker exec -i k13t_db psql -U team2 -d monitorDB < src/Server/shared/database/init/init_db_table.sql

echo "[+]--- INSERTING RULES ... ---[+]"
docker exec -i k13t_db psql -U team2 -d monitorDB -v json_data="$(cat demo_rule.json)" < src/Server/shared/database/init/init_detect_rules.sql

echo "[+]--- DONE SUCCESSFULLY ---[+]"
sleep 3
