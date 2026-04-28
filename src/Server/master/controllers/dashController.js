// ---> TẤT CẢ LOGIC CỦA MASTER NODE
// Xử lý API cho Giao diện (UI) gọi xuống
// Lấy dữ liệu thống kê từ DB
// import bcrypt from 'bcrypt'
import crypto, { createCipheriv } from 'crypto'
import pool from '../../shared/database/connect.js'
import { text } from 'stream/consumers';
import { GCMencrypt } from '../../shared/utils/cryptoUtils.js';



const dashController = {
	createAgent: async (req, res) => {
		const {description} = req.body;

		try{
			
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
				`INSERT INTO agents (agent_id, secert_key, secret_key_iv, secret_key_auth_tag ,description, status)
				 VALUES ($1, $2, $3, $4, $5, 'Active')`,
				 [agentID, ciphetobj.cipherText, ciphetobj.iv, ciphetobj.tag, description || 'No Description']
			);

			//Tra res
			res.status(201).json({
				message: 'Tạo agent thành công! Bảo quản tốt Secret Key nhé!',
				agent_data: {
					agent_id: agentID,
					secret_key: rawSecretkey,
					description: description
				}
			});
		}
		catch(err){
			console.error('Lỗi khi tạo agent: ', err);
			res.status(500).json({message: 'Lỗi server khi cấp phát agent'});
		}
	}
};

export default dashController;