import { WebSocketServer } from "ws";
//websocket
export function registerUIHandlers(io, socket) {

    socket.on("join", (userId) => {
        socket.join(`user:${userId}`);
    });

    socket.on("disconnect", () => {
        console.log("UI disconnected");
    });
}

export default function initUIWebSocketServer(port){
    wss = new WebSocketServer({port});

    wss.on('connection', (ws, req) =>{
        console.log("[Master] UI đã kết nối tới server");
        
    })
}