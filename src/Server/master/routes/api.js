// Định tuyến API (RESTful)
import express from 'express'
import verifyJWT from '../Middleware/verifyJWT'
import authController from '../controllers/authController'
import dashController from '../controllers/dashController'


const router = express.Router();

// 1. Các API KHÔNG cần bảo vệ 
router.post('/login', authController.login);
router.post('/register', authController.register);

router.post('/agents/create', verifyJWT, dashController.createAgent);

router.get('/dashboard', verifyJWT, (req, res) => {

    // req.user.userId đã có sẵn nhờ Middleware truyền sang
    res.json({ message: "Đây là giao diện của hệ thống monitoring", user_id: req.user.userId });
});

export default router;