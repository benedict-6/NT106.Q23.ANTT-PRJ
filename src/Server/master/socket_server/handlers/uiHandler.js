import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
//websocket

// Danh bạ lưu các kết nối UI đang sống (Active UIs)
export const activeUIs = new Set();

export default function UIHandler(port) {
    const wss = new WebSocketServer({ port });

    wss.on('connection', (ws, req) => {
        console.log(`[+] Có một UI vừa kết nối tới cổng ${port}... Đang chờ Token xác thực.`);

        const authTimeout = setTimeout(() => {
            console.log(`[!] Báo động: UI không chịu xác thực. Đang hủy...`);
            ws.close(4001, "Timeout: Không nhận được token");
        }, 5000);

        // LISTEN
        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message);

                // ĐĂNG KÝ
                if (data.type === 'REGISTER_UI') {
                    const token = data.token;

                    if (!token) {
                        ws.close(4003, "Forbidden: Thiếu Token");
                        return;
                    }

                    try {
                        const decoded = jwt.verify(token, process.env.JWT_SECRET);
                        ws.user = decoded;

                        clearTimeout(authTimeout); // Xác thực thành công 
                        activeUIs.add(ws); // LƯU VÀO DANH SÁCH

                        console.log(`[+] UI User [${decoded.userId}] đã vào mạng lưới. Tổng UI: ${activeUIs.size}`);
                        ws.send(JSON.stringify({ type: 'WELCOME', message: 'Xác thực WebSocket UI thành công!' }));
                    } catch (err) {
                        console.warn(`[!] UI gửi Token sai hoặc hết hạn.`);
                        ws.close(4003, "Forbidden: Token không hợp lệ");
                    }
                    return;
                }
            } catch (err) {
                console.error('Lỗi parse JSON từ UI:', err);
            }
        });

        // Khi UI đóng tab hoặc F5
        ws.on('close', () => {
            if (ws.user) {
                activeUIs.delete(ws); // Xóa khỏi danh bạ
                console.log(`[-] UI User [${ws.user.userId}] đã ngắt kết nối. Còn lại: ${activeUIs.size}`);
            }
        });
    });

    console.log(`Master Node WebSocket (UI-Listener) chạy trên cổng ${port}`);
    return wss;
}