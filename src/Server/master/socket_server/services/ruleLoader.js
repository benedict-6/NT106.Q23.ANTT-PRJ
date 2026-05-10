import pool from "../../../shared/database/connect.js";


export async function getAllRules() {
    let active_rules = []
    try {
        const rawRules = await pool.query(
            "SELECT * FROM rules"
        );

        if (rawRules && rawRules.rows) {
            // Lưu ý: Tùy theo cách lưu trong DB, rawRules.rows có thể là mảng chứa từng rule
            // Hoặc có 1 cột chứa toàn bộ chuỗi JSON. Dưới đây giả định lưu JSON string trong DB:
            // const ruleConfig = JSON.parse(rawRules.rows[0].rule_data_column);

            // Giả định database trả về thẳng các rules dưới dạng rows:
            const ruleConfig = rawRules.rows;

            active_rules = ruleConfig.filter(rule => rule.enabled)
            console.log(`[Master] Đã tải ${active_rules.length} rules.`);
            return active_rules;
        }
        else {
            console.log(`[Master] Không tìm thấy rule`);
            return null;
        }
    } catch (error) {
        console.error("[Master] Lỗi khi tải rules:", error.message);
        return null;
    }

}

// Dùng tạm tải rule tù file (test nhanh)
export const loadRulesFromFile = (filePath) => {
    try {
        const rawRules = fs.readFileSync(filePath, 'utf8');
        const ruleConfig = JSON.parse(rawRules);

        // Lọc ra các rules có "enabled": true
        activeRules = ruleConfig.detection_rules.filter(rule => rule.enabled); // rule.enabled == true

        console.log(`[RuleMatcher] Đã tải ${activeRules.length} rules.`);
    } catch (error) {
        console.error("[RuleMatcher] Lỗi khi tải file rules:", error.message);
    }
};