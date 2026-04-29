// ---> CODE CHUNG DÙNG CHO CẢ MASTER VÀ WORKER
// Khởi tạo pool kết nối CSDL (Mongo/Postgres/Elasticsearch)
import dotenv from "dotenv";
dotenv.config({
  path: path.resolve('../../../../.env')
});

import pkg from "pg";
const { Pool } = pkg;

// Create a new pool instance
const pool = new Pool({

  user: process.env.DB_USER || "team2",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "monitoringDB",
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,

  // // optional configs
  // max: 10, // max number of clients in the pool
  // idleTimeoutMillis: 30000,
  // connectionTimeoutMillis: 2000,
});

// Optional: test connection
pool.on("connect", () => {
  console.log("Connected to PostgreSQL");
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

// Export pool to use in other files
export default pool;