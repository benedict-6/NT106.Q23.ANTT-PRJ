import { Server } from "socket.io";
import { registeWorkerHandlers } from "./handlers/workerHandler.js";
import { registerUIHandlers } from "./handlers/uiHandler.js";

export function initSocket(httpServer) {
    const io = new Server(httpServer, {
        cors: { origin: "*" }
    });

    const workerIo = io.of("/worker"); 
    const uiIo = io.of("/ui"); 

    workerIo.on("connection", (socket) => {
        console.log("[SOCKET.IO] Worker connected to /worker");
        registeWorkerHandlers(workerIo, socket);
    });

    uiIo.on("connection", (socket) => {
        console.log("[SOCKET.IO] UI connected to /ui");
        registerUIHandlers(uiIo, socket);
    });

    io.on("connection", (socket) => {
        console.log(`[SOCKET.IO] Client connected to root: ${socket.id}`);

        socket.on("join", (userId) => {
            socket.join(`user:${userId}`);
            console.log(`[SOCKET.IO] User ${userId} joined room user:${userId}`);
        });

        socket.on("disconnect", () => {
            console.log(`[SOCKET.IO] Disconnect: ${socket.id}`);
        });
    });

    return io;
}