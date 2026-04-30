// Master đóng vai trò Socket Server để các Worker nối vào
// Quản lý danh sách worker, đẩy rules xuống worker
import { Server } from "socket.io";

import { registeWorkerHandlers } from "./handlers/workerHandler.js";
import { registerUIHandlers } from "./handlers/uiHandler.js";

export function initSocket(httpServer) {
    const io = new Server(httpServer, {
        cors: { origin: "*" }
    });
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
    });

    return io;
}