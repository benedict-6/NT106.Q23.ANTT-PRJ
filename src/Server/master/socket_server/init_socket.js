import WebsocketHandler from "./handlers/workerHandler.js";
import UIHandler from "./handlers/uiHandler.js";

export default function initSocket(workerPort, uiPort) {
	WebsocketHandler(workerPort);
	UIHandler(uiPort);
}
