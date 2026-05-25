// ---> TẤT CẢ LOGIC CỦA WORKER NODE
// Xử lý đầu ra sau khi phân tích xong
// Gửi Realtime Alert (Webhook, Email, hoặc qua Socket)

import { sendToMaster } from "../socket_client/services/serviceMasterSocket.js";
import nodemailer from "nodemailer"; // hỗ trợ gửi mail

/**
 * Gửi cảnh báo lên Master Server thông qua WebSocket để Master chuyển tiếp tới AdminDashboard
 * @param {Object} alert Thông tin chi tiết của cảnh báo bị trigger
 */
export const sendSocketAlert = (alert) => {
    try {
        console.log(`[Alerter] Đang đẩy cảnh báo lên Master Node qua Socket...`);

        // Gửi nguyên gói tin cảnh báo theo chuẩn cấu trúc nguyên gốc lên Master
        sendToMaster({
            type: 'RULE_ALERT',
            agent_id: alert.agent_id,
            payload: alert
        });
    } catch (err) {
        console.error("[Alerter] Không thể gửi socket alert lên Master:", err.message);
    }
};


/**
 * Gửi email cảnh báo thời gian thực thông qua dịch vụ SMTP (Gmail)
 * @param {Object} alert Thông tin chi tiết của cảnh báo bị trigger
 */
export const sendEmailAlert = async (alert) => {
    console.log(`[Alerter] Khởi chạy tác vụ gửi Email cảnh báo...`);
    // cần sửa lại đoạn gửi mail này nữa, gửi theo kiểu khác chứ k phải kiểu này
    const emailContent = `
============================================================
⚠️ CẢNH BÁO PHÁT HIỆN SỰ CỐ AN NINH (SIEM ALERT) ⚠️
============================================================

Hệ thống phát hiện hoạt động vi phạm nghiêm trọng chính sách bảo mật:

* Tên Luật Vi Phạm:   ${alert.rule_name}
* Mã Luật (Rule ID):  ${alert.rule_id}
* Mức độ nguy cấp:     Mức ${alert.packet_level} (packet_level >= 10)
* Nhóm kiểm tra:      ${alert.category}
* Mã định danh Agent: ${alert.agent_id}
* Thời gian ghi nhận: ${alert.timestamp || new Date().toLocaleString()}

------------------------------------------------------------
CHI TIẾT SỰ KIỆN:
------------------------------------------------------------
${JSON.stringify(alert.payload || alert, null, 4)}

------------------------------------------------------------
============================================================
`;

    // Cấu hình nodemailer (demo gửi qua Gmail)
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS
        }
    });

    const mailOptions = {
        from: process.env.MAIL_USER,
        to: process.env.MAIL_DES,
        subject: `⚠️ [SIEM ALERT - LEVEL ${alert.packet_level}] ${alert.rule_name}`,
        text: emailContent
    };

    try {
        // Kiểm tra xem có cấu hình email thật không
        if (process.env.MAIL_USER && process.env.MAIL_PASS) {
            await transporter.sendMail(mailOptions);
            console.log(`[Alerter] Đã gửi email cảnh báo thật thành công tới ${mailOptions.to}!`);
        } else {
            console.log(`
======================================================================
                     [SMTP EMAIL MOCK SENDER]
======================================================================
Người gửi: ${mailOptions.from}
Người nhận: ${mailOptions.to}
Tiêu đề: ${mailOptions.subject}
Nội dung:
${mailOptions.text}
======================================================================
            `);
        }
    } catch (err) {
        console.warn(`[Alerter] Không gửi được email thật (Chưa cấu hình hoặc cấu hình sai trong .env).`);
        console.log(`
======================================================================
                     [SMTP EMAIL MOCK SENDER - FALLBACK]
======================================================================
Người gửi: ${mailOptions.from}
Người nhận: ${mailOptions.to}
Tiêu đề: ${mailOptions.subject}
Nội dung:
${mailOptions.text}
======================================================================
Lỗi chi tiết: ${err.message}
        `);
    }
};
