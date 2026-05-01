// ====================================================
// SIEM Master Node — Entry Point
// server.js chỉ khởi tạo và trỏ đến các route modules
// ====================================================
import express from "express";
import { createServer } from "http";
import cors from "cors";

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// 1. Chỉ đường cho Server lùi 1 bước ra ngoài để tìm đúng file .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import { initSocket } from "./socket_server/init_socket.js";
import pool from "../shared/database/connect.js";

// Import Routes
import authRoutes from "./routes/authRoutes.js";
import dashRoutes from "./routes/dashRoutes.js";
import agentRoutes from "./routes/agentRoutes.js";

// Khởi tạo Express
const app = express();
const httpServer = createServer(app);

// Gọi hàm khởi tạo Socket
const io = initSocket(httpServer);
// Lưu io instance vào app để controller truy cập được
app.set('io', io);

// Middlewares
app.use(cors());
app.use(express.json());

// Route Mounting — Mỗi nhóm chức năng là một file riêng
app.use('/api/auth', authRoutes);           // Đăng ký / Đăng nhập UI
app.use('/api/dashboard', dashRoutes);      // Quản lý Agent
app.use('/api/agent', agentRoutes);         // Giao tiếp Agent 

// Khởi động Server (Đã nhận được biến môi trường)
const PORT = process.env.PORT_MASTER || 5000;

pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error("Lỗi kết nối Database:", err);
        process.exit(1);
    }

    httpServer.listen(PORT, () => {
        console.log(`Master Node đang chạy tại port ${PORT}`);
    });
});