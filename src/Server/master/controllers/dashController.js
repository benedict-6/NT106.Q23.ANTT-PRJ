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
import { ZipArchive } from 'archiver';

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

	// Lấy danh sách alerts mới nhất
	listAlerts: async (req, res) => {
		try {
			const result = await pool.query(
				`WITH recent_alerts AS (
					SELECT r.rule_alert_id as id, r.agent_id, r.rule_id, r.packet_level, r.created_at, 
						   r.net_pro_id, r.net_pro_created_at, 
						   r.file_log_id, r.file_integrity_created_at, 
						   r.log_monitoring_id, r.log_monitoring_created_at
					FROM rule_alert r
					JOIN agents a ON r.agent_id = a.agent_id
					WHERE a.user_id = $1
					ORDER BY r.created_at DESC 
					LIMIT 200
				)
				SELECT r.id, r.agent_id, r.rule_id, r.packet_level, r.created_at, d.rule_name,
				        row_to_json(np.*) as net_pro_payload,
				        row_to_json(fi.*) as file_integrity_payload,
				        row_to_json(lm.*) as log_monitoring_payload
				 FROM recent_alerts r 
				 LEFT JOIN detection_rules d ON r.rule_id = d.rule_id 
				 LEFT JOIN net_pro np ON r.net_pro_id = np.net_pro_id AND r.net_pro_created_at = np.created_at
				 LEFT JOIN file_integrity fi ON r.file_log_id = fi.file_log_id AND r.file_integrity_created_at = fi.created_at
				 LEFT JOIN log_monitoring lm ON r.log_monitoring_id = lm.log_monitoring_id AND r.log_monitoring_created_at = lm.created_at
				 ORDER BY r.created_at DESC`,
				[req.user.userId]
			);

			// Gộp payload chi tiết vào alert object
			const alertsWithPayload = result.rows.map(row => {
				const payload = row.net_pro_payload || row.file_integrity_payload || row.log_monitoring_payload || {};
				return {
					id: row.id,
					agent_id: row.agent_id,
					rule_id: row.rule_id,
					packet_level: row.packet_level,
					created_at: row.created_at,
					rule_name: row.rule_name,
					payload: payload
				};
			});

			res.json({ alerts: alertsWithPayload });
		} catch (err) {
			console.error('Lỗi khi lấy alerts: ', err);
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
	},

	// Xóa một agent
	deleteAgent: async (req, res) => {
		const userId = req.user.userId;
		const { agent_id } = req.params;

		try {
			const result = await pool.query(
				"DELETE FROM agents WHERE agent_id = $1 AND user_id = $2 RETURNING agent_id",
				[agent_id, userId]
			);

			if (result.rowCount === 0) {
				return res.status(404).json({ message: 'Agent không tồn tại hoặc không thuộc quyền sở hữu' });
			}

			res.json({ message: 'Xóa agent và toàn bộ dữ liệu liên quan thành công', deleted_agent: result.rows[0].agent_id });
		}
		catch (err) {
			console.error('Lỗi khi xóa agent: ', err);
			res.status(500).json({ message: 'Lỗi server khi xóa agent' });
		}
	},

	// Xuất log
	exportLogs: async (req, res) => {
		const userId = req.user.userId;
		const { agents, timeRange, dataTypes } = req.body;

		if (!agents || !timeRange || !dataTypes) {
			return res.status(400).json({ message: 'Missing required parameters' });
		}

		try {
			// Dynamic import archiver
			const archiverModule = await import('archiver');
			const archiver = archiverModule.default || archiverModule;

			let targetAgents = [];
			if (agents === 'all') {
				const agentsResult = await pool.query("SELECT agent_id, hostname FROM agents WHERE user_id = $1", [userId]);
				targetAgents = agentsResult.rows;
			} else if (Array.isArray(agents)) {
				const agentsResult = await pool.query("SELECT agent_id, hostname FROM agents WHERE user_id = $1 AND agent_id = ANY($2)", [userId, agents]);
				targetAgents = agentsResult.rows;
			} else {
				return res.status(400).json({ message: 'Invalid agents format' });
			}

			if (targetAgents.length === 0) {
				return res.status(404).json({ message: 'No valid agents found for export' });
			}

			let timeCondition = "";
			let timeParams = [];
			let currentParamIndex = 1;

			if (timeRange === 'all_time') {
				timeCondition = `1=1`;
			} else if (typeof timeRange === 'string') {
				const value = parseInt(timeRange) || 24;
				const unitStr = timeRange.replace(/[0-9]/g, '');
				let interval = '';
				if (unitStr === 'm') interval = `${value} minutes`;
				else if (unitStr === 'h') interval = `${value} hours`;
				else if (unitStr === 'd') interval = `${value} days`;
				else interval = '30 days';

				timeCondition = `created_at >= NOW() - INTERVAL '${interval}'`;
			} else if (typeof timeRange === 'object' && timeRange.start && timeRange.end) {
				timeCondition = `created_at >= $${currentParamIndex++} AND created_at <= $${currentParamIndex++}`;
				timeParams.push(timeRange.start, timeRange.end);
			} else {
				timeCondition = `created_at >= NOW() - INTERVAL '24 hours'`;
			}

			res.setHeader('Content-Type', 'application/zip');
			res.setHeader('Content-Disposition', 'attachment; filename="exported_logs.zip"');

			const archive = new ZipArchive({ zlib: { level: 9 } });
			archive.on('error', (err) => { throw err; });
			archive.pipe(res);

			const formatToTxt = (rows, type) => {
				if (rows.length === 0) return "No data recorded for this period.\n";
				let txt = `=== EXPORTED LOGS: ${type.toUpperCase()} ===\n`;
				txt += `Total records: ${rows.length}\n\n`;
				const keys = Object.keys(rows[0]);
				txt += keys.join(" | ") + "\n";
				txt += "-".repeat(keys.join(" | ").length) + "\n";
				rows.forEach(row => {
					txt += keys.map(k => {
						let val = row[k];
						if (val instanceof Date) return val.toISOString();
						if (val === null || val === undefined) return "N/A";
						return String(val);
					}).join(" | ") + "\n";
				});
				return txt;
			};

			const typesToFetch = dataTypes === 'all' ? ['net_pro', 'file_integrity', 'log_monitoring', 'rule_alert', 'applications'] : (Array.isArray(dataTypes) ? dataTypes : [dataTypes]);

			for (const agent of targetAgents) {
				const agentId = agent.agent_id;
				const hostname = agent.hostname || 'Unknown';
				const folderName = `${hostname}_${agentId}`;

				for (const type of typesToFetch) {
					let query = "";
					if (type === 'net_pro') {
						query = `SELECT event_type, pid, comm, file_path, src_ip, dest_ip, protocol, sport, dport, _state, _timestamp, created_at FROM net_pro WHERE agent_id = '${agentId}' AND ${timeCondition} ORDER BY created_at DESC`;
					} else if (type === 'file_integrity') {
						query = `SELECT file_path, event_type, old_hash, new_hash, permission, _timestamp, mtime, created_at FROM file_integrity WHERE agent_id = '${agentId}' AND ${timeCondition} ORDER BY created_at DESC`;
					} else if (type === 'log_monitoring') {
						query = `SELECT file_path, _service, pid, _action, src_ip, _user, type_log, _timestamp, created_at FROM log_monitoring WHERE agent_id = '${agentId}' AND ${timeCondition} ORDER BY created_at DESC`;
					} else if (type === 'rule_alert') {
						query = `SELECT rule_id, packet_level, alert, created_at FROM rule_alert WHERE agent_id = '${agentId}' AND ${timeCondition} ORDER BY created_at DESC`;
					} else if (type === 'applications') {
						query = `SELECT software_name, _version FROM applications WHERE agent_id = '${agentId}'`; // applications doesn't have created_at
					} else {
						continue;
					}

					try {
						// For applications, we don't have timeCondition, so we shouldn't pass timeParams unless it's used. 
						const isApp = type === 'applications';
						const finalQuery = isApp ? query : query;
						const finalParams = isApp ? [] : timeParams;

						let offset = 0;
						const limit = 5000;
						let hasData = false;

						while (true) {
							const paginatedQuery = `${finalQuery} LIMIT ${limit} OFFSET ${offset}`;
							const dataResult = await pool.query(paginatedQuery, finalParams);

							if (dataResult.rows.length === 0) {
								if (!hasData) {
									// No data at all, just write the empty text
									archive.append(formatToTxt([], type), { name: `${folderName}/${type}.txt` });
								}
								break;
							}

							hasData = true;
							const txtContent = formatToTxt(dataResult.rows, type);
							// Append each chunk as a separate file part or a single file if supported,
							// but archiver appends files. To keep it simple, we save parts:
							const fileName = offset === 0 ? `${type}.txt` : `${type}_part${offset / limit + 1}.txt`;
							archive.append(txtContent, { name: `${folderName}/${fileName}` });

							if (dataResult.rows.length < limit) break; // Reached the end
							offset += limit;
						}
					} catch (err) {
						archive.append(`Error fetching data: ${err.message}`, { name: `${folderName}/${type}_error.txt` });
					}
				}
			}

			await archive.finalize();

		} catch (err) {
			console.error('Error during log export:', err);
			if (!res.headersSent) {
				res.status(500).json({ message: 'Internal server error during export' });
			}
		}
	}
};

export default dashController;