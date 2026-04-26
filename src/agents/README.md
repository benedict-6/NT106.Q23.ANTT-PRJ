# Chương Trình Giám Sát Từ Xa - SIEM Agent

Thư mục này chứa mã nguồn toàn bộ của tầng truy xuất dữ liệu trên Endpoint (Agent). 

## 1. Kiến trúc của Agent

Agent bao gồm nhiều thành phần độc lập đóng vai trò thu thập thông tin và đẩy dữ liệu thu thập được thông qua Unix Domain Socket (`/tmp/agent_queue.sock`) xuống cho module chính làm nhiệm vụ đóng gói. Toàn bộ các module hiện tại đã được chuyển đổi sang **Golang**.

Các module hiện tại đang có:
- **agentCollector**: Module trung tâm. Giữ nhiệm vụ lắng nghe Unix Domain Socket, gộp luồng dữ liệu liên tục từ các module khác, nén qua **Gzip**, mã hóa an toàn qua **AES-GCM 256**, và gửi dữ liệu về Server chính thức (`http://localhost:8080/upload` theo mặc định).
- **NetProCollector**: Thu thập dữ liệu TCP/UDP và tiến trình sử dụng công nghệ `eBPF` (các syscall hook dựa trên `vmlinux.h`). eBPF hook được viết bằng C và chạy bằng `ecli`. Tuy nhiên, trình đọc output và gửi dữ liệu qua socket được quản lý bởi Golang.
- **LogCollector**: Module Golang đọc và báo cáo log xác thực liên tục từ thư mục hệ thống (ví dụ: `/var/log/auth.log`).
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

### Bước 3.2: Biên dịch và chạy NetProCollector (eBPF)
Mở một terminal (phiên chạy) C++ khác (Yêu cầu quyền sudo để tải eBPF module):

```bash
cd NetProCollector
# Dịch BPF C header resource => package.json
sudo ./ebpf/tools/ecc ebpf/netpro.bpf.c

# Biên dịch chương trình chuyển phát của C++
g++ NetProCollector.cpp -o NetProCollector

# Bật
sudo ./NetProCollector
```

### Bước 3.3: Chạy các Module Khác
Ở các tag shell khác, lần lượt biên dịch bằng G++ vào tạo tiến trình phụ:
```bash
# Log Collector
cd LogCollector
g++ LogCollector.cpp -o LogCollector
./LogCollector

# File Collector
cd ../FileCollector
g++ FileCollector.cpp -o FileCollector
./FileCollector

# Software Collector
cd ../SoftwareCollector
g++ SoftwareCollector.cpp -o SoftwareCollector
./SoftwareCollector
```

## 4. Kiểm tra
- Ở các cửa sổ chạy Collector, bạn sẽ thấy trạng thái báo `Connected to agentCollector`.
- Hãy thử tạo tác động như: Đăng nhập sai mk (`Log`), Thêm quyền/edit mk với `touch /etc/passwd` (`File`), Trình đọc sẽ tự động lấy các tác vụ và mã hóa bắn lên server.
- Tại cổng `localhost:8080`, dữ liệu AES-GCM nén lại sẽ được gửi kèm header `Content-Encoding: aes-gcm`. Đảm bảo tại back-end server có sử dụng cặp secret key giống nhau (`supersecretkey1234567890123456` ở bản nháp) để giải mã payload thu về.
