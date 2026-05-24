import { useState, useEffect, useCallback } from 'react';

export const useDashboardSocket = () => {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [logs, setLogs] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [agentStatuses, setAgentStatuses] = useState({});

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Default UI Port is 6001. We construct WS URL based on MASTER_URL or default to localhost
        const masterUrl = process.env.NEXT_PUBLIC_MASTER_URL || "http://localhost:3000";
        let wsUrl = "ws://localhost:6001";
        try {
            const url = new URL(masterUrl);
            wsUrl = `ws://${url.hostname}:6001`;
        } catch (e) {}

        let ws = null;
        let reconnectTimer = null;

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
                        setLogs(prev => {
                            const newLog = {
                                id: Date.now() + Math.random().toString(36).substr(2, 9),
                                agent_id: data.agent_id,
                                ...data.payload,
                                timestamp: data.time || data.payload.timestamp || new Date().toISOString()
                            };
                            return [newLog, ...prev].slice(0, 500); // Lưu tối đa 500 bản ghi mới nhất
                        });
                    }

                    if (data.type === 'NEW_ALERT_UI') {
                        setAlerts(prev => {
                            const newAlert = {
                                id: Date.now() + Math.random().toString(36).substr(2, 9),
                                agent_id: data.agent_id,
                                ...data.payload, // payload thường chứa rule_name, severity
                                timestamp: data.time || new Date().toISOString()
                            };
                            return [newAlert, ...prev].slice(0, 100);
                        });
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
                console.error("[WS] Error:", err);
                ws.close(); // Force close to trigger onclose and reconnect
            };

            setSocket(ws);
        };

        connect();

        return () => {
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
    }, []);

    return { socket, isConnected, logs, alerts, agentStatuses, clearData };
};
