// ---> TẤT CẢ LOGIC CỦA WORKER NODE
// Hứng data: TCP/UDP server hoặc HTTP server nhận log từ Load balancer
import { decryptAgentPayload } from "../engine/decodedRawData.js";
import { handleAgentFimReport, handleAgentNetProReport, handleAgentLogReport, handleAgentSoftwareReport } from "../engine/handleAgentRule.js";

export default async function receiver(req, res) {
    try {
        // Lấy agent_id và secret_key từ session
        const agent_id = req.agent ? req.agent.agent_id : null;
        const secret_key = req.agent ? req.agent.secret_key : null;

        if (!agent_id || !secret_key) {
            return res.status(401).json({ message: 'Từ chối truy cập! Không xác định được Agent.' });
        }

        const encryptedBuffer = Buffer.isBuffer(req.body) ? req.body : req.body.data;

        const records = await decryptAgentPayload(encryptedBuffer, secret_key);

        if (!records) {
            return res.status(400).json({ message: 'Lỗi giải mã hoặc parse dữ liệu.' });
        }

        // Trả về 200 OK cho Agent ngay lập tức để không block kết nối
        res.status(200).json({ message: 'Giải mã dữ liệu thành công.' });

        // Xử lý không đồng bộ các bản ghi trong batch
        (async () => {
            for (const record of records) {
                const decodedData = { body: record };

                try {
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
                } catch (err) {
                    console.error('Lỗi khi xử lý bản ghi agent:', err);
                }
            }
        })();

    }
    catch (err) {
        console.error('Lỗi nhận log từ agent:', err);
        return res.status(500).json({ message: 'Lỗi server nội bộ' });
    }
}