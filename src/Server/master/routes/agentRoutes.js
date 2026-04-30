// Routes giao tiếp với Agent (handshake, upload data)
import express from 'express';
import agentController from '../controllers/agentAuthController.js';
import verifyAgentSession from '../../worker/middleware/verifyAgentSession.js';

const router = express.Router();

// POST /api/agent/handshake — Agent gửi tín hiệu xác thực HMAC-SHA256
router.post('/handshake', agentController.handshake);

export default router;
