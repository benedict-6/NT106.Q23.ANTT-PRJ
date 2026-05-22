// khởi tạo và inject service và attach handler

import WebSocket from "ws";
import registerMasterHandler from './handlers/handlerMasterSocket.js'
import { setMasterSocket } from "./services/serviceMasterSocket.js";

export default function InitSocket(url) {
	const ws = new WebSocket(url); // tạo websocket

	setMasterSocket(ws); // inject service

	registerMasterHandler(ws); // attach handler

	return ws;
}