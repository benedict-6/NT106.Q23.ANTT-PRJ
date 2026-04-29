// Master đóng vai trò Socket Server để các Worker nối vào
// Quản lý danh sách worker, đẩy rules xuống worker
import { Server } from "socket.io";

export function initSocket(httpServer) {
    const io = new Server(httpServer, {
        cors: { origin: "*" }
    });

    io.on("connection", (socket) => {
        console.log(`[SOCKET.IO] Client: ${socket.id}`);

        socket.on("join", (userId) => {
            socket.join(`user:${userId}`);
            console.log(`[SOCKET.IO] User ${userId} joined`);
        });

        socket.on("disconnect", () => {
            console.log(`[SOCKET.IO] Disconnect: ${socket.id}`);
        });
    });

    return io;
}