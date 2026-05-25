import crypto from 'crypto';
import zlib from 'zlib';
import util from 'util';

const gunzipAsync = util.promisify(zlib.gunzip);

/**
 * Xử lý payload từ Agent
 * 
 * Luồng dữ liệu:
 *   Agent: JSON → Gzip → AES-256-GCM → HTTP
 *   Hàm này: Buffer → Giải mã AES → Giải nén Gzip → JSON.parse
 * 
 * @param {Buffer} buffer Dữ liệu bị mã hoá AES + Gzip
 * @param {string} secret_key Khóa bí mật
 * @returns {Array|null} Mảng object JSON hoặc null nếu lỗi
 */
export const decryptAgentPayload = async (buffer, secret_key) => {
    try {
        if (!buffer || buffer.length < 28) {
            console.error('[Payload] Buffer rỗng hoặc không đủ độ dài tối thiểu.');
            return null;
        }

        const nonce = buffer.subarray(0, 12);
        const ciphertext = buffer.subarray(12, buffer.length - 16);
        const authTag = buffer.subarray(buffer.length - 16);

        const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(secret_key), nonce);
        decipher.setAuthTag(authTag);

        let compressedBuffer;
        try {
            compressedBuffer = Buffer.concat([
                decipher.update(ciphertext),
                decipher.final()
            ]);
        } catch (e) {
            console.error('[Payload] Lỗi giải mã AES:', e);
            return null;
        }

        let rawBuffer;
        try {
            rawBuffer = await gunzipAsync(compressedBuffer);
        } catch (e) {
            console.error('[Payload] Lỗi giải nén Gzip:', e);
            return null;
        }

        const decryptedString = rawBuffer.toString('utf8').trim();
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