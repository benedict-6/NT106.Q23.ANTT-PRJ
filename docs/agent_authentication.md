# 🔐 Agent Authentication — Tài liệu Kỹ thuật

## 1. Tổng Quan Luồng Xác Thực

```
User (Browser)                  Master Server                  Agent (Go binary)
     │                                │                                │
     │─── POST /api/auth/register ───>│                                │
     │<── 201 Created ────────────────│                                │
     │                                │                                │
     │─── POST /api/auth/login ──────>│                                │
     │<── 200 OK {jwt_token} ─────────│                                │
     │                                │                                │
     │─── POST /agents/create (JWT) ─>│                                │
     │<── 201 {agent_id, secret} ─────│                                │
     │                                │                                │
     │─── GET /agents/download (JWT) >│                                │
     │<── agent_config.json ──────────│                                │
     │                                │                                │
     │                    User cài đặt Agent & đặt                     │
     │                    config lên trên máy trạm                     │
     │                                │                                │
     │                                │<─── POST /agent/handshake ─────│
     │                                │     {agent_id, mac, ts, sig}   │
     │                                │─── 200 {session_token} ───────>│
     │                                │                                │
     │<── Socket.IO agent:connected ──│                                │
     │                                │                                │
     │                                │<─── POST /agent/upload ────────│
     │                                │     (Bearer session_token)     │
     │                                │─── 200 OK ────────────────────>│
     │                                │                                │
```

## 2. API Endpoints

### 2.1 User Authentication (cho UI Dashboard)

| Method | Endpoint | Auth | Body | Response |
|--------|----------|------|------|----------|
| POST | `/api/auth/register` | Không | `{user_email, password}` | `201 {message}` |
| POST | `/api/auth/login` | Không | `{user_email, password}` | `200 {token, userId}` |

### 2.2 Dashboard Management (JWT Required)

| Method | Endpoint | Auth | Body/Params | Response |
|--------|----------|------|-------------|----------|
| POST | `/api/dashboard/agents/create` | JWT | `{description}` | `201 {agent_id, secret_key}` |
| GET | `/api/dashboard/agents` | JWT | — | `200 {agents: [...]}` |
| GET | `/api/dashboard/agents/download/:agent_id` | JWT | URL param | File `agent_config.json` |

### 2.3 Agent Communication

| Method | Endpoint | Auth | Body | Response |
|--------|----------|------|------|----------|
| POST | `/api/agent/handshake` | HMAC-SHA256 | `{agent_id, mac_address, hostname, timestamp, signature}` | `200 {session_token}` |
| POST | `/api/agent/upload` | Session Token | Binary (AES-GCM encrypted) | `200` |

## 3. Cơ Chế Bảo Mật

### 3.1 HMAC-SHA256 Handshake

Agent tạo chữ ký số để chứng minh nó sở hữu `secret_key`:

```
payload   = MAC_ADDRESS + "|" + UNIX_TIMESTAMP_MS
signature = HMAC-SHA256(payload, secret_key)
```

Server verify bằng cách:
1. **Anti-replay**: Kiểm tra `|timestamp - now| < 30 giây`
2. **Decrypt secret_key** từ DB (AES-256-GCM)
3. **So sánh signature** bằng `crypto.timingSafeEqual()` (chống timing attack)

### 3.2 Session Token

- Sinh bằng `crypto.randomBytes(32)` (256-bit entropy)
- Lưu trong DB cột `agents.current_session`
- Agent gửi kèm mỗi request upload qua header `Authorization: Bearer <token>`
- Nếu bị 401/403 → Agent tự động handshake lại

### 3.3 Secret Key Encryption at Rest

Secret key được mã hóa bằng AES-256-GCM trước khi lưu DB:
- `secret_key`: ciphertext (hex)
- `secret_key_iv`: initialization vector (hex)
- `secret_key_auth_tag`: authentication tag (hex)
- Master key: biến môi trường `AES_MASTER_KEY` (32 bytes = 64 hex chars)

## 4. File Cấu Hình Agent

File `agent_config.json` được tải từ Dashboard, đặt cùng thư mục với binary:

```json
{
    "agent_id": "AGT-A1B2C3D4",
    "secret_key": "raw_secret_key_hex_string",
    "server_url": "http://master-server-ip:3000"
}
```

## 5. Socket.IO Real-time Events

| Event | Direction | Payload | Mô tả |
|-------|-----------|---------|--------|
| `join` | Client → Server | `userId` | User join room riêng |
| `agent:connected` | Server → Client | `{agent_id, hostname, mac, status, last_active}` | Agent mới hoàn tất handshake |

## 6. Database Schema (Bảng liên quan)

### Bảng `users`
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| user_id | UUID (PK) | Auto-generated |
| email | TEXT UNIQUE | Dùng để đăng nhập |
| password_hash | TEXT | bcrypt hash |
| _role | TEXT | 'admin' / 'viewer' |

### Bảng `agents`
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| agent_id | TEXT (PK) | Format: AGT-XXXXXXXX |
| user_id | UUID (FK) | Liên kết agent → user |
| secret_key | TEXT | Encrypted (AES-256-GCM) |
| secret_key_iv | TEXT | IV cho giải mã |
| secret_key_auth_tag | TEXT | Auth tag cho giải mã |
| agent_status | TEXT | 'Active' / 'Inactive' |
| current_session | TEXT | Session token (null = offline) |
| hostname | TEXT | Cập nhật khi handshake |
| mac_address | MACADDR | Cập nhật khi handshake |
| last_active | TIMESTAMPTZ | Cập nhật mỗi request |

## 7. Cấu Trúc Files

```
src/Server/
├── server.js                          # Entry point (chỉ mount routes + Socket.IO)
├── master/
│   ├── Middleware/
│   │   ├── verifyJWT.js               # Xác thực JWT cho UI
│   │   └── verifyAgentSession.js      # Xác thực session token cho Agent
│   ├── controllers/
│   │   ├── authController.js          # Register / Login
│   │   ├── dashController.js          # CRUD agents + download config
│   │   └── agentAuthController.js     # Handshake HMAC-SHA256
│   └── routes/
│       ├── authRoutes.js              # /api/auth/*
│       ├── dashRoutes.js              # /api/dashboard/*
│       └── agentRoutes.js             # /api/agent/*
└── shared/
    ├── database/
    │   └── init/schema.sql            # DDL bảng users, agents, logs...
    └── utils/
        └── cryptoUtils.js             # AES-256-GCM encrypt/decrypt

src/agents/
└── agentCollector/
    └── main.go                        # Đọc config → Handshake → Thu thập dữ liệu
```
