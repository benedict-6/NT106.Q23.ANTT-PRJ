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
- **Các trường giá trị (Possible Values)**:
  - `type`: `"file_integrity"`
  - `metadata.event`: `"ADDED" / "MODIFIED" / "DELETED"`

**Ví dụ JSON payload (sự kiện ADDED):**
```json
{
  "type": "file_integrity",
  "metadata": {
    "file": "/etc/testfile",
    "event": "ADDED",
    "timestamp": "2026-04-29T03:10:00Z",
    "mtime": "2026-04-29T03:10:00Z",
    "size": 1234,
    "uid": 0,
    "gid": 0,
    "mode": "0644",
    "inode": 570101,
    "hash_sha256": "e3b0c44298fc1c149..."
  }
}
```

**Ví dụ JSON payload (sự kiện MODIFIED):**
```json
{
  "type": "file_integrity",
  "metadata": {
    "file": "/etc/passwd",
    "event": "MODIFIED",
    "timestamp": "2026-04-29T03:12:00Z",
    "mtime": "2026-04-29T03:12:00Z",
    "size": 2840,
    "uid": 0,
    "gid": 0,
    "mode": "0644",
    "inode": 1234567,
    "hash_sha256": "4a5c...f7b1",
    "old_hash_sha256": "8b2d...c3a9"
  }
}
```

**Ví dụ JSON payload (sự kiện DELETED):**
```json
{
  "type": "file_integrity",
  "metadata": {
    "file": "/etc/testfile",
    "event": "DELETED",
    "timestamp": "2026-04-29T03:15:00Z",
    "mtime": "2026-04-29T03:15:00Z"
  }
}
```

---

## 2. LogCollector (Log Monitoring)
Module này thu thập (tail) các dòng log mới được sinh ra từ các file như `/var/log/syslog`, `/var/log/auth.log`, `/var/log/audit/audit.log`.

- **`type`**: `"log_monitoring"`
- **Mô tả**: Phân tích log theo từng loại file. SSHD và Sudo từ auth.log, syslog từ /var/log/syslog, audit log từ audit.log. Khi không match regex thì fallback gửi dòng log nguyên bản.
- **Các trường giá trị (Possible Values)**:
  - `type`: `"log_monitoring"`
  - `metadata.type_log`: `"sshd" / "sudo" / "syslog" / "auditLog"`
  - `metadata.action` (nếu là SSHD): `"Accepted publickey" / "Accepted password" / "Failed password" / "Invalid user" / "Disconnected" / "Connection closed" / ...`

**Ví dụ JSON payload (SSHD - parse từ auth.log):**
```json
{
  "type": "log_monitoring",
  "metadata": {
    "timestamp": "2026-04-29T10:30:00+07:00",
    "file": "/var/log/auth.log",
    "type_log": "sshd",
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

**Ví dụ JSON payload (Sudo - parse từ auth.log):**
```json
{
  "type": "log_monitoring",
  "metadata": {
    "timestamp": "2026-04-29T10:31:00+07:00",
    "file": "/var/log/auth.log",
    "type_log": "sudo",
    "command": "/usr/bin/apt update"
  }
}
```

**Ví dụ JSON payload (Syslog - parse thành công):**
```json
{
  "type": "log_monitoring",
  "metadata": {
    "timestamp": "2026-04-29T10:30:00+07:00",
    "file": "/var/log/syslog",
    "type_log": "syslog",
    "host": "server",
    "service": "kernel",
    "message": "[12345.6789] USB disconnect, device number 1"
  }
}
```

**Ví dụ JSON payload (Audit log - parse từ audit.log):**
```json
{
  "type": "log_monitoring",
  "metadata": {
    "timestamp": "2026-04-29T03:30:00+07:00",
    "file": "/var/log/audit/audit.log",
    "type_log": "auditLog",
    "action": "USER_AUTH",
    "pid": 1234,
    "user_id": 1000,
    "user": "ubuntu",
    "process": "/usr/sbin/sshd",
    "result": "success"
  }
}
```

**Ví dụ JSON payload (Fallback - không match regex):**
```json
{
  "type": "log_monitoring",
  "metadata": {
    "timestamp": "2026-04-29T10:30:00+07:00",
    "file": "/var/log/syslog",
    "log": "some unrecognized log line content here"
  }
}
```

---

## 3. NetProCollector (Network & Process eBPF Hook)
Module này sử dụng eBPF (Eunomia) ở kernel-space để bắt các sự kiện liên quan đến mạng và tiến trình (Network & Process).

- **`type`**: `"net_pro"`
- **Mô tả**:
  - Network: `TCP_CONNECT`, `TCP_ACCEPT`, `TCP_STATE`, `UDP_SEND`, `UDP_RECV`
  - Process: `PROC_FORK`, `PROC_EXEC`, `PROC_EXIT`
  - Các trường rỗng (chuỗi `""` hoặc số `0` với IP) được tự động xóa khỏi JSON.
  - Trường `state` chỉ xuất hiện khi event = `TCP_STATE`.
  - Trường `protocol` / `family` chỉ xuất hiện khi có giá trị hợp lệ (TCP/UDP, IPv4/IPv6).
  - Địa chỉ IP được rename: `saddr` → `src_ip`, `daddr` → `dst_ip`.
- **Các trường giá trị (Possible Values)**:
  - `type`: `"net_pro"`
  - `metadata.event`: `"TCP_CONNECT" / "TCP_ACCEPT" / "TCP_STATE" / "UDP_SEND" / "UDP_RECV" / "PROC_FORK" / "PROC_EXEC" / "PROC_EXIT"`
  - `metadata.protocol`: `"TCP" / "UDP"` (không xuất hiện nếu không phải TCP/UDP)
  - `metadata.family`: `"IPv4" / "IPv6"` (không xuất hiện nếu không hợp lệ)
  - `metadata.state`: `"ESTABLISHED" / "SYN_SENT" / "SYN_RECV" / "FIN_WAIT1" / "FIN_WAIT2" / "TIME_WAIT" / "CLOSE" / "CLOSE_WAIT" / "LAST_ACK" / "LISTEN" / "CLOSING" / "NEW_SYN_RECV"` (chỉ khi event = TCP_STATE)

**Ví dụ JSON payload (TCP_CONNECT):**
```json
{
  "type": "net_pro",
  "metadata": {
    "timestamp": "2026-04-29T03:00:00Z",
    "event": "TCP_CONNECT",
    "pid": 5678,
    "protocol": "TCP",
    "family": "IPv4",
    "src_ip": "192.168.1.100",
    "dst_ip": "8.8.8.8",
    "sport": 45678,
    "dport": 443,
    "comm": "curl"
  }
}
```

**Ví dụ JSON payload (TCP_STATE):**
```json
{
  "type": "net_pro",
  "metadata": {
    "timestamp": "2026-04-29T03:00:01Z",
    "event": "TCP_STATE",
    "state": "ESTABLISHED",
    "pid": 5678,
    "src_ip": "192.168.1.100",
    "dst_ip": "8.8.8.8",
    "sport": 45678,
    "dport": 443
  }
}
```

**Ví dụ JSON payload (UDP_SEND):**
```json
{
  "type": "net_pro",
  "metadata": {
    "timestamp": "2026-04-29T03:00:02Z",
    "event": "UDP_SEND",
    "pid": 1234,
    "protocol": "UDP",
    "family": "IPv4",
    "src_ip": "192.168.1.100",
    "dst_ip": "8.8.8.8",
    "sport": 40000,
    "dport": 53,
    "comm": "dig"
  }
}
```

**Ví dụ JSON payload (PROC_EXEC):**
```json
{
  "type": "net_pro",
  "metadata": {
    "timestamp": "2026-04-29T03:00:03Z",
    "event": "PROC_EXEC",
    "pid": 7777,
    "comm": "bash",
    "filename": "/bin/bash"
  }
}
```

**Ví dụ JSON payload (PROC_FORK):**
```json
{
  "type": "net_pro",
  "metadata": {
    "timestamp": "2026-04-29T03:00:04Z",
    "event": "PROC_FORK",
    "pid": 8888,
    "ppid": 7777,
    "comm": "bash"
  }
}
```

**Ví dụ JSON payload (PROC_EXIT):**
```json
{
  "type": "net_pro",
  "metadata": {
    "timestamp": "2026-04-29T03:00:05Z",
    "event": "PROC_EXIT",
    "pid": 8888,
    "exit_code": 0,
    "comm": "bash"
  }
}
```

---

## 4. SoftwareCollector (Software Inventory)
Module này thu thập danh sách tất cả các phần mềm / gói tin (packages) đã được cài đặt trên hệ thống thông qua trình quản lý gói tin `dpkg`.

- **`type`**: `"software_list"`
- **Mô tả**: Trả về một mảng chứa thông tin của tất cả phần mềm được cài đặt (định kỳ mỗi 60 giây hoặc tùy cấu hình).
- **Các trường giá trị (Possible Values)**:
  - `type`: `"software_list"`

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
