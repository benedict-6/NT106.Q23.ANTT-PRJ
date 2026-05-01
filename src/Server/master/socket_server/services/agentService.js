import pool from "../../../shared/database/connect.js";

export async function updateLastActive(agent_id) {
    await pool.query(
        "UPDATE agents SET last_active = NOW() WHERE agent_id = $1",
        [agent_id]
    );
}