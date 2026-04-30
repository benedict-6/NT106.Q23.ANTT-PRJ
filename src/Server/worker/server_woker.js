import express from "express";
import cors from "cors";

import dotenv from "dotenv";
dotenv.config();

import { createServer } from "http";

import verifyAgentSession from "./middleware/verifyAgentSession.js"

const app = express();
const httpServer = createServer(app);
app.use(cors());
app.use(express.json());

// POST /api/agent/upload — Agent gửi dữ liệu (bảo vệ bởi session token)
app.use("api/agent/upload", verifyAgentSession, (req, res) => {
    res.sendStatus(200);
});



// Khởi động Server
const PORT = process.env.PORT_WORKER || 3001;

httpServer.listen(PORT, () => {
    console.log(`Server Worker running on port ${PORT}`);
});
