// Định tuyến API (RESTful)
import express from 'express'
import verifyJWT from '../Middleware/verifyJWT'
import authController from '../controllers/authController'

const router = express.Router();

// 1. Các API KHÔNG cần bảo vệ 
router.post('/login', authController.login);
router.post('/register', authController.register);

// 2. Các API CẦN bảo vệ (Phải qua ải verifyJWT)
router.get('/dashboard', verifyJWT, (req, res) => {
    // Nếu vào được đây, tức là JWT đã hợp lệ
    // req.user.userId đã có sẵn nhờ Middleware truyền sang
    res.json({ message: "Đây là giao diện của hệ thống monitoring", user_id: req.user.userId });
});

export default router;