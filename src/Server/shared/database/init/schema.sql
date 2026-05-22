CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    _role TEXT NOT NULL DEFAULT 'viewer' CHECK (_role IN ('admin', 'viewer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS servers (
    server_id TEXT PRIMARY KEY,
    ip_address INET NOT NULL,
    node_type TEXT NOT NULL CHECK (node_type IN ('master', 'worker')),
    _status TEXT NOT NULL CHECK (_status IN ('active', 'inactive', 'busy'))
);

-- agent_id dạng TEXT (AGT-XXXXXXXX) do dashController sinh ra
-- user_id FK liên kết agent thuộc user nào
CREATE TABLE IF NOT EXISTS agents (
    agent_id TEXT PRIMARY KEY,
    user_id TEXT,
    mac_address MACADDR,
    hostname TEXT,
    ip_address INET,
    auth_token TEXT,
    secret_key TEXT NOT NULL,
    secret_key_iv TEXT NOT NULL,
    secret_key_auth_tag TEXT NOT NULL,
    agent_description TEXT,
    agent_status TEXT NOT NULL DEFAULT 'offline' CHECK (agent_status IN ('online', 'offline')),
    current_session TEXT,
    last_active TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_agent_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS applications (
    app_id BIGSERIAL PRIMARY KEY, -- Auto-generate ID (code INSERT không truyền app_id)
    agent_id TEXT NOT NULL,
    software_name TEXT,
    _version TEXT,
    CONSTRAINT fk_application_agent FOREIGN KEY (agent_id) REFERENCES agents(agent_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS net_pro (
    net_pro_id BIGSERIAL,
    agent_id TEXT NOT NULL,
    event_type TEXT NOT NULL, -- e.g. 'TCP_CONNECT', 'PROC_EXEC', etc.
    pid INTEGER,
    ppid INTEGER,
    _uid TEXT,
    gid TEXT,
    comm TEXT,
    file_path TEXT,
    exit_code INTEGER,
    src_ip INET,
    dest_ip INET,
    protocol TEXT CHECK (protocol IN ('TCP', 'UDP')),
    sport INTEGER,
    dport INTEGER,
    _state TEXT, -- TCP state: ESTABLISHED, etc.
    _timestamp TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_net_pro_agent FOREIGN KEY (agent_id) REFERENCES agents(agent_id) ON DELETE CASCADE,
    PRIMARY KEY (net_pro_id, created_at)
);

CREATE TABLE IF NOT EXISTS file_integrity (
    file_log_id BIGSERIAL, 
    agent_id TEXT NOT NULL, 
    file_path TEXT NOT NULL, 
    event_type TEXT NOT NULL CHECK (event_type IN ('ADDED', 'MODIFIED', 'DELETED', 'ATTRIB')),
    old_hash TEXT,
    new_hash TEXT,
    _uid TEXT, -- user uid
    gid TEXT, -- group gid
    inode INT,
    _size BIGINT,
    permission TEXT CHECK (permission IN ('Read', 'Write', 'Execute')),
    _timestamp TIMESTAMPTZ,
    mtime TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_file_logs_agent FOREIGN KEY (agent_id) REFERENCES agents(agent_id) ON DELETE CASCADE,
    PRIMARY KEY (file_log_id, created_at)
);

CREATE TABLE IF NOT EXISTS log_monitoring (
    log_monitoring_id BIGSERIAL,
    agent_id TEXT NOT NULL,
    file_path TEXT NOT NULL,
    _timestamp TIMESTAMPTZ,
    _service TEXT,
    pid INTEGER,
    _action TEXT,
    src_ip INET,
    _user TEXT,
    port INTEGER,
    type_log TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_log_monitoring_agent FOREIGN KEY (agent_id) REFERENCES agents(agent_id) ON DELETE CASCADE,
    PRIMARY KEY (log_monitoring_id, created_at)
);

-- Bảng logs (generic) - PHẢI tạo TRƯỚC rule_alert vì rule_alert FK đến nó
CREATE TABLE IF NOT EXISTS logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    detail TEXT NOT NULL
);

-- Bảng detection_rules - PHẢI tạo TRƯỚC rule_alert vì rule_alert FK đến nó
CREATE TABLE IF NOT EXISTS detection_rules (
    rule_id TEXT PRIMARY KEY,               -- Ví dụ: '1001', '2001'
    rule_name TEXT NOT NULL,                -- Ví dụ: 'Connection to suspicious RAT ports'
    enabled BOOLEAN NOT NULL DEFAULT true,  -- Bật/tắt rule
    packet_level INTEGER NOT NULL,          -- Mức độ nghiêm trọng (ví dụ: 15)
    category TEXT NOT NULL,                 -- Ví dụ: 'network', 'process', 'fim'
    data_source TEXT NOT NULL,              -- Ánh xạ từ "type" trong JSON (net_pro, file_integrity,...)
    
    -- Dùng JSONB để lưu trữ linh hoạt mảng conditions và object threshold
    conditions JSONB NOT NULL DEFAULT '[]'::jsonb, 
    threshold JSONB,                        -- Có thể NULL vì không phải rule nào cũng có threshold
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rule_alert (
    rule_alert_id BIGSERIAL,
    agent_id TEXT NOT NULL,
    rule_id TEXT NOT NULL,
    packet_level INT,
    alert BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Nguồn từ bảng net_pro (Hypertable cần composite FK)
    net_pro_id BIGINT,
    net_pro_created_at TIMESTAMPTZ,

    -- Nguồn từ bảng file_integrity (Hypertable cần composite FK)
    file_log_id BIGINT,
    file_integrity_created_at TIMESTAMPTZ,

    -- Nguồn từ bảng log_monitoring (Hypertable cần composite FK)
    log_monitoring_id BIGINT,
    log_monitoring_created_at TIMESTAMPTZ,

    -- Nguồn từ bảng logs (không phải Hypertable nên chỉ cần 1 ID)
    log_id UUID,

    PRIMARY KEY (rule_alert_id, created_at),

    -- Ràng buộc khóa ngoại đến agents
    CONSTRAINT fk_rule_alert_agent 
        FOREIGN KEY (agent_id) REFERENCES agents(agent_id) ON DELETE CASCADE,

    -- Ràng buộc khóa ngoại đến detection_rules
    CONSTRAINT fk_rule_alert_rule 
        FOREIGN KEY (rule_id) REFERENCES detection_rules(rule_id) ON DELETE CASCADE,

    -- Ràng buộc khóa ngoại đến net_pro (composite key vì Hypertable)
    CONSTRAINT fk_rule_alert_net_pro 
        FOREIGN KEY (net_pro_id, net_pro_created_at) 
        REFERENCES net_pro(net_pro_id, created_at) ON DELETE CASCADE,

    -- Ràng buộc khóa ngoại đến file_integrity (composite key vì Hypertable)
    CONSTRAINT fk_rule_alert_file 
        FOREIGN KEY (file_log_id, file_integrity_created_at) 
        REFERENCES file_integrity(file_log_id, created_at) ON DELETE CASCADE,

    -- Ràng buộc khóa ngoại đến log_monitoring (composite key vì Hypertable)
    CONSTRAINT fk_rule_alert_log_mon 
        FOREIGN KEY (log_monitoring_id, log_monitoring_created_at) 
        REFERENCES log_monitoring(log_monitoring_id, created_at) ON DELETE CASCADE,

    -- Ràng buộc khóa ngoại đến logs
    CONSTRAINT fk_rule_alert_logs 
        FOREIGN KEY (log_id) 
        REFERENCES logs(log_id) ON DELETE CASCADE
);

-- =============================================
-- Khởi tạo Hypertable (TimescaleDB)
-- =============================================
SELECT create_hypertable('net_pro', 'created_at', if_not_exists => TRUE);
SELECT create_hypertable('file_integrity', 'created_at', if_not_exists => TRUE);
SELECT create_hypertable('log_monitoring', 'created_at', if_not_exists => TRUE);
SELECT create_hypertable('rule_alert', 'created_at', if_not_exists => TRUE);

-- =============================================
-- Indexes tối ưu truy vấn
-- =============================================
CREATE INDEX IF NOT EXISTS idx_application_agent_id ON applications(agent_id);
CREATE INDEX IF NOT EXISTS idx_net_pro_agent_created_at ON net_pro(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_integrity_agent_created_at ON file_integrity(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_log_monitoring_agent_created_at ON log_monitoring(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_detail ON logs USING gin (to_tsvector('simple', detail));
CREATE INDEX IF NOT EXISTS idx_detection_rules_source ON detection_rules(data_source, enabled);