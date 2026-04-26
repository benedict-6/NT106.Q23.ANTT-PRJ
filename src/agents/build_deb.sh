#!/bin/bash
set -e

echo "=== SIEM Agent DEB Packaging Script ==="

PKG_NAME="siem-agent"
PKG_VERSION="1.0.0"
ARCH="amd64"
DEB_DIR="${PKG_NAME}_${PKG_VERSION}_${ARCH}"

echo "1. Cleaning up old build directories..."
rm -rf "$DEB_DIR"
mkdir -p "$DEB_DIR/DEBIAN"
mkdir -p "$DEB_DIR/opt/siem-agent/ebpf/tools"
mkdir -p "$DEB_DIR/etc/systemd/system"

echo "2. Building Go Binaries..."
export PATH=$PATH:/usr/local/go/bin
cd agentCollector && go build -o ../$DEB_DIR/opt/siem-agent/agentCollector main.go && cd ..
cd LogCollector && go build -o ../$DEB_DIR/opt/siem-agent/LogCollector main.go && cd ..
cd FileCollector && go build -o ../$DEB_DIR/opt/siem-agent/FileCollector main.go && cd ..
cd SoftwareCollector && go build -o ../$DEB_DIR/opt/siem-agent/SoftwareCollector main.go && cd ..

echo "3. Building NetProCollector (Golang & eBPF)..."
cd NetProCollector
sudo ./ebpf/tools/ecc ebpf/netpro.bpf.c ebpf/netpro.h || echo "ecc might have failed or not needed if package.json is pre-generated"
go build -o ../$DEB_DIR/opt/siem-agent/NetProCollector main.go
cp ebpf/package.json ../$DEB_DIR/opt/siem-agent/ebpf/
cp ebpf/tools/ecli ../$DEB_DIR/opt/siem-agent/ebpf/tools/
cd ..

echo "4. Creating start script..."
cat << 'EOF' > "$DEB_DIR/opt/siem-agent/start.sh"
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
EOF
chmod +x "$DEB_DIR/opt/siem-agent/start.sh"

echo "5. Creating DEBIAN Control file..."
cat << EOF > "$DEB_DIR/DEBIAN/control"
Package: $PKG_NAME
Version: $PKG_VERSION
Section: custom
Priority: optional
Architecture: $ARCH
Depends: auditd
Maintainer: Admin <admin@example.com>
Description: SIEM Endpoint Agent
 Hệ thống giám sát bảo mật thiết bị đầu cuối cho SIEM.
 Bao gồm thu thập Log, File Integrity, Network (eBPF) và Software.
EOF

echo "6. Creating Systemd Service..."
cat << 'EOF' > "$DEB_DIR/etc/systemd/system/siem-agent.service"
[Unit]
Description=SIEM Endpoint Agent
After=network.target auditd.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/siem-agent
ExecStart=/bin/bash /opt/siem-agent/start.sh
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

echo "7. Creating postinst and prerm scripts..."
cat << 'EOF' > "$DEB_DIR/DEBIAN/postinst"
#!/bin/bash
systemctl daemon-reload
systemctl enable siem-agent
systemctl start siem-agent
EOF
chmod +x "$DEB_DIR/DEBIAN/postinst"

cat << 'EOF' > "$DEB_DIR/DEBIAN/prerm"
#!/bin/bash
systemctl stop siem-agent
systemctl disable siem-agent
EOF
chmod +x "$DEB_DIR/DEBIAN/prerm"

echo "8. Building .deb package..."
dpkg-deb --build "$DEB_DIR"

echo "=== Build Complete! File đóng gói: $DEB_DIR.deb ==="
