import pool from "../../../shared/database/connect.js";
import { evaluateData } from "../engine/ruleMatcher.js";

/**
 * @param {Object} agentPayload
 * @param {WebSocket} ws
 */
export const handleAgentFimReport = async (agentPayload, ws) => {
	const { agent_id, file_path, current_hash, permission } = agentPayload;

	try {
		const lastesLog = await pool.query(
			`SELECT * FROM file_logs 
			WHERE agent_id = $1
			AND file_path = $2`,
			[agent_id, file_path]
		);

		// Fix lỗi pg: Dùng .rows.length thay vì .length
		if (lastesLog.rows.length === 0) {
			// file mới
			await pool.query(
				`INSERT INTO file_logs (agent_id, file_path, change_type, new_hash, permission)
				 VALUES ($1, $2, 'CREATED', $3, $4)`,
				[agent_id, file_path, current_hash, permission]
			);
		} else {
			const prev_hash = lastesLog.rows[0].new_hash;
			if (prev_hash !== current_hash) {
				// file bị sửa đổi
				await pool.query(
					`INSERT INTO file_logs (agent_id, file_path, change_type, old_hash, new_hash, permission) 
                     VALUES ($1, $2, 'MODIFIED', $3, $4, $5)`,
					[agent_id, file_path, prev_hash, current_hash, permission]
				);

				console.log(`[Worker] Phát hiện file ${file_path} bị đổi! Đang kiểm tra rules...`);

				// Tích hợp Rule Engine (FIM Logic)
				const parsedData = {
					agent_id: agent_id,
					data_type: 'file_integrity', // Phải khớp với data_type trong demo_rule.json
					payload: {
						file: file_path,
						event: 'MODIFIED',
						old_hash: prev_hash,
						new_hash: current_hash
					}
				};

				// So khớp với Rules đang có trên RAM
				const triggeredAlerts = evaluateData(parsedData);

				if (triggeredAlerts.length > 0) {
					console.log(`[Worker] CẢNH BÁO MỨC CAO: Đã vi phạm ${triggeredAlerts.length} rules!`);

					// Gửi thông tin vi phạm qua Master
					if (ws && ws.readyState === 1) {
						ws.send(JSON.stringify({
							type: 'FIM_ALERT',
							payload: {
								agent_id,
								file_path,
								previous_hash: prev_hash,
								current_hash,
								alerts: triggeredAlerts, // Gửi kèm thông tin các rule bị vi phạm (kèm packet_level)
								time: new Date()
							}
						}));
					} else {
						console.warn(`[Cảnh báo] Mất kết nối tới Master. Không thể đẩy Alert của file ${file_path}`);
					}
				} else {
					console.log(`[Worker] File ${file_path} bị đổi nhưng không vi phạm FIM rule nào (Mức độ an toàn).`);
				}
			}
		}
	} catch (err) {
		console.error("[Worker] Lỗi xử lý FIM:", err);
	}
};