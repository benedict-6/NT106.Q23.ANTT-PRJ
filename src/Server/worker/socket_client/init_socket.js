import initMasterWebSocket from "./handlers/handlerMasterSocket";
import initAgentListener from "./handlers/handlerAgentSocket";

export default function InitSocket(url ,port){
	const masterWs = initMasterWebSocket(url);
	initAgentListener(workerConfig.port, masterWs)
}