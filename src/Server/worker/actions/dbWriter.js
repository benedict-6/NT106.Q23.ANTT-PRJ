// ---> TẤT CẢ LOGIC CỦA WORKER NODE
// Xử lý đầu ra sau khi phân tích xong
// Lưu log sạch/alert xuống DB

import pool from "../../shared/database/connect.js";

/**
 * Ghi log/alert đã lọc thành công vào PostgreSQL Database
 * @param {Object} parsedData Dữ liệu log đã chuẩn hóa của Agent
 * @returns {Promise<{id: string|number, createdAt: string}|null>} Trả về ID và thời gian của bản ghi
 */
export const writeLogToDB = async (parsedData) => {
    if (!parsedData || !parsedData.agent_id) {
        console.warn("[DBWriter] Không thể ghi DB: Dữ liệu thiếu thông tin agent_id.");
        return null;
    }

    const { agent_id, type, payload } = parsedData;
    const createdAt = new Date().toISOString();

    try {
        if (type === 'file_integrity') {
            let event_type = 'MODIFIED';
            if (payload.event === 'ADDED') event_type = 'ADDED';
            else if (payload.event === 'DELETED') event_type = 'DELETED';

            const file = payload.file || payload.file_path || 'N/A';
            const oldHash = payload.old_hash_sha256 || payload.old_hash || null;
            const newHash = payload.hash_sha256 || payload.new_hash || payload.current_hash || null;
            const permission = payload.permission || (payload.mode ? (payload.mode.includes('7') ? 'Execute' : 'Write') : 'Read');
            const uid = payload.uid !== undefined ? String(payload.uid) : null;
            const gid = payload.gid !== undefined ? String(payload.gid) : null;
            const inode = payload.inode !== undefined ? parseInt(payload.inode, 10) : null;
            const size = payload.size !== undefined ? parseInt(payload.size, 10) : null;
            const timestamp = payload.timestamp || null;
            const mtime = payload.mtime || null;

            const result = await pool.query(
                `INSERT INTO file_integrity (agent_id, file_path, event_type, old_hash, new_hash, _uid, gid, inode, _size, permission, _timestamp, mtime, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING file_log_id`,
                [agent_id, file, event_type, oldHash, newHash, uid, gid, inode, size, permission, timestamp, mtime, createdAt]
            );
            console.log(`[DBWriter] Đã ghi FIM log vào file_integrity cho Agent [${agent_id}]`);
            return { id: result.rows[0]?.file_log_id, createdAt };

        } else if (type === 'net_pro') {
            const event_type = payload.event || 'UNKNOWN';
            const pid = payload.pid !== undefined ? parseInt(payload.pid, 10) : null;
            const ppid = payload.ppid !== undefined ? parseInt(payload.ppid, 10) : null;
            const uid = payload.uid !== undefined ? String(payload.uid) : null;
            const gid = payload.gid !== undefined ? String(payload.gid) : null;
            const comm = payload.comm || null;
            const file_path = payload.file_path || payload.filename || null;
            const exit_code = payload.exit_code !== undefined ? parseInt(payload.exit_code, 10) : null;
            const src_ip = payload.src_ip || payload.saddr || null;
            const dest_ip = payload.dst_ip || payload.daddr || null;
            const protocol = payload.protocol || null;
            const sport = payload.sport !== undefined ? parseInt(payload.sport, 10) : null;
            const dport = payload.dport !== undefined ? parseInt(payload.dport, 10) : null;
            const state = payload.state || null;
            const timestamp = payload.timestamp || null;

            const result = await pool.query(
                `INSERT INTO net_pro (agent_id, event_type, pid, ppid, _uid, gid, comm, file_path, exit_code, src_ip, dest_ip, protocol, sport, dport, _state, _timestamp, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING net_pro_id`,
                [agent_id, event_type, pid, ppid, uid, gid, comm, file_path, exit_code, src_ip, dest_ip, protocol, sport, dport, state, timestamp, createdAt]
            );
            console.log(`[DBWriter] Đã ghi NetPro log vào net_pro cho Agent [${agent_id}]`);
            return { id: result.rows[0]?.net_pro_id, createdAt };

        } else if (type === 'log_monitoring') {
            const filePath = payload.file_path || payload.file || 'N/A';
            const timestamp = payload.timestamp || null;
            const service = payload.service || payload._service || null;
            const pid = payload.pid !== undefined ? parseInt(payload.pid, 10) : null;
            const action = payload.action || payload._action || null;
            const srcIp = payload.src_ip || null;
            const _user = payload.user || payload._user || null;
            const port = payload.port !== undefined ? parseInt(payload.port, 10) : null;
            const typeLog = payload.type_log || payload.log_type || null;

            const result = await pool.query(
                `INSERT INTO log_monitoring (agent_id, file_path, _timestamp, _service, pid, _action, src_ip, _user, port, type_log, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING log_monitoring_id`,
                [agent_id, filePath, timestamp, service, pid, action, srcIp, _user, port, typeLog, createdAt]
            );
            console.log(`[DBWriter] Đã ghi Log Monitoring vào log_monitoring cho Agent [${agent_id}]`);
            return { id: result.rows[0]?.log_monitoring_id, createdAt };

        } else if (type === 'software_list') {
            const swName = payload.name || payload.software_name || 'Unknown';
            const version = payload.version || payload._version || 'Unknown';
            const installDate = payload.install_date || null;
            const vendor = payload.vendor || payload.publisher || null;

            const result = await pool.query(
                `INSERT INTO applications (agent_id, software_name, _version)
                 VALUES ($1, $2, $3) RETURNING app_id`,
                [agent_id, swName, version]
            );
            console.log(`[DBWriter] Đã ghi Software vào applications cho Agent [${agent_id}]`);
            return { id: result.rows[0]?.app_id, createdAt };
        }
    } catch (err) {
        console.error(`[DBWriter] Lỗi khi ghi dữ liệu vào CSDL cho Agent [${agent_id}]:`, err.message);
        return null;
    }
};

/**
 * Ghi log alert vào bảng rule_alert với khóa ngoại đầy đủ (Map với ID tự sinh và createdAt)
 */
export const saveRuleAlert = async (triggeredAlerts, alertObj, logId, createdAtData, logType) => {
    if (triggeredAlerts && triggeredAlerts.length > 0) {
        for (const alert of triggeredAlerts) {
            let net_pro_id = null, net_pro_created_at = null;
            let file_log_id = null, file_integrity_created_at = null;
            let log_monitoring_id = null, log_monitoring_created_at = null;
            let app_id = null;

            if (logType === 'net_pro') {
                net_pro_id = logId;
                net_pro_created_at = createdAtData;
            } else if (logType === 'file_integrity') {
                file_log_id = logId;
                file_integrity_created_at = createdAtData;
            } else if (logType === 'log_monitoring') {
                log_monitoring_id = logId;
                log_monitoring_created_at = createdAtData;
            } else if (logType === 'software_list' || logType === 'software_vulnerability') {
                app_id = logId;
            }

            await pool.query(
                `INSERT INTO rule_alert (
                    agent_id, rule_id, packet_level, alert, created_at,
                    net_pro_id, net_pro_created_at,
                    file_log_id, file_integrity_created_at,
                    log_monitoring_id, log_monitoring_created_at,
                    app_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                [
                    alert.agent_id, alert.rule_id, alert.packet_level, alertObj || false, new Date().toISOString(),
                    net_pro_id, net_pro_created_at,
                    file_log_id, file_integrity_created_at,
                    log_monitoring_id, log_monitoring_created_at,
                    app_id
                ]
            );
        }
    }
};

export const saveRuleAlertSoftware = async (cveList, agent_id, app_id) => {
    if (cveList && cveList.length > 0) {
        for (const cve of cveList) {

            // 1. Tự động đăng ký CVE như một Rule vào bảng detection_rules (Nếu chưa có)
            // Tránh lỗi vi phạm khóa ngoại (Foreign Key) khi insert vào rule_alert
            await pool.query(
                `INSERT INTO detection_rules (rule_id, rule_name, packet_level, category, data_source)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (rule_id) DO NOTHING`,
                [cve.id, `CVE: ${cve.description.substring(0, 100)}...`, 15, 'CVE_Software', 'software_list']
            );

            // 2. Ghi cảnh báo vào bảng rule_alert
            await pool.query(
                `INSERT INTO rule_alert (
                    agent_id, rule_id, packet_level, alert, app_id
                ) VALUES ($1, $2, $3, $4, $5)`,
                [
                    agent_id, cve.id, 15, true, app_id
                ]
            );
        }
    }
};
