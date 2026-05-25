// Routes quản lý Dashboard (bảo vệ bởi JWT)
import express from 'express';
import verifyJWT from '../../shared/middlewares/verifyJWT.js';
import dashController from '../controllers/dashController.js';

const router = express.Router();

// POST /api/dashboard/agents/create — Tạo agent mới
router.post('/agents/create', verifyJWT, dashController.createAgent);

// GET /api/dashboard/agents — Lấy danh sách agents
router.get('/agents', verifyJWT, dashController.listAgents);

// GET /api/dashboard/alerts/download/:agent_id — Tải agent
router.get('/agents/download/:agent_id', verifyJWT, dashController.downloadAgentConfig);

// GET /api/dashboard/alerts — Lấy danh sách alerts mới nhất
router.get('/alerts', verifyJWT, dashController.listAlerts);

export default router;
