// Routes giao tiếp với Agent (handshake, upload data)
import express from 'express';
import agentController from '../controllers/agentAuthController.js';
<<<<<<< HEAD
import verifyAgentSession from '../../worker/middleware/verifyAgentSession.js';
=======
import verifyAgentSession from '../Middleware/verifyAgentSession.js';
>>>>>>> origin

const router = express.Router();

// POST /api/agent/handshake — Agent gửi tín hiệu xác thực HMAC-SHA256
router.post('/handshake', agentController.handshake);

<<<<<<< HEAD
=======
// POST /api/agent/upload — Agent gửi dữ liệu (bảo vệ bởi session token)
router.post('/upload', verifyAgentSession, (req, res) => {
    res.sendStatus(200);
});

>>>>>>> origin
export default router;
