import pool from "../../shared/database/connect.js";
import { evaluateData } from "./ruleMatcher.js";
import { writeLogToDB, saveRuleAlert } from "../actions/dbWriter.js";
import { parseAgentData } from "./parser.js";

/**
 * Xử lý dữ liệu File Integrity Monitoring (FIM)
 */
export const handleAgentFim = async (agentPayload) => {
	try {
		const { triggeredAlerts, alertObj } = evaluateData(agentPayload);
		
		// Chờ lưu log gốc và lấy ra ID sinh tự động
		const dbResult = await writeLogToDB(agentPayload);
		
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
 * Xử lý dữ liệu danh sách phần mềm và Vulnerability (CVE)
 */
export const handleAgentSoftware = async (agentPayload) => {
	try {
		const softwareList = agentPayload.payload;
		if (Array.isArray(softwareList)) {
			for (const sw of softwareList) {
				const singleSwEvent = { ...agentPayload, payload: sw };
				const { triggeredAlerts, alertObj } = evaluateData(singleSwEvent);

				if (triggeredAlerts && triggeredAlerts.length > 0) {
					// Lỗ hổng phần mềm không có ID hypertable, truyền null
					await saveRuleAlert(triggeredAlerts, alertObj, null, agentPayload.timestamp, agentPayload.type);
				}

				await pool.query(
					`INSERT INTO applications (agent_id, software_name, _version) VALUES ($1, $2, $3)`,
					[agentPayload.agent_id, sw.name || sw.software_name, sw.version || sw._version]
				);
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
