import WebSocket, {WebSocketServer} from 'ws';

export default function initAgentListener(port, masterWs){
    //Code mẫu nhân data từ agent
    const wssForAgents = new WebSocketServer({port}); 

    wssForAgents.on('connection', (agentWs) => {
        console.log('[Worker] Có Agent kết nối vào Worker!');

        agentWs.on('message', async (msg) => {
            try {
                const data = JSON.parse(msg.toString());

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
}