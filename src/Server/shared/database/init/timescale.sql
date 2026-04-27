CREATE EXTENSION IF NOT EXISTS timescaledb;

SELECT create_hypertable(
    'process_logs',
    'created_at',
     if_not_exists => TRUE
);

SELECT create_hypertable(
    'network_logs',
    'created_at',
     if_not_exists => TRUE
);

SELECT create_hypertable(
    'file_logs',
    'created_at',
     if_not_exists => TRUE
);

ALTER TABLE process_logs SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'agent_id'
);

SELECT add_compression_policy('process_logs', INTERVAL '7 days');

ALTER TABLE network_logs SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'agent_id'
);

SELECT add_compression_policy('network_logs', INTERVAL '7 days');