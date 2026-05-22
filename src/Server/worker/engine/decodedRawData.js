import zlib from 'zlib';
import crypto from 'crypto';

/**
 * Giải mã dữ liệu AES-256-GCM thô kèm theo Gzip gửi từ Agent
 * Cấu trúc buffer từ Go Agent: [Nonce (12 bytes)][Ciphertext (variable)][AuthTag (16 bytes)]
 * @param {Buffer|Uint8Array} buffer Dữ liệu nhị phân thô nhận từ request body
 * @param {string} [keyHex] Khóa AES dạng Hex (nếu không truyền sẽ dùng AES_MASTER_KEY từ env)
 * @returns {Object|null} Dữ liệu JSON đã giải mã và giải nén thành công
 */
export const decryptAgentPayload = (buffer, keyHex) => {
    try {
        if (!buffer || buffer.length < 28) {
            console.error('[CryptoUtils] Dữ liệu buffer quá ngắn hoặc không hợp lệ.');
            return null;
        }

        const iv = buffer.subarray(0, 12);
        const authTag = buffer.subarray(buffer.length - 16);
        const ciphertext = buffer.subarray(12, buffer.length - 16);

        const key = keyHex ? Buffer.from(keyHex, 'hex') : getMasterKey();

        // 1. Giải mã AES-256-GCM
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(ciphertext);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        // 2. Giải nén Gzip (Vì Go Agent nén dữ liệu bằng Gzip trước khi mã hóa)
        const decompressed = zlib.gunzipSync(decrypted);

        // 3. Chuyển đổi sang JSON Object
        return JSON.parse(decompressed.toString('utf8'));
    } catch (err) {
        console.error('[CryptoUtils] Lỗi khi giải mã hoặc giải nén payload từ Agent:', err.message);
        return null;
    }
};