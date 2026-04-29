// test server
import express from "express";
import dotenv from "dotenv";

dotenv.config();

import pool from "./shared/database/connect.js";

// Import Middlewares
import verifyJWT from "./master/Middleware/verifyJWT.js";

// Import Controllers
import authController from "./master/controllers/authController.js";
import dashController from "./master/controllers/dashController.js";
import agentController from "./master/controllers/agentAuthController.js";
const app = express();
app.use(express.json());

app.post("/api/auth/register", authController.register);
app.post("/api/auth/login", authController.login);

app.post("/api/dashboard/agents/create", verifyJWT, dashController.createAgent);

app.post("/api/agent/handshake", agentController.handshake);

app.post("/api/agent/upload", (req, res) => {
    // Logic xử lý dữ liệu nhị phân hoặc log từ máy trạm
    console.log("Nhận dữ liệu từ Agent:", req.body);
    res.sendStatus(200);
});

const PORT = process.env.PORT;

pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error("Lỗi kết nối Database:", err);
        process.exit(1);
    }
    console.log("Kết nối Database thành công!");
    app.listen(PORT, () => {
        console.log(`Master Node đang chạy tại port ${PORT}`);
    });
});
