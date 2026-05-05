// ---> CODE CHUNG DÙNG CHO CẢ MASTER VÀ WORKER
// Khởi tạo pool kết nối CSDL (Mongo/Postgres/Elasticsearch)
import { DB_config } from "../config/index.js";
import pkg from "pg";
const { Pool } = pkg;

// // Đọc file .env
// dotenv.config({ path: path.join(__dirname, '../../.env') });

const { Pool } = pg;

// Khởi tạo kết nối: Dùng toán tử || để ưu tiên POSTGRES_ trước, nếu không có mới tìm DB_
const pool = new Pool({
    host: process.env.DB_HOST || '127.0.0.1', 
    port: process.env.DB_PORT || 5432,
    database: process.env.POSTGRES_DB || process.env.DB_NAME,
    user: process.env.POSTGRES_USER || process.env.DB_USER,
    password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD,

    // // optional configs
    // max: 10, // max number of clients in the pool
    // idleTimeoutMillis: 30000,
    // connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
    console.error('Lỗi kết nối Database bất ngờ:', err);
});

export default pool;