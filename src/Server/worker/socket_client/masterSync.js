// ---> TẤT CẢ LOGIC CỦA WORKER NODE
// Worker đóng vai trò Client kết nối lên Master
// Nhận rules mới từ Master, báo cáo tình trạng heartbeat
import WebSocket, {WebSocketServer} from 'ws';
import { worker } from '../../shared/config/index.js';

export default function initMasterWebSocket(url = 'ws://localhost:6000'){
    const MY_WORKER_ID = worker.ID1 || `WORKER-${Math.floor(Math.random() * 1000)}`;

    // Kết nối thẳng không cần chứng chỉ TLS
    const ws = new WebSocket('ws://localhost:6000');

    ws.on('open', () => {
        console.log('[+] Đã kết nối tới Master Node! Đang định danh..');

        ws.send(
            JSON.stringify({
                type: 'REGISTER_WORKER',
                worker_id: MY_WORKER_ID
            })
        );
    });

    //Code mẫu nhân data từ agent
    const wssForAgents = new WebSocketServer({ port: 7000 }); 

    wssForAgents.on('connection', (agentWs) => {
        console.log('[Worker] Có Agent kết nối vào Worker!');

        agentWs.on('message', async (message) => {
            try {
                const data = JSON.parse(message);

                // ĐIỀU PHỐI (ROUTING)
                switch (data.type) {
                    case 'FIM_REPORT':
                        // Truyền data và cái ống masterWs vào cho Handler xử lý
                        await handleAgentFimReport(data.payload, masterWs);
                        break;
                        
                    case 'SYSTEM_LOG':
                        // Tương lai bạn có thể tạo handleSystemLog(data.payload) ở một file khác
                        break;
                        
                    default:
                        console.log(`[Worker] Nhận gói tin không xác định: ${data.type}`);
                }

            } catch (err) {
                console.error('[Worker] Lỗi parse JSON từ Agent:', err.message);
            }
        });
    });

    ws.on('message', (message) => {
        console.log(`[Worker] Master phản hồi: ${message.toString()}`);
    });

    ws.on('error', (error) => {
        console.error('[!] Lỗi kết nối WebSocket:', error.message);
    });

    ws.on('close', () => {
        console.log('[-] Kết nối tới Master đã bị đóng');
    });
}

