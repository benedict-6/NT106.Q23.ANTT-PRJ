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
import initSocket from './socket_server/init_socket.js';

// Import Routes
import authRoutes from "./routes/authRoutes.js";
import dashRoutes from "./routes/dashRoutes.js";
import agentRoutes from "./routes/agentRoutes.js";

// Khởi tạo Express
const app = express();
const httpServer = createServer(app);

// // Middlewares
app.use(cors());
app.use(express.json());

// Khởi động các WebSockets
initSocket(process.env.PORT_SOCKET_WORKER || 6000, process.env.PORT_SOCKET_UI || 6001);


// Route Mounting — Mỗi nhóm chức năng là một file riêng
app.use('/api/auth', authRoutes);           // Đăng ký / Đăng nhập UI
app.use('/api/dashboard', dashRoutes);      // Quản lý Agent
app.use('/api/agent', agentRoutes);         // Giao tiếp Agent 


pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error("Lỗi kết nối Database:", err);
        process.exit(1);
    }
    else {
        console.log("Kết nối database thành công!");
    }

    httpServer.listen(masterConfig.port, () => {
        console.log(`Master Node đang chạy tại ${masterConfig.serverURL}`);
    });
});