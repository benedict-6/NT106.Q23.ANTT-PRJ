// ---> TẤT CẢ LOGIC CỦA WORKER NODE
// Hứng data: TCP/UDP server hoặc HTTP server nhận log từ Load balancer
import { parseAgentData } from "../engine/parser.js";
import { evaluateData } from "../engine/ruleMatcher.js";
import { decryptAgentPayload } from "../engine/decodedRawData.js";
import { handleAgentFimReport, handleAgentNetProReport, handleAgentLogReport, handleAgentSoftwareReport } from "../engine/handleAgentRule.js";
import { writeLogToDB } from "../actions/dbWriter.js";
import pool from "../../shared/database/connect.js";
import { GCMdecrypt } from "../../shared/utils/cryptoUtils.js";

export default async function receiver(req, res) {
    try {
        // Lấy agent_id từ session đã được verify và gán vào req.agent ở middleware
        const agent_id = req.agent ? req.agent.agent_id : null;

        if (!agent_id) {
            return res.status(401).json({ message: 'Từ chối truy cập! Không xác định được Agent.' });
        }

        // Lấy secret_key của Agent từ CSDL
        const result = await pool.query("SELECT secret_key, secret_key_iv, secret_key_auth_tag FROM agents WHERE agent_id = $1", [agent_id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy Agent.' });
        }
        
        const agent = result.rows[0];
        const cipherObject = {
            encryptedData: agent.secret_key,
            iv: agent.secret_key_iv,
            authTag: agent.secret_key_auth_tag
        };
        const rawKey = GCMdecrypt(cipherObject);

        // Giải mã dữ liệu AES từ agent bằng chính key của agent
        const decodedData = decryptAgentPayload(req.body.data, rawKey);

        if (!decodedData) {
            return res.status(400).json({ message: 'Lỗi giải mã dữ liệu AES.' });
        }
        else {
            res.status(200).json({ message: 'Giải mã dữ liệu AES thành công.' });
        }


        if (decodedData.body.type === 'file_integrity') {
            await handleAgentFimReport(decodedData, agent_id);
        }
        else if (decodedData.body.type === 'log_monitoring') {
            await handleAgentLogReport(decodedData, agent_id);
        }
        else if (decodedData.body.type === 'net_pro') {
            await handleAgentNetProReport(decodedData, agent_id);
        }
        else if (decodedData.body.type === 'software_list') {
            await handleAgentSoftwareReport(decodedData, agent_id);
        }
        else
            return res.status(400).json({ message: 'Không có loại dữ liệu hợp lệ.' });

    }
    catch (err) {
        console.error('Lỗi nhận log từ agent:', err);
        return res.status(500).json({ message: 'Lỗi server nội bộ' });
    }
}