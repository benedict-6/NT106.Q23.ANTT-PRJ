import { useState, useEffect, useCallback } from 'react';

export const useDashboardSocket = () => {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [logs, setLogs] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [agentStatuses, setAgentStatuses] = useState({});
    const [dbLogs, setDbLogs] = useState([]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Default UI Port is 6001. We construct WS URL based on MASTER_URL or default to localhost
        const masterUrl = process.env.NEXT_PUBLIC_MASTER_URL || "http://localhost:3000";
        let wsUrl = "ws://localhost:6001";
        try {
            const url = new URL(masterUrl);
            wsUrl = `ws://${url.hostname}:6001`;
        } catch (e) { }

        let ws = null;
        let reconnectTimer = null;
        let logsBuffer = [];
        let alertsBuffer = [];

        const flushInterval = setInterval(() => {
            if (logsBuffer.length > 0) {
                const logsToAppend = [...logsBuffer];
                logsBuffer = [];
                setLogs(prev => [...logsToAppend, ...prev].slice(0, 1000));
            }
            if (alertsBuffer.length > 0) {
                const alertsToAppend = [...alertsBuffer];
                alertsBuffer = [];
                setAlerts(prev => [...alertsToAppend, ...prev].slice(0, 500));
            }
        }, 500);

        const connect = () => {
            ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                console.log("[WS] Connected to Master Node");
                // Gửi xác thực
                ws.send(JSON.stringify({ type: 'REGISTER_UI', token }));
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.type === 'WELCOME') {
                        setIsConnected(true);
                    }

                    if (data.type === 'NEW_LOG_UI') {
                        const newLog = {
                            id: Date.now() + Math.random().toString(36).substr(2, 9),
                            agent_id: data.agent_id,
                            ...data.payload,
                            timestamp: data.time || data.payload.timestamp || new Date().toISOString()
                        };
                        logsBuffer.unshift(newLog); // Thêm vào buffer
                    }

                    if (data.type === 'NEW_ALERT_UI') {
                        const newAlert = {
                            id: Date.now() + Math.random().toString(36).substr(2, 9),
                            agent_id: data.agent_id,
                            ...data.payload, // payload thường chứa rule_name, severity
                            timestamp: data.time || new Date().toISOString()
                        };
                        alertsBuffer.unshift(newAlert); // Thêm vào buffer
                        
                        // Dispatch custom event for AppHeader to catch real-time alerts
                        if (typeof window !== 'undefined') {
                            window.dispatchEvent(new CustomEvent('NEW_SIEM_ALERT', { detail: newAlert }));
                        }
                    }

                    if (data.type === 'AGENT_STATUS_UPDATE') {
                        setAgentStatuses(prev => ({
                            ...prev,
                            [data.agent_id]: {
                                status: data.status,
                                last_active: data.last_active
                            }
                        }));
                    }

                    if (data.type === 'AGENTS_DISCONNECTED') {
                        setAgentStatuses(prev => {
                            const newStatuses = { ...prev };
                            data.payload.forEach(id => {
                                newStatuses[id] = {
                                    status: 'offline',
                                    last_active: new Date().toISOString()
                                };
                            });
                            return newStatuses;
                        });
                    }
                    if (data.type === 'FIM_LOGS_RESPONSE' ||
                        data.type === 'NETPRO_LOGS_RESPONSE' ||
                        data.type === 'SYSLOGS_RESPONSE' ||
                        data.type === 'APPLICATIONS_RESPONSE') {
                        setDbLogs(data.payload || []);
                    }
                } catch (err) {
                    console.error("[WS] Lỗi parse message:", err);
                }
            };

            ws.onclose = () => {
                console.log("[WS] Disconnected from Master Node");
                setIsConnected(false);
                // Reconnect logic
                reconnectTimer = setTimeout(() => {
                    console.log("[WS] Đang thử kết nối lại...");
                    connect();
                }, 3000);
            };

            ws.onerror = (err) => {
                console.warn("[WS] Error occurred (expected during page transition or reconnect):", err);
                ws.close(); // Force close to trigger onclose and reconnect
            };

            setSocket(ws);
        };

        connect();

        return () => {
            clearInterval(flushInterval);
            clearTimeout(reconnectTimer);
            if (ws) {
                ws.onclose = null; // Prevent triggering reconnect when unmounting
                ws.close();
            }
        };
    }, []);

    const clearData = useCallback(() => {
        setLogs([]);
        setAlerts([]);
        setDbLogs([]);
    }, []);

    const fetchDbLogsViaSocket = useCallback((type, agentId, timeRange) => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type, agent_id: agentId, timeRange }));
        } else {
            console.warn("[WS] Socket not open, cannot fetch DB logs:", type, agentId);
        }
    }, [socket]);

    return { socket, isConnected, logs, alerts, agentStatuses, clearData, dbLogs, setDbLogs, fetchDbLogsViaSocket };
};
