// Master đóng vai trò Socket Server để các Worker nối vào
// Quản lý danh sách worker, đẩy rules xuống worker
import { Server } from "socket.io";

<<<<<<< HEAD
import { registeWorkerHandlers } from "./handlers/workerHandler.js";
import { registerUIHandlers } from "./handlers/uiHandler.js";

=======
>>>>>>> origin
export function initSocket(httpServer) {
    const io = new Server(httpServer, {
        cors: { origin: "*" }
    });
<<<<<<< HEAD
    // chưa có xác thực UI
    const workerIo = io.of("/worker"); // url/worker
    const uiIo = io.of("/ui"); // url/ui

    workerIo.on("connection", (socket) => {
        console.log("Worker connected");

        registeWorkerHandlers(workerIo, socket);
    });

    uiIo.on("connection", (socket) => {
        console.log("UI connected");

        registerUIHandlers(uiIo, socket);
=======

    io.on("connection", (socket) => {
        console.log(`[SOCKET.IO] Client: ${socket.id}`);

        socket.on("join", (userId) => {
            socket.join(`user:${userId}`);
            console.log(`[SOCKET.IO] User ${userId} joined`);
        });

        socket.on("disconnect", () => {
            console.log(`[SOCKET.IO] Disconnect: ${socket.id}`);
        });
>>>>>>> origin
    });

    return io;
}