// Middleware xác thực Session Token cho các request từ Agent (upload data)
// Agent gửi session_token trong header Authorization sau khi handshake thành công

import jwt from 'jsonwebtoken';
import { sendToMaster } from '../socket_client/handlers/handlerMasterSocket.js';

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
        // Xác thực qua JWT (không cần hit DB liên tục)
        const decoded = jwt.verify(sessionToken, process.env.JWT_SECRET_SESSION_AGENT);

        // Báo cho Master ghi DB thông qua WebSocket
        sendToMaster({
            type: 'UPDATE_LAST_ACTIVE',
            payload: {
                agent_id: decoded.agent_id
            }
        });

        // Gắn thông tin agent vào request để controller dùng
        req.agent = { agent_id: decoded.agent_id };

        next();
    } catch (err) {
        console.error('Lỗi xác thực Agent Session:', err.message);
        res.status(401).json({ message: 'Session Token không hợp lệ hoặc đã hết hạn.' });
    }
};

export default verifyAgentSession;
