import pool from '../../../shared/database/connect.js';

/**
 * Lấy toàn bộ dữ liệu thống kê tổng quan cho Dashboard UI
 * Dùng Promise.all để thực thi truy vấn song song, tối ưu tốc độ.
 */
export const getDashboardOverview = async () => {
    try {
        // Query song song để không bị nghẽn (Block) I/O
        const [agentsResult, alertsResult, statsResult] = await Promise.all([
            // 1. Lấy trạng thái của các Agents
            pool.query(`
                SELECT agent_id, hostname, ip_address, agent_status 
                FROM agents
            `),

            // 2. Lấy danh sách 50 cảnh báo mới nhất
            pool.query(`
                SELECT rule_alert_id, agent_id, rule_id, packet_level, alert, created_at 
                FROM rule_alert 
                ORDER BY created_at DESC 
                LIMIT 50
            `),

            // 3. Đếm tổng số cảnh báo từ trước đến nay
            pool.query(`
                SELECT COUNT(*) as total_alerts 
                FROM rule_alert
            `)
        ]);

        return {
            agents: agentsResult.rows,
            recentAlerts: alertsResult.rows,
            totalAlerts: parseInt(statsResult.rows[0].total_alerts, 10),
        };
    } catch (err) {
        console.error('[DashboardService] Lỗi khi truy vấn dữ liệu từ DB:', err.message);
        throw err; // Bắn lỗi lên Controller/Handler để xử lý
    }
};

const getTimeRangeInterval = (timeRange) => {
    switch (timeRange) {
        case '1':
        case '1m':
        case '1 minute':
            return "INTERVAL '1 minute'";
        case '30':
        case '30m':
        case '30 minute':
        case '30 minutes':
            return "INTERVAL '30 minutes'";
        case '24h':
        case '24 hours':
            return "INTERVAL '24 hours'";
        case '30d':
        case '30 day':
        case '30 days':
            return "INTERVAL '30 days'";
        case '90d':
        case '90 day':
        case '90 days':
            return "INTERVAL '90 days'";
        default:
            return null;
    }
};

/**
 * Lấy danh sách logs FIM từ database cho 1 agent hoặc tất cả agents
 */
export const getFimLogs = async (agentId, timeRange) => {
    try {
        let query = `SELECT file_log_id as id, agent_id, file_path, event_type, old_hash, new_hash, _uid, gid, inode, _size, permission, _timestamp as timestamp, mtime, created_at
                     FROM file_integrity`;
        const conditions = [];
        const params = [];

        if (agentId && agentId !== 'all') {
            params.push(agentId);
            conditions.push(`agent_id = $${params.length}`);
        }

        const interval = getTimeRangeInterval(timeRange);
        if (interval) {
            conditions.push(`_timestamp >= NOW() - ${interval}`);
        }

        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
        }

        query += ` ORDER BY created_at DESC LIMIT 1000`;
        const result = await pool.query(query, params);
        return result.rows;
    } catch (err) {
        console.error('[DashboardService] Lỗi khi lấy FIM logs từ DB:', err);
        throw err;
    }
};

/**
 * Lấy danh sách logs NetPro từ database cho 1 agent hoặc tất cả agents
 */
export const getNetProLogs = async (agentId, timeRange) => {
    try {
        let query = `SELECT net_pro_id as id, agent_id, event_type, pid, ppid, _uid, gid, comm, file_path, exit_code, src_ip, dest_ip, protocol, sport, dport, _state, _timestamp as timestamp, created_at
                     FROM net_pro`;
        const conditions = [];
        const params = [];

        if (agentId && agentId !== 'all') {
            params.push(agentId);
            conditions.push(`agent_id = $${params.length}`);
        }

        const interval = getTimeRangeInterval(timeRange);
        if (interval) {
            conditions.push(`_timestamp >= NOW() - ${interval}`);
        }

        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
        }

        query += ` ORDER BY created_at DESC LIMIT 1000`;
        const result = await pool.query(query, params);
        return result.rows;
    } catch (err) {
        console.error('[DashboardService] Lỗi khi lấy NetPro logs từ DB:', err);
        throw err;
    }
};

/**
 * Lấy danh sách logs Syslog/System từ database cho 1 agent hoặc tất cả agents
 */
export const getSyslogs = async (agentId, timeRange) => {
    try {
        let query = `SELECT log_monitoring_id as id, agent_id, file_path, _timestamp as timestamp, _service as service, pid, _action as action, src_ip, _user as "user", port, type_log, created_at
                     FROM log_monitoring`;
        const conditions = [];
        const params = [];

        if (agentId && agentId !== 'all') {
            params.push(agentId);
            conditions.push(`agent_id = $${params.length}`);
        }

        const interval = getTimeRangeInterval(timeRange);
        if (interval) {
            conditions.push(`_timestamp >= NOW() - ${interval}`);
        }

        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
        }

        query += ` ORDER BY created_at DESC LIMIT 1000`;
        const result = await pool.query(query, params);
        return result.rows;
    } catch (err) {
        console.error('[DashboardService] Lỗi khi lấy Syslogs từ DB:', err);
        throw err;
    }
};

/**
 * Lấy danh sách ứng dụng đã cài đặt từ database cho 1 agent hoặc tất cả agents
 */
export const getApplications = async (agentId, timeRange) => {
    try {
        let query = `SELECT app_id as id, agent_id, software_name, _version, _timestamp
                     FROM applications`;
        const conditions = [];
        const params = [];

        if (agentId && agentId !== 'all') {
            params.push(agentId);
            conditions.push(`agent_id = $${params.length}`);
        }

        const interval = getTimeRangeInterval(timeRange);
        if (interval) {
            conditions.push(`_timestamp >= NOW() - ${interval}`);
        }

        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
        }

        query += ` ORDER BY app_id DESC LIMIT 1000`;
        const result = await pool.query(query, params);
        return result.rows;
    } catch (err) {
        console.error('[DashboardService] Lỗi khi lấy Applications từ DB:', err);
        throw err;
    }
};

