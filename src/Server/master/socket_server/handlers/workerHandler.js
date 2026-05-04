import { updateLastActive } from "../services/agentService.js";
import { getAllRules } from "../services/ruleService.js";

export function registeWorkerHandlers(io, socket) {
    socket.on("worker:ready", async () => {
        const rules = await getAllRules();
        socket.emit("rule:sync", { rules })
    });

    socket.on("agent:hearbeat", async (data) => {
        await updateLastActive(data.agent_id);
    });
}