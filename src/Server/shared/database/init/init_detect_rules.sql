INSERT INTO detection_rules (rule_id, rule_name, enabled, packet_level, category, data_source, conditions, threshold)
SELECT 
    (data->>'rule_id')::VARCHAR,
    (data->>'rule_name')::VARCHAR,
    (data->>'enabled')::BOOLEAN,
    (data->>'packet_level')::INT,
    (data->>'category')::VARCHAR,
    (data->>'type')::VARCHAR, 
    (data->'conditions')::JSONB,
    (data->'threshold')::JSONB
FROM jsonb_array_elements(:'json_data'::jsonb -> 'detection_rules') AS data
ON CONFLICT (rule_id) DO NOTHING;