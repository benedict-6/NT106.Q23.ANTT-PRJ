import { workerConfig } from "../shared/config/index.js";
import InitSocket from "./socket_client/init_socket.js";
import { createTcpServer } from "./receiver/tcpReceiver.js";

// Khởi tạo kết nối WebSocket đến Master Node để đồng bộ hóa key và trạng thái
InitSocket(workerConfig.masterWS);

// Khởi tạo TCP Socket Server
const tcpServer = createTcpServer();

// Xác định PORT hoạt động của Worker
const PORT = process.env.PORT || process.env.PORT_WORKER1 || process.env.PORT_WORKER2 || process.env.PORT_WORKER3 || process.env.PORT_WORKER4 || 3001;

tcpServer.listen(PORT, () => {
    console.log(`TCP Server Worker running on port ${PORT}`);
});

