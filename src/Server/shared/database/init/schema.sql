CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    _role TEXT NOT NULL DEFAULT 'admin' CHECK (_role IN ('admin', 'viewer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS servers (
    server_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address INET NOT NULL,
    node_type TEXT NOT NULL CHECK (node_type IN ('master', 'worker')),
    _status TEXT NOT NULL CHECK (_status IN ('active', 'inactive', 'busy'))
);

-- agent_id dạng TEXT (AGT-XXXXXXXX) do dashController sinh ra
-- user_id FK liên kết agent thuộc user nào
CREATE TABLE IF NOT EXISTS agents (
    agent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mac_address MACADDR NOT NULL,
    hostname TEXT NOT NULL,
    ip_address INET NOT NULL,
    auth_token TEXT NOT NULL,
    secret_key TEXT NOT NULL,
    secret_key_iv TEXT NOT NULL,
    secret_key_auth_tag TEXT NOT NULL,
    agent_description TEXT,
    agent_status TEXT NOT NULL CHECK (agent_status IN ('online', 'offline'))
);

CREATE TABLE IF NOT EXISTS applications (
    app_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id TEXT NOT NULL,
    software_name TEXT,
    _version TEXT,
    CONSTRAINT fk_application_agent FOREIGN KEY (agent_id) REFERENCES agents(agent_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS process_logs (
    process_log_id BIGSERIAL,
    agent_id TEXT NOT NULL,
    _status TEXT NOT NULL CHECK (_status IN ('Start', 'Stop', 'Running')),
    pid INTEGER NOT NULL,
    process_name TEXT NOT NULL,
    cmd_line TEXT,
    _user TEXT NOT NULL CHECK (_user IN ('SYSTEM', 'Admin', 'User')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_process_logs_agent FOREIGN KEY (agent_id) REFERENCES agents(agent_id) ON DELETE CASCADE,
    PRIMARY KEY (process_log_id, created_at)
);

CREATE TABLE IF NOT EXISTS network_logs (
    netlog_id BIGSERIAL,
    agent_id TEXT NOT NULL,
    src_ip INET,
    dest_ip INET,
    protocol TEXT NOT NULL CHECK (protocol IN ('TCP', 'UDP')),
    dest_port INTEGER CHECK (dest_port >= 0 AND dest_port <= 65535),
    connection_cnt INTEGER NOT NULL DEFAULT 0,
    pid INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_network_logs_agent FOREIGN KEY (agent_id) REFERENCES agents(agent_id) ON DELETE CASCADE,
    PRIMARY KEY (netlog_id, created_at)
);

CREATE TABLE IF NOT EXISTS file_logs (
    file_log_id BIGSERIAL,
    agent_id TEXT NOT NULL,
    file_path TEXT NOT NULL,
    change_type TEXT NOT NULL CHECK (change_type IN ('Created', 'Modified', 'Deleted')),
    old_hash TEXT,
    new_hash TEXT,
    permission TEXT CHECK (permission IN ('Read', 'Write', 'Execute')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_file_logs_agent FOREIGN KEY (agent_id) REFERENCES agents(agent_id) ON DELETE CASCADE,
    PRIMARY KEY (file_log_id, created_at)
);

CREATE TABLE IF NOT EXISTS logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    detail TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_application_agent_id ON applications(agent_id);

CREATE INDEX IF NOT EXISTS idx_process_logs_agent_created_at ON process_logs(agent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_network_logs_agent_created_at ON network_logs(agent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_file_logs_agent_created_at ON file_logs(agent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_logs_detail ON logs USING gin (to_tsvector('simple', detail));

SELECT create_hypertable('process_logs', 'created_at', if_not_exists => TRUE);

SELECT create_hypertable('network_logs', 'created_at', if_not_exists => TRUE);

SELECT create_hypertable('file_logs', 'created_at', if_not_exists => TRUE);