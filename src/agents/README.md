# Chương Trình Giám Sát Từ Xa - SIEM Agent

Thư mục này chứa mã nguồn toàn bộ của tầng truy xuất dữ liệu trên Endpoint (Agent). 

## 1. Kiến trúc của Agent

Agent bao gồm nhiều thành phần độc lập đóng vai trò thu thập thông tin và đẩy dữ liệu thu thập được thông qua Unix Domain Socket (`/tmp/agent_queue.sock`) xuống cho module chính làm nhiệm vụ đóng gói. Toàn bộ các module hiện tại sử dụng **Golang**.

Các module hiện tại đang có:
- **agentCollector**: Module trung tâm. Giữ nhiệm vụ lắng nghe Unix Domain Socket, gộp luồng dữ liệu liên tục từ các module khác, nén qua **Gzip**, mã hóa an toàn qua **AES-GCM 256**, và gửi dữ liệu về Server chính thức thông qua kết nối **TCP Socket** thời gian thực (sau khi thực hiện HTTP handshake xác thực ban đầu).
- **NetProCollector**: Thu thập dữ liệu TCP/UDP và tiến trình sử dụng công nghệ `eBPF` (các syscall hook dựa trên `vmlinux.h`). eBPF hook được viết bằng C và chạy bằng `ecli`. Tuy nhiên, trình đọc output và gửi dữ liệu qua socket được quản lý bởi Golang.
- **LogCollector**: Module Golang đọc và báo cáo log xác thực liên tục từ thư mục hệ thống (ví dụ: `/var/log/auth.log`, `/var/log/audit/audit.log`, `/var/log/syslog`).
- **FileCollector**: Trình giả lập FIM (File Integrity Monitoring). Viết bằng Golang, sử dụng package `syscall` inotify mặc định trên Linux để theo dõi sự thay đổi (`IN_MODIFY`, `IN_ATTRIB`) trên `/etc/passwd`, `/etc/shadow`, `/etc/sudoers`. Dùng `os/exec` gọi lệnh `sha256sum` để tạo chuỗi băm.
- **SoftwareCollector**: Định kỳ gọi `dpkg-query -W` để lấy danh sách phần mềm đang cài đặt, đóng gói bằng JSON và đẩy qua Socket (viết bằng Golang).

Tất cả payload vận chuyển giữa các Module và `agentCollector` đều ở định dạng dữ liệu `JSON`.

## 2. Thông Tin Code eBPF (NetProCollector)

Tập tin nằm tại: `NetProCollector/ebpf/netpro.bpf.c`. Sử dụng các hook `fentry`, `fexit`, và `kprobe`.
- **TCP**: `fentry/inet_sock_set_state`, `fentry/tcp_connect`, `fexit/inet_csk_accept`.
- **UDP**: `fentry/udp_sendmsg`, `fentry/udp_recvmsg`.
- **Process**: `kprobe/kernel_clone`, `kprobe/do_execveat_common`, `kprobe/do_exit`.

## 3. Hướng Dẫn Biên Dịch & Chạy

Mặc định, bạn cần phiên bản Linux Kernel tương thích hỗ trợ BTF (phiên bản > `5.5+`) và cài đặt `go` >= `1.18`.

### Bước 3.1: Khởi động Server Trung Tâm (agentCollector)
```bash
cd agentCollector
go run main.go
```
Khi chạy thành công, nó sẽ hiển thị `Listening on Unix socket: /tmp/agent_queue.sock` và thiết lập quyền truy cập chung.

### Bước 3.2: Biên dịch và chạy NetProCollector (eBPF + Go)
Mở một terminal khác (Yêu cầu quyền sudo để tải eBPF module thông qua `ecli` bên trong mã Go):

```bash
cd NetProCollector
# Biên dịch BPF C header resource => package.json bằng lệnh dưới nếu chưa có
sudo ./ebpf/tools/ecc ebpf/netpro.bpf.c ebpf/netpro.h

# Khởi chạy Go wrapper (tự động gọi ecli ở background và đọc log)
sudo go run main.go
```

### Bước 3.3: Chạy các Module Khác (Golang)
Ở các tab terminal khác, lần lượt chạy trực tiếp bằng `go run`:
```bash
# Log Collector
cd LogCollector
go run main.go

# File Collector
cd ../FileCollector
go run main.go

# Software Collector
cd ../SoftwareCollector
go run main.go
```

**Lưu ý:** Bạn cũng có thể dùng file script chung `build.sh` tại thư mục gốc `src/agents/` để biên dịch tất cả ra file nhị phân trong thư mục `dist_agent/`. Script tự động sử dụng `go build` trên tất cả module.

## 4. Kiểm tra
- Ở các cửa sổ chạy Collector, bạn sẽ thấy trạng thái báo `Connected to agentCollector`.
- Hãy thử tạo tác động như: 
  - Thêm nội dung vào `/var/log/auth.log` (`LogCollector`).
  - Sửa quyền hoặc nội dung `/etc/passwd` (`FileCollector`).
- Tại máy chủ Server, dữ liệu AES-GCM nén lại sẽ được đẩy qua luồng TCP dài hạn liên tục tới Worker Node (hoặc Load Balancer). Đảm bảo Server Backend đang chạy và Master Node đã được khởi chạy với cùng một tập tin bí mật (secret_key) để giải mã chính xác (cấp phát qua token).

## 5. Đóng gói và Cài đặt tự động (.deb)

Để thuận tiện cho việc phân phối và cài đặt tự động trên các máy Ubuntu/Debian, Agent hỗ trợ đóng gói dưới định dạng `.deb`.

**Bước 1: Chạy script đóng gói**
Tại thư mục `src/agents/`, chạy lệnh sau (yêu cầu máy có cài sẵn Go và dpkg-deb):
```bash
./build_deb.sh
```
Sau khi chạy xong, bạn sẽ thu được một file `siem-agent_1.0.0_amd64.deb`.

**Bước 2: Cài đặt trên máy client**
Copy file `.deb` sang máy cần cài đặt và chạy lệnh:
```bash
sudo apt install ./siem-agent_1.0.0_amd64.deb
```
Lệnh `apt install` sẽ tự động:
1. Giải nén và chép các file vào `/opt/siem-agent/`.
2. Tự động kiểm tra và cài đặt các dependency cần thiết (như **auditd**).
3. Đăng ký dịch vụ `siem-agent.service` với Systemd và kích hoạt nó tự động chạy ngầm.

**Các lệnh quản lý dịch vụ sau khi cài đặt:**
- Kiểm tra trạng thái: `systemctl status siem-agent`
- Khởi động lại: `sudo systemctl restart siem-agent`
- Dừng dịch vụ: `sudo systemctl stop siem-agent`
- Gỡ cài đặt hoàn toàn: `sudo apt remove siem-agent`
