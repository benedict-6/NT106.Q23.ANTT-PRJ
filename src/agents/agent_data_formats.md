# Agent Data JSON Payloads

Tài liệu này mô tả chi tiết các định dạng JSON được sinh ra bởi 4 Collector Modules trên Agent và gửi về Server (thông qua `agent_queue.sock`).

Tất cả các log đều tuân theo chuẩn khung (schema) chung:
```json
{
  "type": "<tên_loại_log>",
  "metadata": {
    // Dữ liệu chi tiết tùy thuộc vào từng module
  }
}
```

---

## 1. FileCollector (File Integrity Monitoring / Syscheck)
Module này theo dõi các thay đổi trên file và thư mục nhạy cảm (`/etc`, `/boot`, `/usr/bin`...).

- **`type`**: `"file_integrity"`
- **Mô tả**: Báo cáo sự kiện thêm mới (ADDED), sửa đổi (MODIFIED), hoặc xóa (DELETED) file/thư mục.

**Ví dụ JSON payload (sự kiện MODIFIED):**
```json
{
  "type": "file_integrity",
  "metadata": {
    "file": "/etc/passwd",
    "event": "MODIFIED",
    "size": 2840,
    "mtime": 1714249112,
    "uid": 0,
    "gid": 0,
    "mode": "0644",
    "inode": 1234567,
    "hash_sha256": "4a5c...f7b1",
    "old_hash_sha256": "8b2d...c3a9" // Chỉ xuất hiện nếu hash bị thay đổi
  }
}
```

---

## 2. LogCollector (Log Monitoring)
Module này thu thập (tail) các dòng log mới được sinh ra từ các file như `/var/log/syslog`, `/var/log/auth.log`, v.v.

- **`type`**: `"log_monitoring"`
- **Mô tả**: Mặc định, nó đóng gói toàn bộ dòng log dưới dạng text (`"log": "..."`). Tuy nhiên, đối với các log SSH auth chuẩn (sshd), nó sẽ sử dụng Regex để bóc tách tự động thành các trường chi tiết.

**Ví dụ JSON payload (Khi log được parse thành công bởi SSH Regex):**
```json
{
  "type": "log_monitoring",
  "metadata": {
    "timestamp": "Apr 27 16:30:00",
    "host": "server",
    "service": "sshd",
    "pid": 1234,
    "action": "Accepted publickey",
    "user": "root",
    "src_ip": "192.168.1.50",
    "port": 54321
  }
}
```

**Ví dụ JSON payload (Khi không match regex - Fallback Text thuần):**
```json
{
  "type": "log_monitoring",
  "metadata": {
    "file": "/var/log/syslog",
    "log": "Apr 27 16:30:00 server kernel: [12345.6789] USB disconnect, device number 1"
  }
}
```

---

## 3. NetProCollector (Network & Process eBPF Hook)
Module này sử dụng eBPF (Eunomia) ở kernel-space để bắt các sự kiện liên quan đến mạng và tiến trình (Network & Process).

- **`type`**: `"net_pro"`
- **Mô tả**: Phản ánh các sự kiện `TCP_CONNECT`, `TCP_ACCEPT`, `UDP_SEND`, `PROC_EXEC`, v.v. Các trường mạng (saddr, daddr) được lưu trữ dưới dạng số nguyên không dấu (unsigned int) mạng.

**Ví dụ JSON payload (Tiến trình thực thi):**
```json
{
  "type": "net_pro",
  "metadata": {
    "timestamp": 1714249500000,
    "pid": 5678,
    "ppid": 5677,
    "type": 6,         // 6 tương ứng với EV_PROC_EXEC
    "saddr": 0,
    "daddr": 0,
    "sport": 0,
    "dport": 0,
    "family": 0,
    "protocol": 0,
    "state": 0,
    "exit_code": 0,
    "comm": "bash",
    "filename": "/usr/bin/bash"
  }
}
```

---

## 4. SoftwareCollector (Software Inventory)
Module này thu thập danh sách tất cả các phần mềm / gói tin (packages) đã được cài đặt trên hệ thống thông qua trình quản lý gói tin `dpkg`.

- **`type`**: `"software_list"`
- **Mô tả**: Trả về một mảng chứa thông tin của tất cả phần mềm được cài đặt (định kỳ mỗi 60 giây hoặc tùy cấu hình).

**Ví dụ JSON payload:**
```json
{
  "type": "software_list",
  "metadata": {
    "packages": [
      {
        "name": "bash",
        "version": "5.1-6ubuntu1"
      },
      {
        "name": "curl",
        "version": "7.81.0-1ubuntu1.16"
      },
      {
        "name": "openssl",
        "version": "3.0.2-0ubuntu1.15"
      }
    ]
  }
}
```
