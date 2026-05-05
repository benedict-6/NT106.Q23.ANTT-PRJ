// ====================================================
// SIEM Master Node — Entry Point
// server.js chỉ khởi tạo và trỏ đến các route modules
// ====================================================
import { masterConfig } from "../shared/config/index.js";
import express from "express";
import { createServer } from "http";
import cors from "cors";

import pool from "../shared/database/connect.js";

// Import Socket
import initWorkerWebSocket from './socket_server/handlers/workerHandler.js'

// Import Routes
import authRoutes from "./routes/authRoutes.js";
import dashRoutes from "./routes/dashRoutes.js";
import agentRoutes from "./routes/agentRoutes.js";

// Khởi tạo Express
const app = express();
const httpServer = createServer(app);

// // Gọi hàm khởi tạo Socket
// const io = initSocket(httpServer);
// // Lưu io instance vào app để controller truy cập được
// app.set('io', io);

// // Middlewares
app.use(cors());
app.use(express.json());

// Route Mounting — Mỗi nhóm chức năng là một file riêng
app.use('/api/auth', authRoutes);           // Đăng ký / Đăng nhập UI
app.use('/api/dashboard', dashRoutes);      // Quản lý Agent
app.use('/api/agent', agentRoutes);         // Giao tiếp Agent 


// Khởi động Server
const PORT = masterConfig.port || 3000;

// Khởi động socket Master - Worker
initWorkerWebSocket(6000);

pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error("Lỗi kết nối Database:", err);
        process.exit(1);
    }

    httpServer.listen(PORT, () => {
        console.log(`Master Node đang chạy tại port ${PORT}`);
    });
});