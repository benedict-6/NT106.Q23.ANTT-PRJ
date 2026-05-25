// ---> TẤT CẢ LOGIC CỦA MASTER NODE
// Xử lý API cho Giao diện (UI) gọi xuống
// Lấy dữ liệu thống kê từ DB
import crypto from 'crypto'
import pool from '../../shared/database/connect.js'
import { GCMencrypt, GCMdecrypt } from '../../shared/utils/cryptoUtils.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);


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

			// Cấu hình đường dẫn
			const __filename = fileURLToPath(import.meta.url);
			const __dirname = path.dirname(__filename);
			const templateDir = path.join(__dirname, '../../../agents/siem-agent_1.0.0_amd64');

			const tmpBuildDir = `/tmp/siem-agent-${agent_id}`;
			const tmpDebFile = `/tmp/siem-agent-${agent_id}.deb`;

			// 1. Copy thư mục template sang /tmp
			await execAsync(`rm -rf ${tmpBuildDir} ${tmpDebFile}`);
			await execAsync(`cp -r ${templateDir} ${tmpBuildDir}`);

			// 2. Ghi file agent_config.json vào đúng thư mục /opt/siem-agent/ của package
			const configPath = path.join(tmpBuildDir, 'opt/siem-agent/agent_config.json');
			fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

			// 3. Phân quyền bảo mật 600 cho file config (Chỉ root mới được đọc)
			await execAsync(`chmod 600 ${configPath}`);

			// Đảm bảo permissions chuẩn cho thư mục DEBIAN
			await execAsync(`chmod 755 ${tmpBuildDir}/DEBIAN`);
			await execAsync(`chmod 755 ${tmpBuildDir}/DEBIAN/postinst`);
			await execAsync(`chmod 755 ${tmpBuildDir}/DEBIAN/prerm`);

			// Đảm bảo cấp quyền thực thi cho các file nhị phân và script
			await execAsync(`chmod +x ${tmpBuildDir}/opt/siem-agent/start.sh`);
			await execAsync(`chmod +x ${tmpBuildDir}/opt/siem-agent/*Collector`);
			await execAsync(`chmod +x ${tmpBuildDir}/opt/siem-agent/ebpf/tools/ecli`).catch(() => { });
			await execAsync(`chmod 644 ${tmpBuildDir}/etc/systemd/system/siem-agent.service`).catch(() => { });

			// 4. Build lại file .deb
			await execAsync(`dpkg-deb --root-owner-group --build ${tmpBuildDir} ${tmpDebFile}`);

			// 5. Trả file .deb về cho Client
			res.setHeader('Content-Type', 'application/vnd.debian.binary-package');
			res.setHeader('Content-Disposition', `attachment; filename="siem-agent-${agent_id}.deb"`);

			const fileStream = fs.createReadStream(tmpDebFile);
			fileStream.pipe(res);

			// 6. Xoá file rác sau khi gửi xong
			fileStream.on('end', () => {
				execAsync(`rm -rf ${tmpBuildDir} ${tmpDebFile}`).catch(console.error);
			});
		}
		catch (err) {
			console.error('=== LỖI DOWNLOAD AGENT CONFIG ===');
			console.error('Agent ID:', req.params.agent_id);
			console.error('Error message:', err.message);
			console.error('Error stack:', err.stack);
			console.error('=================================');
			res.status(500).json({ message: 'Lỗi server', error: err.message });
		}
	}
};

export default dashController;