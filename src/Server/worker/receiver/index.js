// ---> TẤT CẢ LOGIC CỦA WORKER NODE
// Hứng data: TCP/UDP server hoặc HTTP server nhận log từ Load balancer
import { parseAgentData } from "../engine/parser.js";
import { evaluateData } from "../engine/ruleMatcher.js";
import { decryptAgentPayload } from "../engine/decodedRawData.js";
import { handleAgentFimReport, handleAgentNetProReport, handleAgentLogReport, handleAgentSoftwareReport } from "../engine/handleAgentRule.js";
import { writeLogToDB } from "../actions/dbWriter.js";

export default async function receiver(req, res) {
    try {
        // Lấy agent_id từ session đã được verify và gán vào req.agent ở middleware
        const agent_id = req.agent ? req.agent.agent_id : null;

        if (!agent_id) {
            return res.status(401).json({ message: 'Từ chối truy cập! Không xác định được Agent.' });
        }

        // Giải mã dữ liệu AES từ agent
        const decodedData = decryptAgentPayload(req.body.data);

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