#!/bin/bash
set -e

echo "=== SIEM Agent Build Script ==="

# Create build directory
BUILD_DIR="dist_agent"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

echo "1. Building agentCollector (Go)..."
cd agentCollector
go build -o ../$BUILD_DIR/agentCollector main.go
cd ..

echo "2. Building NetProCollector (C++ & eBPF)..."
cd NetProCollector
# Assuming ecc is executable and paths are resolving
# If ecc is not natively runnable on build env without setup, this might fail.
# For demo, we just compile the C++ runner. Make sure package.json is pre-generated or generated here:
sudo ./ebpf/tools/ecc ebpf/netpro.bpf.c ebpf/netpro.h || echo "Make sure to run ecc if this step fails due to permission"
g++ NetProCollector.cpp -o ../$BUILD_DIR/NetProCollector
# Copy ecli and package.json
mkdir -p ../$BUILD_DIR/ebpf/tools
cp ebpf/package.json ../$BUILD_DIR/ebpf/
cp ebpf/tools/ecli ../$BUILD_DIR/ebpf/tools/
cd ..

echo "3. Building Log, File, and Software Collectors (C++)..."
cd LogCollector && g++ LogCollector.cpp -o ../$BUILD_DIR/LogCollector && cd ..
cd FileCollector && g++ FileCollector.cpp -o ../$BUILD_DIR/FileCollector && cd ..
cd SoftwareCollector && g++ SoftwareCollector.cpp -o ../$BUILD_DIR/SoftwareCollector && cd ..

echo "4. Creating unified start script..."
cat << 'EOF' > "$BUILD_DIR/start.sh"
#!/bin/bash
echo "Khởi động SIEM Agent..."

# Kiểm tra quyền root vì eBPF và FileCollector (inotify /etc) cần
if [ "$EUID" -ne 0 ]; then
  echo "Vui lòng chạy script này dưới quyền root (sudo ./start.sh)"
  exit 1
fi

# Chạy Go Agent Collector
echo "Đang khởi động Agent Collector..."
./agentCollector &
AGENT_PID=$!
sleep 2 # Đợi socket khởi tạo

# Chạy các module thu thập
echo "Đang khởi động NetProCollector..."
./NetProCollector &
NET_PID=$!

echo "Đang khởi động LogCollector..."
./LogCollector &
LOG_PID=$!

echo "Đang khởi động FileCollector..."
./FileCollector &
FILE_PID=$!

echo "Đang khởi động SoftwareCollector..."
./SoftwareCollector &
SOFT_PID=$!

echo "Hoàn thành! Toàn bộ hệ thống SIEM Agent đang chạy ngầm."
echo "Bạn có thể sử dụng (kill $AGENT_PID $NET_PID $LOG_PID $FILE_PID $SOFT_PID) để tắt chúng."

# Giữ main thread sống hoặc có thể cho script kết thúc cũng được
wait
EOF
chmod +x "$BUILD_DIR/start.sh"

echo "5. Packaging..."
tar -czvf siem_agent_release.tar.gz -C "$BUILD_DIR" .
echo "=== Build Complete! File đóng gói: siem_agent_release.tar.gz ==="
