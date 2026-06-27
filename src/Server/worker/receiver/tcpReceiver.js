import net from 'net';
import jwt from 'jsonwebtoken';
import { keyCache } from '../middleware/verifyAgentSession.js';
import { sendToMaster } from '../socket_client/services/serviceMasterSocket.js';
import { decryptAgentPayload } from '../engine/decodedRawData.js';
import {
    handleAgentFimReport,
    handleAgentNetProReport,
    handleAgentLogReport,
    handleAgentSoftwareReport
} from '../engine/handleAgentRule.js';

// Map để lưu trữ danh sách socket đang hoạt động tương ứng với mỗi agent_id
// Cho phép Server có thể chủ động gửi gói tin ngược lại cho Agent bất kỳ lúc nào
export const activeAgentSockets = new Map();

/**
 * Bộ phân tách gói tin TCP (Framing Parser)
 * Giúp giải quyết triệt để lỗi dính gói (Sticky packet) hoặc vỡ gói (Half packet) khi truyền luồng byte thô qua TCP.
 * 
 * Định dạng Frame:
 *   [1 byte: Type] + [4 bytes: Length (Big-Endian)] + [N bytes: Payload]
 * 
 * Các loại gói tin (Type):
 *   - 0x01: Auth Request (Chứa Session Token từ Agent)
 *   - 0x02: Data Payload (Chứa batch dữ liệu đã mã hóa và nén từ Agent)
 *   - 0x03: Ping (Keep-alive từ Agent)
 *   - 0x04: Auth Response (Server gửi xác nhận: 0x00 thành công, 0x01 thất bại)
 *   - 0x05: Pong (Phản hồi Keep-alive từ Server)
 */
class SocketFrameParser {
    constructor(onFrame) {
        this.onFrame = onFrame; // Callback xử lý khi đọc đủ 1 Frame hoàn chỉnh
        this.buffer = Buffer.alloc(0);
        this.isProcessing = false;
    }

    append(chunk) {
        // Cộng dồn chunk nhận được từ socket vào buffer tạm thời
        this.buffer = Buffer.concat([this.buffer, chunk]);
        this.process();
    }

    async process() {
        if (this.isProcessing) return;
        this.isProcessing = true;
        try {
        while (true) {
            // Header tối thiểu phải dài 5 bytes (1 byte Type + 4 bytes Length)
            if (this.buffer.length < 5) {
                break;
            }

            const type = this.buffer.readUInt8(0);
            const length = this.buffer.readUInt32BE(1);

            // Kiểm tra xem Buffer đã nhận đủ toàn bộ Payload hay chưa
            if (this.buffer.length < 5 + length) {
                break; // Chưa đủ dữ liệu, chờ nhận thêm chunk tiếp theo
            }

            // Trích xuất Payload hoàn chỉnh của gói tin hiện tại
            const payload = this.buffer.subarray(5, 5 + length);

            // Cắt phần dữ liệu đã xử lý ra khỏi Buffer
            this.buffer = this.buffer.subarray(5 + length);

            try {
                await this.onFrame(type, payload);
            } catch (err) {
                console.error("[TCP Frame Parser] Lỗi xử lý callback:", err);
            }
        }
        } finally {
            this.isProcessing = false;
        }
    }
}

/**
 * Khởi tạo TCP Socket Server tiếp nhận dữ liệu từ các Agent
 */
export function createTcpServer() {
    const server = net.createServer((socket) => {
        let authenticated = false;
        let agentId = null;

        // Khởi tạo parser cho socket hiện tại
        const parser = new SocketFrameParser(async (type, payload) => {
            if (type === 0x01) {
                // Xử lý gói tin Auth Request (Mã 0x01)
                const sessionToken = payload.toString('utf8');
                try {
                    // Giải mã JWT session token để xác định agent_id
                    const decoded = jwt.verify(sessionToken, process.env.JWT_SECRET_SESSION_AGENT);
                    agentId = decoded.agent_id;

                    // Cập nhật trạng thái hoạt động lên Master Node qua WebSocket
                    sendToMaster({
                        type: 'UPDATE_LAST_ACTIVE',
                        payload: { agent_id: agentId }
                    });

                    // Lấy secret_key trong bộ nhớ tạm RAM (do Master sync qua)
                    const secretKey = keyCache.get(agentId);
                    if (!secretKey) {
                        console.error(`[TCP Auth] Không tìm thấy secret key trong cache cho agent: ${agentId}`);
                        // Trả về Auth Response: Lỗi thiếu key (Mã 0x01)
                        sendAuthResponse(socket, 0x01);
                        socket.destroy();
                        return;
                    }

                    authenticated = true;
                    activeAgentSockets.set(agentId, socket);
                    console.log(`[TCP Server] Xác thực thành công Agent: ${agentId}`);

                    // Trả về Auth Response: Thành công (Mã 0x00)
                    sendAuthResponse(socket, 0x00);
                } catch (err) {
                    console.error('[TCP Auth] Token không hợp lệ:', err.message);
                    // Trả về Auth Response: Token sai/hết hạn (Mã 0x02)
                    sendAuthResponse(socket, 0x02);
                    socket.destroy();
                }
            }
            else if (type === 0x02) {
                // Xử lý gói tin Data Payload (Mã 0x02)
                if (!authenticated || !agentId) {
                    console.warn('[TCP Server] Cảnh báo: Socket chưa xác thực cố gắng gửi dữ liệu!');
                    socket.destroy();
                    return;
                }

                const secretKey = keyCache.get(agentId);
                if (!secretKey) {
                    console.error(`[TCP Server] Lỗi: Mất khóa AES của Agent ${agentId} giữa phiên kết nối.`);
                    socket.destroy();
                    return;
                }

                // Cập nhật trạng thái hoạt động cho Master Node
                sendToMaster({
                    type: 'UPDATE_LAST_ACTIVE',
                    payload: { agent_id: agentId }
                });

                // Giải mã và giải nén payload
                const records = await decryptAgentPayload(payload, secretKey);
                if (records) {
                    console.log(`[TCP Server] Nhận thành công batch gồm ${records.length} bản ghi từ Agent ${agentId}`);
                    // Xử lý tuần tự (hoặc đồng bộ hóa) các bản ghi qua công cụ rules
                    for (const record of records) {
                        const decodedData = { body: record };
                        try {
                            if (decodedData.body.type === 'file_integrity') {
                                await handleAgentFimReport(decodedData, agentId);
                            } else if (decodedData.body.type === 'log_monitoring') {
                                await handleAgentLogReport(decodedData, agentId);
                            } else if (decodedData.body.type === 'net_pro') {
                                await handleAgentNetProReport(decodedData, agentId);
                            } else if (decodedData.body.type === 'software_list') {
                                await handleAgentSoftwareReport(decodedData, agentId);
                            }
                        } catch (err) {
                            console.error('[TCP Server] Lỗi khi xử lý rules:', err);
                        }
                    }
                }
            }
            else if (type === 0x03) {
                // Xử lý gói tin Ping (Mã 0x03)
                if (authenticated) {
                    sendToMaster({
                        type: 'UPDATE_LAST_ACTIVE',
                        payload: { agent_id: agentId }
                    });
                }
                // Trả về gói tin Pong (Mã 0x05)
                const pongFrame = Buffer.alloc(5);
                pongFrame.writeUInt8(0x05, 0);
                pongFrame.writeUInt32BE(0, 1);
                socket.write(pongFrame);
            }
            else {
                console.warn(`[TCP Server] Nhận gói tin không xác định loại (Type): ${type}`);
            }
        });

        // Đọc dữ liệu từ socket và đưa vào parser
        socket.on('data', (chunk) => {
            parser.append(chunk);
        });

        // Xử lý lỗi kết nối
        socket.on('error', (err) => {
            console.error(`[TCP Server] Lỗi Socket trên Agent ${agentId || 'Chưa xác thực'}:`, err.message);
        });

        // Xử lý dọn dẹp khi kết nối đóng
        socket.on('close', () => {
            if (agentId && activeAgentSockets.get(agentId) === socket) {
                activeAgentSockets.delete(agentId);
                console.log(`[TCP Server] Đã ngắt kết nối với Agent: ${agentId}`);
            }
        });
    });

    return server;
}

/**
 * Hàm phụ trợ gửi Auth Response
 */
function sendAuthResponse(socket, statusByte) {
    const frame = Buffer.alloc(6);
    frame.writeUInt8(0x04, 0); // Type: 0x04 (Auth Response)
    frame.writeUInt32BE(1, 1); // Length: 1 byte
    frame.writeUInt8(statusByte, 5); // Payload: mã trạng thái (0x00 thành công, 0x01/0x02 thất bại)
    socket.write(frame);
}

/**
 * Hàm gửi Alert về cho Agent qua TCP Socket đang active (Type: 0x06)
 * @param {string} agentId 
 * @param {Object} alertInfo 
 */
export function sendAlertToAgent(agentId, alertInfo) {
    const socket = activeAgentSockets.get(agentId);
    if (!socket) {
        // Agent không online hoặc không sử dụng kết nối TCP này
        return;
    }

    try {
        const payloadStr = JSON.stringify(alertInfo);
        const payloadBuf = Buffer.from(payloadStr, 'utf8');

        // Cấu trúc gói tin Alert: [1 byte: Type (0x06)] + [4 bytes: Length] + [N bytes: Payload]
        const frame = Buffer.alloc(5 + payloadBuf.length);
        frame.writeUInt8(0x06, 0); // Type: 0x06 (Alert Notification)
        frame.writeUInt32BE(payloadBuf.length, 1); // Length (Big-Endian)
        payloadBuf.copy(frame, 5); // Payload

        socket.write(frame);
        console.log(`[TCP Server] Đã gửi cảnh báo (Type 0x06) về cho Agent ${agentId}: ${alertInfo.rule_name}`);
    } catch (err) {
        console.error(`[TCP Server] Lỗi khi gửi Alert tới Agent ${agentId}:`, err.message);
    }
}
