// ---> TẤT CẢ LOGIC CỦA MASTER NODE
// Xử lý API cho Giao diện (UI) gọi xuống
// Lấy dữ liệu thống kê từ DB
import crypto from 'crypto'
import pool from '../../shared/database/connect.js'
import { GCMencrypt, GCMdecrypt } from '../../shared/utils/cryptoUtils.js';
import { ZipArchive } from 'archiver';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const archiver = require('archiver');

const dashController = {
	// Tạo agent mới, gắn user_id từ JWT
	createAgent: async (req, res) => {
		const { description, name } = req.body;
		const userId = req.user.userId; // Lấy từ JWT middleware

		try {
			// Sinh agent id
			const randByte = crypto.randomBytes(4).toString('hex');
			const agentID = `AGT-${randByte.toUpperCase()}`;

			// Secret key
			const rawSecretkey = crypto.randomBytes(16).toString('hex');

			const ciphetobj = GCMencrypt(rawSecretkey);

			//secret_key, secret_key_iv, secret_key_auth_tag
			// Save to DB 
			// Secret key is encrypted 
			await pool.query(
				`INSERT INTO agents (agent_id, user_id, secret_key, secret_key_iv, secret_key_auth_tag, agent_description, agent_status, hostname)
				 VALUES ($1, $2, $3, $4, $5, $6, 'offline', $7)`,
				[agentID, userId, ciphetobj.cipherText, ciphetobj.iv, ciphetobj.tag, description || 'No Description', name || 'Unknown']
			);

			//Tra res
			res.status(201).json({
				message: 'Tạo agent thành công!',
				agent_data: {
					agent_id: agentID,
					secret_key: rawSecretkey,
					description: description
				}
			});
		}
		catch (err) {
			console.error('Lỗi khi tạo agent: ', err);
			res.status(500).json({ message: 'Lỗi server khi cấp phát agent' });
		}
	},

	// Lấy danh sách agents thuộc user hiện tại
	listAgents: async (req, res) => {
		const userId = req.user.userId;

		try {
			const result = await pool.query(
				`SELECT agent_id, agent_description, agent_status, hostname, ip_address, mac_address, current_session, last_active, created_at 
				 FROM agents WHERE user_id = $1 ORDER BY created_at DESC`,
				[userId]
			);
			res.json({ agents: result.rows });
		}
		catch (err) {
			console.error('Lỗi khi lấy danh sách agents: ', err);
			res.status(500).json({ message: 'Lỗi server' });
		}
	},

	// Lấy config download cho một agent cụ thể
	downloadAgentConfig: async (req, res) => {
		const userId = req.user.userId;
		const { agent_id } = req.params;

		try {
			// Verify user sở hữu agent này
			const result = await pool.query(
				"SELECT * FROM agents WHERE agent_id = $1 AND user_id = $2",
				[agent_id, userId]
			);

			if (result.rows.length === 0) {
				return res.status(404).json({ message: 'Agent không tồn tại hoặc không thuộc về bạn' });
			}

			const agent = result.rows[0];

			// Giải mã secret_key để nhúng vào config
			const cipherObject = {
				encryptedData: agent.secret_key,
				iv: agent.secret_key_iv,
				authTag: agent.secret_key_auth_tag
			};
			const rawKey = GCMdecrypt(cipherObject);

			if (!rawKey) {
				return res.status(500).json({ message: 'Không thể giải mã secret key' });
			}

			// Trả về config JSON để agent dùng
			const config = {
				agent_id: agent.agent_id,
				secret_key: rawKey,
				server_url: process.env.SERVER_URL || 'http://localhost:3000',
				lb_url: process.env.LOAD_BALANCER_URL || 'http://localhost:3001'
			};

			// 1. Cấu hình luồng nén ZIP trực tiếp trên RAM
			const archive = new ZipArchive({ zlib: { level: 9 } });

			res.setHeader('Content-Type', 'application/zip');
			res.setHeader('Content-Disposition', `attachment; filename="siem-agent-${agent_id}.zip"`);

			archive.on('error', function (err) {
				console.error('Lỗi khi nén file ZIP: ', err);
				res.status(500).send({ error: err.message });
			});

			// Gắn luồng nén vào response
			archive.pipe(res);

			// 2. Thêm file JSON Config sinh ra từ RAM vào file ZIP
			archive.append(JSON.stringify(config, null, 2), { name: 'agent_config.json' });

			// 3. Đọc file .deb tĩnh và nhét vào file ZIP
			const __filename = fileURLToPath(import.meta.url);
			const __dirname = path.dirname(__filename);
			const debFilePath = path.join(__dirname, '../download/siem-agent_1.0.0_amd64.deb');

			if (fs.existsSync(debFilePath)) {
				archive.file(debFilePath, { name: 'siem-agent_1.0.0_amd64.deb' });
			} else {
				console.warn('Cảnh báo: Không tìm thấy file .deb tại', debFilePath);
			}

			// Hoàn tất đóng gói ZIP và gửi về Client
			await archive.finalize();
		}
		catch (err) {
			console.error('Lỗi khi tạo config download: ', err);
			res.status(500).json({ message: 'Lỗi server', error: err.message, stack: err.stack });
		}
	}
};

export default dashController;