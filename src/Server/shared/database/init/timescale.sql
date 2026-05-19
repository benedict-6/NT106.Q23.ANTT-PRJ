CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create Hypertables
SELECT create_hypertable('net_pro', 'created_at', if_not_exists => TRUE);
SELECT create_hypertable('file_integrity', 'created_at', if_not_exists => TRUE);
SELECT create_hypertable('log_monitoring', 'created_at', if_not_exists => TRUE);
SELECT create_hypertable('rule_alert', 'created_at', if_not_exists => TRUE);

-- Configure Compression for net_pro
ALTER TABLE net_pro SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'agent_id'
);
SELECT add_compression_policy('net_pro', INTERVAL '7 days');

-- Configure Compression for file_integrity
ALTER TABLE file_integrity SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'agent_id'
);
SELECT add_compression_policy('file_integrity', INTERVAL '7 days');

-- Configure Compression for log_monitoring
ALTER TABLE log_monitoring SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'agent_id'
);
SELECT add_compression_policy('log_monitoring', INTERVAL '7 days');