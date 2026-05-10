// ---> TẤT CẢ LOGIC CỦA WORKER NODE
// Não bộ của Worker (Xử lý và So khớp)
// Chuẩn hóa log thô thành JSON
// src/Server/worker/engine/parser.js

/** GIới thiệu qua rawData
 * @param {Object} rawData Dữ liệu thô gửi lên từ Agent (JSON)
 * @returns {Object} Dữ liệu đã chuẩn hóa (hoặc null nếu không hợp lệ)
 */
export const parseAgentData = (rawData) => {
    try {
        //Kiểm tra các trường bắt buộc
        if (!rawData || !rawData.agent_id || !rawData.data_type || !rawData.payload) {
            console.error("[Parser] Dữ liệu bị thiếu các trường bắt buộc (agent_id, data_type, payload).");
            return null;
        }

        //Chuẩn hóa dữ liệu (trước mắt 4 trường)
        const normalizedData = {
            agent_id: rawData.agent_id,
            data_type: rawData.data_type,
            timestamp: rawData.timestamp || new Date().toISOString(),
            payload: rawData.payload
        };

        // Có thể thêm các bước chuẩn hóa đặc thù khác tùy theo data_type ở đây.

        return normalizedData;

    } catch (error) {
        console.error("[Parser] Lỗi khi parse dữ liệu:", error.message);
        return null;
    }
};
