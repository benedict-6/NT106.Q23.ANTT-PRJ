import crypto from 'crypto';
import pool from "../../shared/database/connect.js";
import { GCMdecrypt } from '../../shared/utils/cryptoUtils.js';
import jwt from "jsonwebtoken";
import { activeUIs } from '../socket_server/handlers/uiHandler.js';
import { activeWorkers } from '../socket_server/handlers/workerHandler.js';


const agentController = {
    handshake: async (req, res) => {
        const { agent_id, mac_address, timestamp, signature } = req.body;

        //Payload = MAC_Address + "|" + Timestamp
        //Signature = Hash(Payload, secret_key) dung HMAC-SHA256

        try {
            // ==========================================
            // LỚP PHÒNG THỦ 1: CHỐNG REPLAY ATTACK
            // ==========================================
            const currentTime = Date.now();
            const clientTime = parseInt(timestamp, 10);

            // Tính độ lệch thời gian giữa Master và Agent
            const timeDiff = Math.abs(currentTime - clientTime);

            // Cửa sổ thời gian: 30 giây (30000 ms). 
            // Nếu gói tin cũ hơn 30s -> Bị bắt lại trên đường truyền -> Loại!
            if (timeDiff > 30000) {
                console.warn(`[REPLAY ATTACK] Phát hiện gói tin cũ từ Agent: ${agent_id}`);
                return res.status(401).json({ message: 'Gói tin đã hết hạn!' });
            }

            const result = await pool.query(
                "SELECT * FROM agents WHERE agent_id = $1",
                [agent_id]
            );
            const agent = result.rows[0];

            if (!agent) {
                return res.status(401).json({ message: 'Agent không tồn tại hoặc đã bị khóa!' });
            }

            const payload = `${mac_address}|${timestamp}`;
            const cipherObject = {
                encryptedData: agent.secret_key,
                iv: agent.secret_key_iv,
                authTag: agent.secret_key_auth_tag
            }
            const rawKey = GCMdecrypt(cipherObject);

            const expectedSignature = crypto.createHmac('sha256', rawKey).update(payload).digest('hex');

            // Không dùng toán tử "===" để so sánh chuỗi băm
            // Chuyển về buffer và dùng timingSafeEqual để chống timing attack

            const expectBuffer = Buffer.from(expectedSignature);
            const receiveBuffer = Buffer.from(signature);

            if (expectBuffer.length !== receiveBuffer.length || !crypto.timingSafeEqual(expectBuffer, receiveBuffer)) {
                console.warn(`[CẢNH BÁO] Phát hiện mạo danh trên Agent: ${agent_id}`);
                return res.status(401).json({ message: 'Chữ ký không hợp lê. Từ chối truy cập!' });
            }


            // Sinh Session Token ngẫu nhiên
            const sessionToken = jwt.sign({ agent_id: agent.agent_id }, process.env.JWT_SECRET_SESSION_AGENT);

            // Lưu Session Token vào DB + cập nhật trạng thái online + luôn cập nhật hostname từ Agent
            await pool.query(
                `UPDATE agents SET current_session = $1, last_active = NOW(), 
                 hostname = COALESCE($3, hostname),
                 mac_address = $4, agent_status = 'online'
                 WHERE agent_id = $2`,
                [sessionToken, agent_id, req.body.hostname || null, mac_address || null]
            );

            // Gửi key sang cho các worker lưu RAM
            const keyMessage = JSON.stringify({
                type: 'NEW_AGENT_KEY',
                agent_id: agent_id,
                secret_key: rawKey
            });
            activeWorkers.forEach(ws => {
                if (ws.readyState === 1) ws.send(keyMessage);
            });

            // Gửi sự kiện cho UI thông qua WebSocket native (nếu có hệ thống activeUIs)
            // Ví dụ: activeUIs.forEach(uiClient => uiClient.send(JSON.stringify({ type: 'AGENT_CONNECTED', payload: agent_id })));

            res.status(200).json({
                message: 'OK!',
                session_token: sessionToken
            });

        } catch (err) {
            console.error('Lỗi Handshake Agent:', err);
            res.status(500).json({ message: 'Lỗi máy chủ Master Node' });
        }
    }
};

// Cơ chế kiểm tra agent timeout sau 10 phút
setInterval(async () => {
    try {
        const res = await pool.query(`
            UPDATE agents 
            SET agent_status = 'offline' 
            WHERE agent_status != 'offline' AND last_active < NOW() - INTERVAL '10 minutes'
            RETURNING agent_id
        `);
        if (res.rowCount > 0) {
            console.log(`[!] Cập nhật ${res.rowCount} agents thành offline do timeout > 10 phút`);
            const payload = res.rows.map(r => r.agent_id);
            for (const ui of activeUIs) {
                if (ui.readyState === 1) { // WebSocket.OPEN
                    ui.send(JSON.stringify({ type: 'AGENTS_DISCONNECTED', payload }));
                }
            }
        }
    } catch (err) {
        console.error('Lỗi kiểm tra agent connection timeout:', err);
    }
}, 60 * 1000); // Check every minute

export default agentController;