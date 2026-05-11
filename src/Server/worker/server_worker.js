import express from "express";
import cors from "cors";
import { workerConfig } from "../shared/config/index.js";
import InitSocket from "./socket_client/init_socket.js";
import { createServer } from "http";

import verifyAgentSession from "./middleware/verifyAgentSession.js"

InitSocket(workerConfig.masterWS)

const app = express();
const httpServer = createServer(app);
app.use(cors());
app.use(express.json());

import { sendToMaster } from "./socket_client/services/serviceMasterSocket.js";

// POST /api/agent/upload — Agent gửi dữ liệu (bảo vệ bởi session token)
app.use("/api/agent/upload", verifyAgentSession, (req, res) => {
    // Lấy dữ liệu log từ agent
    const logData = req.body;
    
    // Gửi dữ liệu về master thông qua websocket
    sendToMaster({
        type: 'AGENT_LOG',
        payload: logData
    });
    
    res.sendStatus(200);
});

// Khởi động Server
const PORT = process.env.PORT_WORKER1 || process.env.PORT_WORKER2 || process.env.PORT_WORKER3 || process.env.PORT_WORKER4 || 3001;

httpServer.listen(PORT, () => {
    console.log(`Server Worker running on port ${PORT}`);
});
