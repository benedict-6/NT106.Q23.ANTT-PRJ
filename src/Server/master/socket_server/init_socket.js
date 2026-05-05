import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { registeWorkerHandlers } from "./handlers/workerHandler.js";
import { registerUIHandlers } from "./handlers/uiHandler.js";

export function initSocket(httpServer) {
    const io = new Server(httpServer, {
        cors: { origin: "http://localhost:3000" } 
    });

    const workerIo = io.of("/worker"); 
    const uiIo = io.of("/ui"); 

    workerIo.on("connection", (socket) => {
        console.log("[SOCKET.IO] Worker connected to /worker");
        registeWorkerHandlers(workerIo, socket);
    });

    // ==========================================
    // QUÉT THẺ CHO KHU VỰC UI
    // ==========================================
    uiIo.use((socket, next) => {
        const token = socket.handshake.auth.token;

        if (!token) {
            console.log("🔴 [Socket UI] Chặn: Không có Token.");
            return next(new Error("Authentication error: Missing token"));
        }

        try {
            // Kiểm tra token bằng chìa khóa của Server
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Lưu thông tin người dùng (userId, _role) vào biến socket
            socket.user = decoded; 
            next(); // Xác thực thành công, cho phép vào!
        } catch (err) {
            console.log("🔴 [Socket UI] Chặn: Token sai hoặc hết hạn.");
            return next(new Error("Authentication error: Invalid token"));
        }
    });

    // ==========================================
    // UI ĐÃ QUA CỬA BẢO VỆ THÀNH CÔNG
    // ==========================================
    uiIo.on("connection", (socket) => {
        // Log ra xem ai đang kết nối (ví dụ: userId)
        console.log(`🟢 [SOCKET.IO] UI connected to /ui | UserID: ${socket.user.userId}`);
        
        registerUIHandlers(uiIo, socket);

        socket.on("disconnect", () => {
            console.log(`🔴 [SOCKET.IO] UI ngắt kết nối: ${socket.id}`);
        });
    });


    return io;
}