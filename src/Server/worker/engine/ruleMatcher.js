// ---> TẤT CẢ LOGIC CỦA WORKER NODE
// Não bộ của Worker (Xử lý và So khớp)
// Core logic so khớp sự kiện với Rules
// src/Server/worker/engine/ruleMatcher.js
import fs from 'fs';
import path from 'path';

// Danh sách các Rule đang được kích hoạt (Sau này Master sẽ cập nhật mảng này qua Socket)
let activeRules = [];

// Bộ nhớ đệm lưu trữ trạng thái (State) cho các rule cần đếm theo thời gian (Threshold)
const thresholdCache = {};

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

/**
 * @param {any} dataValue dữ liệu thực tế nhận từ file
 * @param {string} operator cách so sánh 
 * @param {any} ruleValue Dữ liệu từ rule để so sánh
 */

/** Các kiểu so sánh
 * equals: ===
 * gte, lse: lớn hơn bàng, bé hơn bằng
 * in: thuộc hoặc có tồn tại trong ruleValue
 * contains: bao gồm giá trị trong ruleValue
 * in_blakclist: kiểm tra trong black list
 * is_not_null: kiểm tra rỗng
 */

const evaluateCondition = (dataValue, operator, ruleValue) => {
    if (dataValue === undefined || dataValue === null) return false;

    switch (operator) {
        case 'equals':
            return dataValue === ruleValue;
        case 'in':
            return Array.isArray(ruleValue) && ruleValue.includes(dataValue);
        case 'contains':
            return String(dataValue).includes(String(ruleValue));
        case 'regex':
            const regex = new RegExp(ruleValue);
            return regex.test(String(dataValue));
        case 'gte':
            return Number(dataValue) >= Number(ruleValue);
        case 'is_not_null':
            return dataValue !== null && dataValue !== undefined;
        case 'is_external':
            // Xác định IP có phải là IP public hay IP LAN
            const isLocal = /^(192\.168\.|10\.|127\.0\.0\.1|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(dataValue);
            return ruleValue === true ? !isLocal : isLocal;
        case 'in_blacklist':
            // Chưa có dữ liêu Blacklist IP từ DB
            // Trả về true tạm thời để testing
            return true;
        default:
            console.warn(`[RuleMatcher] Toán tử không được hỗ trợ: ${operator}`);
            return false;
    }
};

/**
 * Kiểm tra các Rule yêu cầu bộ đếm Threshold (Ví dụ: Brute Force, Scan Port)
 * @param {JSON} rule fecth rule vào
 * @param {JSON} payload nội dung agent gửi
 * @param {string} agentId
  */
// thresholdCache
// Cấu trúc:
// { 
//   "rule_id": 
//   { 
//      "group_key": { count: number, firstSeen: timestamp } 
//   } 
// }

const checkThreshold = (rule, payload, agentId) => {
    const { rule_id, threshold } = rule;
    if (!thresholdCache[rule_id]) thresholdCache[rule_id] = {};

    // 1. Tạo Group Key
    //VD: group theo saddr -> groupkey = AGT12-192.168.1.5
    let groupKey = agentId;
    // Lọc thôn tin từ truong group_by
    if (threshold.group_by && threshold.group_by.length > 0) {
        const groupVals = threshold.group_by.map(field => payload[field] || 'unknown').join('-');
        groupKey += `-${groupVals}`;
    }


    const now = Date.now();
    const cache = thresholdCache[rule_id];

    // 2. Khởi tạo cache nếu chưa có
    if (!cache[groupKey]) {
        cache[groupKey] = { count: 1, firstSeen: now };
    } else {
        cache[groupKey].count += 1; // Tăng biến đếm
    }

    // 3. Tính độ lệch thời gian
    const timeDiffSeconds = (now - cache[groupKey].firstSeen) / 1000;

    // 4. Nếu quá thời gian khai báo trong (window_seconds) => Reset lại từ đầu
    if (timeDiffSeconds > threshold.window_seconds) {
        cache[groupKey] = { count: 1, firstSeen: now };
        return false;
    }

    // 5. Nếu đạt tới số lần (count) trong thời gian cho phép => Có Vi Phạm!
    if (cache[groupKey].count >= threshold.count) {
        // Reset bộ đếm sau khi cảnh báo (để tránh spam)
        delete cache[groupKey];
        return true;
    }

    return false;
};

/**
 * Hàm Lõi: Lấy dữ liệu Agent so khớp với tập Rules
 * @param {Object} parsedData Dữ liệu đã đi qua parser.js
 * @returns {Array} Danh sách các Alerts được trigger
 */

export const evaluateData = (parsedData) => {
    const triggeredAlerts = [];

    //Duyet qua tung rule
    for (const rule of activeRules) {
        // 1. Bỏ qua nếu không đúng data_type
        if (rule.data_type && rule.data_type !== parsedData.data_type) continue;

        // 2. Kiểm tra danh sách conditions (Tất cả condition phải ĐÚNG - AND logic)
        let isMatch = true;
        for (const cond of rule.conditions) {
            const fieldValue = parsedData.payload[cond.field];

            if (!evaluateCondition(fieldValue, cond.operator, cond.value)) {
                isMatch = false;
                break;
            }
        }

        // 3. nếu khớp, tiếp tục check Threshold
        if (isMatch) {
            // Đối với rule cần đếm
            if (rule.threshold) {
                // Kiểm tra xem liệu có vượt ngưỡng
                const thresholdTrigger = checkThreshold(rule, parsedData.payload, parsedData.agent_id);
                if (thresholdTrigger) {
                    triggeredAlerts.push({
                        rule_id: rule.rule_id,
                        rule_name: rule.rule_name,
                        packet_level: rule.packet_level,
                        category: rule.category,
                        timestamp: new Date().toISOString()
                    });
                }
            } else {
                // Rule thông thường (không cần threshold)
                triggeredAlerts.push({
                    rule_id: rule.rule_id,
                    rule_name: rule.rule_name,
                    packet_level: rule.packet_level,
                    category: rule.category,
                    timestamp: new Date().toISOString()
                });
            }
        }
    }

    return triggeredAlerts;
};
