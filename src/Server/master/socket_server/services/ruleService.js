import pool from "../../../shared/database/connect.js";

export async function getAllRules() {
    const result = await pool.query(
        "SELECT * FROM rules"
    );
    return result.rows;
}