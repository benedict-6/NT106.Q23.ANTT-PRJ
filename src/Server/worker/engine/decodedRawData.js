import { masterkey } from '../../shared/config/index.js';

/**
 * Xử lý payload từ Agent
 * 
 * Luồng dữ liệu:
 *   Agent: JSON → Gzip → HTTP (Content-Encoding: gzip)
 *   Express: HTTP → auto gunzip → req.body (đã là JSON thuần)
 *   Hàm này: req.body → JSON.parse
 * 
 * Express tự giải nén gzip nhờ header Content-Encoding: gzip,
 * nên buffer nhận được ở đây đã là dữ liệu thô (plain text JSON).
 * 
 * @param {Buffer} buffer Dữ liệu đã được Express giải nén
 * @returns {Object|null} JSON object hoặc null nếu lỗi
 */
export const decryptAgentPayload = (buffer) => {
    try {
        if (!buffer || buffer.length === 0) {
            console.error('[Payload] Buffer rỗng hoặc không hợp lệ.');
            return null;
        }

        const decryptedString = buffer.toString('utf8').trim();
        if (!decryptedString) return [];

        const lines = decryptedString.split('\n');
        const records = [];
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed) {
                records.push(JSON.parse(trimmed));
            }
        }
        return records;
    } catch (err) {
        console.error('[Payload] Lỗi parse JSON:', err.message);
        return null;
    }
};