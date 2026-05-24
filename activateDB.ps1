Write-Host "[+]--- STARTING DOCKER CONTAINERS ... ---[+]" -ForegroundColor Cyan
docker compose up -d
Start-Sleep -Seconds 7

Write-Host "[+]--- INITIALIZING DB ... ---[+]" -ForegroundColor Cyan
cmd.exe /c "docker exec -i k13t_db psql -U team2 -d monitorDB < src/Server/shared/database/init/init_db_table.sql"

Write-Host "[+]--- INSERTING RULES ... ---[+]" -ForegroundColor Cyan
$jsonData = Get-Content -Raw -Path demo_rule.json
# Phải escape đúng cách để truyền chuỗi JSON nguyên bản qua cmd.exe -> docker exec
# Tuy nhiên cách dễ nhất trên Windows là ghi tạm ra file trong container, nhưng ta dùng cách này trước:
docker exec -i k13t_db bash -c "psql -U team2 -d monitorDB -v json_data='$( $jsonData -replace "'", "''" )' < src/Server/shared/database/init/init_detect_rules.sql"

Write-Host "[+]--- DONE SUCCESSFULLY ---[+]" -ForegroundColor Green
Start-Sleep -Seconds 3
