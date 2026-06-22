// ---> CODE CHUNG DÙNG CHO CẢ MASTER VÀ WORKER
// Đọc cấu hình từ .env
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Tự động xác định vị trí của file config này
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

if (!process.env.AES_MASTER_KEY) {
	throw new Error("Lỗi: chưa cấu hình master key cho AES");
}
export const masterkey = Buffer.from(process.env.AES_MASTER_KEY, 'hex')

export const PORT = process.env.PORT || 3001;

export const DB_config = {
	user: process.env.DB_USER,
	host: process.env.DB_HOST,
	name: process.env.DB_NAME,
	pass: process.env.DB_PASSWORD,
	port: parseInt(process.env.DB_PORT || 5432)
}

export const workerConfig = {
	ID1: process.env.Worker1,
	ID2: process.env.Worker2,
	ID3: process.env.Worker3,
	ID4: process.env.Worker4,
	port: process.env.PORT_WORKER1 || 4001,
	masterWS: process.env.URL_MASTER_SOCKET || 'ws://localhost:6000'
}

export const masterConfig = {
	port: process.env.PORT_MASTER || 3000,
	port_socket: process.env.MASTER_SOCKET || 6000,
	serverURL: process.env.SERVER_URL
}