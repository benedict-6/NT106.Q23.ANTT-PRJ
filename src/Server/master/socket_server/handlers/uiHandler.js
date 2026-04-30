export function registerUIHandlers(io, socket) {

    socket.on("join", (userId) => {
        socket.join(`user:${userId}`);
    });

    socket.on("disconnect", () => {
        console.log("UI disconnected");
    });
}