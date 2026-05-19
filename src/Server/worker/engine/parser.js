// ---> TẤT CẢ LOGIC CỦA WORKER NODE
// Não bộ của Worker (Xử lý và So khớp)
// Chuẩn hóa log thô thành JSON
// src/Server/worker/engine/parser.js

/** GIới thiệu qua rawData
 * @param {Object} rawData Dữ liệu thô gửi lên từ Agent (JSON)
 * @param {String} agent_id ID của agent lấy từ req khi middeware xác thực
 * @returns {Object} Dữ liệu đã chuẩn hóa (hoặc null nếu không hợp lệ)
 */
export const parseAgentData = (rawData, agent_id) => {
    try {
        //Kiểm tra các trường bắt buộc
        if (!rawData || !agent_id || !rawData.data_type) {
            console.error("[Parser] Dữ liệu bị thiếu các trường bắt buộc (agent_id, data_type).");
            return null;
        }

        //Chuẩn hóa dữ liệu (trước mắt 4 trường)
        const normalizedData = {
            agent_id: agent_id,
            type: rawData.type,
            timestamp: rawData.timestamp || new Date().toISOString(),
            payload: rawData.metadata
        };

        // Có thể thêm các bước chuẩn hóa đặc thù khác tùy theo data_type ở đây.

        return normalizedData;

    } catch (error) {
        console.error("[Parser] Lỗi khi parse dữ liệu:", error.message);
        return null;
    }
};

// Danh sách các Rule đang được kích hoạt (Sau này Master sẽ cập nhật mảng này qua Socket)
let activeRules = [];

export const getActiveRules = () => {
    return activeRules;
};

// Dùng để nạp rules vào RAM từ Master Node
export const parseRule = (rulesArray) => {
    try {
        // Master đã filter và trả về mảng rules
        if (Array.isArray(rulesArray)) {
            activeRules = rulesArray;
            console.log(`[Worker] Đã nạp thành công ${activeRules.length} rules vào RAM.`);
        } else {
            console.error("[Worker] Dữ liệu rules từ Master không phải là một mảng hợp lệ!");
        }
    } catch (error) {
        console.error("[Worker] Lỗi khi nạp rule vào RAM:", error.message);
    }
};
