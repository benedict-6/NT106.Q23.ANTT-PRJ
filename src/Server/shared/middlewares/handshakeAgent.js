// Middleware xác thực Session Token cho các request từ Agent (upload data)
// Agent gửi session_token trong header Authorization sau khi handshake thành công

import pool from '../database/connect.js';

const verifyAgentSession = async (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        return res.status(401).json({ message: 'Từ chối truy cập! Không tìm thấy Session Token.' });
    }

    const sessionToken = authHeader.split(' ')[1];

    if (!sessionToken) {
        return res.status(401).json({ message: 'Token format không hợp lệ.' });
    }

    try {
        const result = await pool.query(
            "SELECT * FROM agents WHERE current_session = $1 AND agent_status = 'Active'",
            [sessionToken]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Session Token không hợp lệ hoặc đã hết hạn.' });
        }

        const agent = result.rows[0];

        // Cập nhật last_active
        await pool.query(
            "UPDATE agents SET last_active = NOW() WHERE agent_id = $1",
            [agent.agent_id]
        );

        // Gắn thông tin agent vào request để controller dùng
        req.agent = agent;

        next();
    } catch (err) {
        console.error('Lỗi xác thực Agent Session:', err);
        res.status(500).json({ message: 'Lỗi server khi xác thực agent' });
    }
};

export default verifyAgentSession;
