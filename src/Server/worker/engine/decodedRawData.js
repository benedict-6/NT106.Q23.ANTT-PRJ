import zlib from 'zlib';

/**
 * Giải nén dữ liệu Gzip gửi từ Agent
 * @param {Buffer|Uint8Array} buffer Dữ liệu nhị phân thô
 * @returns {Object|null} Dữ liệu JSON đã giải nén thành công
 */
export const decryptAgentPayload = (buffer) => {
    try {
        if (!buffer || buffer.length === 0) {
            console.error('[CryptoUtils] Dữ liệu buffer rỗng hoặc không hợp lệ.');
            return null;
        }

        // 1. Giải nén Gzip (Vì Go Agent nén dữ liệu bằng Gzip)
        const decompressed = zlib.gunzipSync(buffer);

        // 2. Chuyển đổi sang JSON Object
        return JSON.parse(decompressed.toString('utf8'));
    } catch (err) {
        console.error('[CryptoUtils] Lỗi khi giải nén payload từ Agent:', err.message);
        return null;
    }
};