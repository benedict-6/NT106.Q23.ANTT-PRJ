import pool from "../shared/database/connect.js";
/**
 * @param {Object} agentPayload
 * @param {WebSocket} ws
 */

const fileVerify = async (agentPayload, ws) => {
	const {agent_id, file_path, current_hash, permission } = agentPayload;

	try{
		const lastesLog = await pool.query(
			`SELECT * FROM file_logs 
			WHERE agent_id = $1
			AND file_path = $2`,
			[agent_id, file_path]
		);

		if (lastesLog.length == 0){
			//file mới
			await pool.query(
				`INSERT INTO file_logs (agent_id, file_path, change_type, new_hash, permission)
				 VALUES ($1, $2, 'CREATED', $3, $4)`,
				 [agent_id, file_path,current_hash,permission]
			);
		}
		else{
			const prev_hash = lastesLog.rows[0].new_hash;
			if (prev_hash !== current_hash) {
                //file bị sửa đổi
                await pool.query(
                    `INSERT INTO file_logs (agent_id, file_path, change_type, old_hash, new_hash, permission) 
                     VALUES ($1, $2, 'MODIFIED', $3, $4, $5)`,
                    [agent_id, file_path, prev_hash, current_hash, permission]
                ); 

				console.log(`[Worker] Phát hiện file ${file_path} bị đổi!`);

                //ĐẨY CẢNH BÁO LÊN MASTER NODE => 
				if (ws && ws.readyState === 1) {
                    ws.send(JSON.stringify({
                        type: 'FIM_ALERT',
                        payload: { 
                            agent_id, 
                            file_path, 
                            previous_hash, 
                            current_hash,
                            time: new Date()
                        }
                    }));
                } else {
                    console.warn(`[Cảnh báo] Mất kết nối tới Master. Không thể đẩy Alert của file ${file_path}`);
                }
			}
		}
	}catch (err) {
        console.error("[Worker] Lỗi xử lý SQL:", err);
    }
}