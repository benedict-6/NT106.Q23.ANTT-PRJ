import initMasterWebSocket from "./handlers/handlerMasterSocket.js/index.js";
import initAgentListener from "./handlers/handlerAgentSocket.js";

export default function InitSocket(url ,port){
	const masterWs = initMasterWebSocket(url);
	initAgentListener(port, masterWs)
}