import pool from "../../shared/database/connect.js";
import { evaluateData } from "./ruleMatcher.js";
import { writeLogToDB, saveRuleAlert, saveRuleAlertSoftware } from "../actions/dbWriter.js";
import { parseAgentData } from "./parser.js";
import axios from "axios";
import { sendToMaster } from "../socket_client/services/serviceMasterSocket.js";

/**
 * Xử lý dữ liệu File Integrity Monitoring (FIM)
 */
export const handleAgentFim = async (agentPayload) => {
	try {
		const { triggeredAlerts, alertObj } = evaluateData(agentPayload);

		// Chờ lưu log gốc và lấy ra ID sinh tự động
		const dbResult = await writeLogToDB(agentPayload);

		sendToMaster({
			type: 'AGENT_LOG',
			agent_id: agentPayload.agent_id,
			payload: { ...agentPayload.payload, type: agentPayload.type, timestamp: agentPayload.timestamp, event_type: agentPayload.payload.event || agentPayload.payload.event_type, saddr: agentPayload.payload.saddr || agentPayload.payload.src_ip, daddr: agentPayload.payload.daddr || agentPayload.payload.dst_ip }
		});

		if (dbResult) {
			const { id, createdAt } = dbResult;
			await saveRuleAlert(triggeredAlerts, alertObj, id, createdAt, agentPayload.type);
		}
	} catch (err) {
		console.error("[Worker] Lỗi xử lý FIM:", err);
	}
};

export const handleAgentFimReport = async (decodedData, agent_id) => {
	const finalAgentId = agent_id || decodedData.agent_id || decodedData.body?.agent_id;
	const parsedData = parseAgentData(decodedData.body, finalAgentId);
	if (parsedData) await handleAgentFim(parsedData);
};

/**
 * Xử lý dữ liệu Network và Process
 */
export const handleAgentNetPro = async (agentPayload) => {
	try {
		const { triggeredAlerts, alertObj } = evaluateData(agentPayload);
		const dbResult = await writeLogToDB(agentPayload);
		
		sendToMaster({
			type: 'AGENT_LOG',
			agent_id: agentPayload.agent_id,
			payload: { ...agentPayload.payload, type: agentPayload.type, timestamp: agentPayload.timestamp, event_type: agentPayload.payload.event || agentPayload.payload.event_type, saddr: agentPayload.payload.saddr || agentPayload.payload.src_ip, daddr: agentPayload.payload.daddr || agentPayload.payload.dst_ip }
		});

		if (dbResult) {
			const { id, createdAt } = dbResult;
			await saveRuleAlert(triggeredAlerts, alertObj, id, createdAt, agentPayload.type);
		}
	} catch (err) {
		console.error("[Worker] Lỗi xử lý NetPro:", err);
	}
};

export const handleAgentNetProReport = async (decodedData, agent_id) => {
	const finalAgentId = agent_id || decodedData.agent_id || decodedData.body?.agent_id;
	const parsedData = parseAgentData(decodedData.body, finalAgentId);
	if (parsedData) await handleAgentNetPro(parsedData);
};

/**
 * Xử lý dữ liệu Log Monitoring (Syslog, Journald, Auth...)
 */
export const handleAgentLog = async (agentPayload) => {
	try {
		const { triggeredAlerts, alertObj } = evaluateData(agentPayload);
		const dbResult = await writeLogToDB(agentPayload);

		sendToMaster({
			type: 'AGENT_LOG',
			agent_id: agentPayload.agent_id,
			payload: { ...agentPayload.payload, type: agentPayload.type, timestamp: agentPayload.timestamp, event_type: agentPayload.payload.event || agentPayload.payload.event_type, saddr: agentPayload.payload.saddr || agentPayload.payload.src_ip, daddr: agentPayload.payload.daddr || agentPayload.payload.dst_ip }
		});

		if (dbResult) {
			const { id, createdAt } = dbResult;
			await saveRuleAlert(triggeredAlerts, alertObj, id, createdAt, agentPayload.type);
		}
	} catch (err) {
		console.error("[Worker] Lỗi xử lý Log Monitoring:", err);
	}
};

export const handleAgentLogReport = async (decodedData, agent_id) => {
	const finalAgentId = agent_id || decodedData.agent_id || decodedData.body?.agent_id;
	const parsedData = parseAgentData(decodedData.body, finalAgentId);
	if (parsedData) await handleAgentLog(parsedData);
};

/**
 * Lấy danh sách CVE từ NVD API
 * Lưu ý: NVD API giới hạn rate limit (5 req/30s nếu không có API key).
 */
export const checkCVEFromNVD = async (softwareName, version) => {
	try {
		// Tìm kiếm theo keyword gồm tên phần mềm và phiên bản
		const response = await axios.get(`https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${softwareName} ${version}`);

		if (response.data && response.data.vulnerabilities && response.data.vulnerabilities.length > 0) {
			return response.data.vulnerabilities.map(v => ({
				id: v.cve.id,
				description: v.cve.descriptions.find(d => d.lang === 'en')?.value || 'No description',
				severity: v.cve.metrics?.cvssMetricV31?.[0]?.cvssData?.baseSeverity || 'UNKNOWN'
			}));
		}
		return [];
	} catch (err) {
		console.error(`[NVD API] Lỗi khi lấy CVE cho ${softwareName} ${version}:`, err.message);
		return [];
	}
};

/**
 * Xử lý dữ liệu danh sách phần mềm và Vulnerability (CVE)
 */
export const handleAgentSoftware = async (agentPayload) => {
	try {
		// Trỏ đúng vào mảng 'packages' bên trong payload
		const softwareList = agentPayload.payload.packages || agentPayload.payload;
		if (Array.isArray(softwareList)) {
			for (const sw of softwareList) {
				const swName = sw.name || sw.software_name;
				const swVersion = sw.version || sw._version;

				const singleSwEvent = { ...agentPayload, payload: sw };
				const { triggeredAlerts, alertObj } = evaluateData(singleSwEvent);
				const dbResult = await writeLogToDB(singleSwEvent);

				sendToMaster({
					type: 'AGENT_LOG',
					agent_id: singleSwEvent.agent_id,
					payload: { ...singleSwEvent.payload, type: singleSwEvent.type, timestamp: singleSwEvent.timestamp, event_type: singleSwEvent.payload.event || singleSwEvent.payload.event_type || 'Software', saddr: singleSwEvent.payload.saddr || singleSwEvent.payload.src_ip, daddr: singleSwEvent.payload.daddr || singleSwEvent.payload.dst_ip }
				});

				if (triggeredAlerts && triggeredAlerts.length > 0) {
					// Lỗ hổng phần mềm không có ID hypertable, truyền null
					await saveRuleAlert(triggeredAlerts, alertObj, dbResult.id, agentPayload.timestamp, agentPayload.type);
				}

				// // Kiểm tra CVE từ NVD
				// const cveList = await checkCVEFromNVD(swName, swVersion);
				// if (cveList.length > 0) {
				// 	// Lưu CVE vào CSDL
				// 	await saveRuleAlertSoftware(cveList, agentPayload.agent_id, dbResult?.id);
				// }

				// // Delay 6 giây để tránh bị block do rate limit của NVD (không có key)
				// // Nếu có API key, bạn có thể truyền header apiKey và bỏ delay này.
				// await new Promise(resolve => setTimeout(resolve, 6000));
			}
		}
	} catch (err) {
		console.error("[Worker] Lỗi xử lý Software List:", err);
	}
};

export const handleAgentSoftwareReport = async (decodedData, agent_id) => {
	const finalAgentId = agent_id || decodedData.agent_id || decodedData.body?.agent_id;
	const parsedData = parseAgentData(decodedData.body, finalAgentId);
	if (parsedData) await handleAgentSoftware(parsedData);
};
