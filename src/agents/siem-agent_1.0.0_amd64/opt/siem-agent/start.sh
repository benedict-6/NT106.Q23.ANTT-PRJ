#!/bin/bash
# Script khởi động bằng Systemd
cd /opt/siem-agent

./agentCollector &
AGENT_PID=$!
sleep 2

./NetProCollector &
./LogCollector &
./FileCollector &
./SoftwareCollector &

wait
