import bcrypt from 'bcryptjs';
import crypto, { sign } from 'crypto';
import pool from "../../shared/database/connect.js";
import AES_MASTER_KEY from "../../process.env.AES_MASTER_KEY"

function decrypt(cipherText, masterKey) {
    const decipher = crypto.createDecipheriv(
        'aes-256-gcm', 
        masterKey, 
        Buffer.from(cipherText.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(cipherText.tag, 'hex'));
    
    let decrypted = decipher.update(cipherText.content, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

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
                // Truy xuất phần tử đầu tiên của mảng -> [agent_id] là agent_id -> tránh dùng '"' + agent_id + '"' vì SQL injection
                "SELECT * FROM agents WHERE agent_id = $1 AND status = 'Active'",
                [agent_id]
            );
            const agent = result.rows[0];

            if (!agent) {
                return res.status(401).json({ message: 'Agent không tồn tại hoặc đã bị khóa!' });
            }

            const payload = `${mac_address}|${timestamp}`;

            const rawKey = decrypt(agent.secret_key, masterKey);

            const expectedSignature = crypto.createHmac('sha256', rawKey).update(payload).digest('hex');

            // Không dùng toán tử "===" để so sánh chuỗi băm
            // Chuyển về buffer và dùng timingSafeEqual để choongs timing attack

            const expectBuffer = Buffer.from(expectedSignature);
            const receiveBuffer = Buffer.from(signature);
            
            if (expectBuffer.length !== receiveBuffer.length || !crypto.timingSafeEqual(expectBuffer,receiveBuffer)) {
                console.warn(`[CẢNH BÁO] Phát hiện mạo danh trên Agent: ${agent_id}`);
                return res.status(401).json({ message: 'Chữ ký không hợp lê. Từ chối truy cập!' });
            }


            // Sinh Session Token ngẫu nhiên
            const sessionToken = crypto.randomBytes(32).toString('hex');

            // Lưu Session Token vào DB để quản lý (Hoặc lưu vào Redis)
            await pool.query(
                "UPDATE agents SET current_session = $1, last_active = NOW() WHERE agent_id = $2",
                [sessionToken, agent_id]
            );

            res.status(200).json({ 
                message: 'Handshake thành công!',
                session_token: sessionToken 
            });

        } catch (err) {
            console.error('Lỗi Handshake Agent:', err);
            res.status(500).json({ message: 'Lỗi máy chủ Master Node' });
        }
    }
};

export default agentController;

    