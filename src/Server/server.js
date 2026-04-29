// ====================================================
// SIEM Master Node — Entry Point
// server.js chỉ khởi tạo và trỏ đến các route modules
// ====================================================
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

import pool from "./shared/database/connect.js";

// Import Routes
import authRoutes from "./master/routes/authRoutes.js";
import dashRoutes from "./master/routes/dashRoutes.js";
import agentRoutes from "./master/routes/agentRoutes.js";

// Khởi tạo Express + Socket.IO
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: "*" }
});

// Lưu io instance vào app để controller truy cập được
app.set('io', io);

// Middlewares
app.use(cors());
app.use(express.json());

// Route Mounting — Mỗi nhóm chức năng là một file riêng
app.use('/api/auth', authRoutes);           // Đăng ký / Đăng nhập UI
app.use('/api/dashboard', dashRoutes);      // Quản lý Agent (JWT protected)
app.use('/api/agent', agentRoutes);         // Giao tiếp Agent (Handshake + Upload)

// Socket.IO — Real-time cho Dashboard UI
io.on('connection', (socket) => {
    console.log(`[SOCKET.IO] Client kết nối: ${socket.id}`);

    // User join vào room riêng theo userId để nhận event agent
    socket.on('join', (userId) => {
        socket.join(`user:${userId}`);
        console.log(`[SOCKET.IO] User ${userId} joined room`);
    });

    socket.on('disconnect', () => {
        console.log(`[SOCKET.IO] Client ngắt kết nối: ${socket.id}`);
    });
});

// Khởi động Server
const PORT = process.env.PORT || 3000;

pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error("Lỗi kết nối Database:", err);
        process.exit(1);
    }

    httpServer.listen(PORT, () => {
        console.log(`Master Node đang chạy tại port ${PORT}`);
    });
});
