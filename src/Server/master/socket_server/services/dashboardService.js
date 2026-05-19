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
