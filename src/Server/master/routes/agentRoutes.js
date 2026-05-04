// Routes giao tiếp với Agent (handshake, upload data)
import express from 'express';
import agentController from '../controllers/agentAuthController.js';

// Đường dẫn đã được sửa để lùi 2 bước ra ngoài thư mục shared
import verifyAgentSession from '../../shared/middlewares/verifyAgentSession.js';

const router = express.Router();

// POST /api/agent/handshake — Agent gửi tín hiệu xác thực HMAC-SHA256
router.post('/handshake', agentController.handshake);

// POST /api/agent/upload — Agent gửi dữ liệu (bảo vệ bởi session token)
router.post('/upload', verifyAgentSession, (req, res) => {
    res.sendStatus(200);
});

export default router;