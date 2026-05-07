// Fake data for testing & illustrating
export const topAgentsData = [
  { name: 'DL1224LINUX02', value: 450, color: '#882D30' },
  { name: 'ubuntu-sam47', value: 120, color: '#3E769D' },
  { name: 'DL1224MAC', value: 80, color: '#D15886' },
];

export const eventLocationData = [
  { name: 'Jan', syslog: 1281271, journald: 135920, virustotal: 45000, audit: 12000 },
  { name: 'Feb', syslog: 320000, journald: 150000, virustotal: 50000, audit: 15000 },
  { name: 'Mar', syslog: 290000, journald: 140000, virustotal: 48000, audit: 13000 },
  { name: 'Apr', syslog: 150000, journald: 150000, virustotal: 60000, audit: 10000 },
  { name: 'May', syslog: 250000, journald: 120000, virustotal: 30000, audit: 17000 },
];

export const criticalEvents = [
  { id: 1, description: 'CVE-2021-47348 affects linux-image-5.4.0-204-generic', level: 13, count: 1 },
  { id: 2, description: 'CVE-2021-47378 affects linux-image-5.4.0-204-generic', level: 13, count: 1 },
  { id: 3, description: 'CVE-2023-52735 affects linux-image-5.4.0-204-generic', level: 13, count: 1 },
  { id: 4, description: 'CVE-2024-38541 affects linux-image-5.15.0-130-generic', level: 13, count: 1 },
  { id: 5, description: 'CVE-2024-38541 affects linux-image-5.4.0-204-generic', level: 13, count: 1 },
];

export const highEvents = [
  { id: 1, description: 'Sysmon - Event 5: Process terminated -', level: 10, count: 49855 },
  { id: 2, description: 'Sysmon - Event 1: Process creation /usr/sbin/sshd', level: 10, count: 43415 },
  { id: 3, description: 'Sysmon - Event 5: Process terminated /usr/sbin/sshd', level: 10, count: 43337 },
  { id: 4, description: 'Sysmon - Event 1: Process creation /usr/bin/dash', level: 10, count: 19754 },
  { id: 5, description: 'Sysmon - Event 5: Process terminated /usr/bin/dash', level: 10, count: 19579 },
];

export const locationItems = [
  { name: '/var/log/syslog', color: '#882D30'},
  { name: 'journald', color: '#3E769D' },
  { name: 'virustotal', color: '#D15886' },
  { name: '/var/log/audit/audit.l...', color: '#6B4E71' },
  { name: '/var/log/auth.log', color: '#A67C8E' },
  { name: '/var/log/secure', color: '#845EC2' },
  { name: 'vulnerability-detector', color: '#D65DB1' },
  { name: '/var/log/httpd/acce...', color: '#C49102' },
  { name: 'Wazuh-AWS', color: '#D3A588' },
  { name: 'github', color: '#F38181' },
  { name: 'office365', color: '#95E1D3' },
  { name: '/var/log/httpd/error...', color: '#F28F8F' },
  { name: '/var/log/suricata/ev...', color: '#BDE4F4' },
  { name: 'WinEvtLog', color: '#D1D1D1' },
  { name: 'EventChannel', color: '#FFD3B6' },
  { name: 'macos', color: '#D5AAFF' },
  { name: 'rootcheck', color: '#C8C6A7' },
  { name: 'wazuh-agent', color: '#92A9BD' },
  { name: 'syscheck', color: '#F8F1F1' },
  { name: '/var/log/kern.log', color: '#E5D68A' },
];

export const mockData = {
  account: {
    user_id: 'root001',
    username: 'R00T U53R',
    password: 'khonggiquyhondoclaptudo',
    role: 'root',
    created_at: '30-4-2026'
  },

  servers: [
    { server_id: 'root001', ip_address: '19.5.18.90', node_type: 'master', status: 'active' },
    { server_id: 'work001', ip_address: '30.4.19.75', node_type: 'worker', status: 'active' },
    { server_id: 'root002', ip_address: '2.9.19.45', node_type: 'master', status: 'inactive' },
  ],

  agents: [
  { 
    agent_id: 'a1f3c9d2', mac: '08:00:27:ab:1c:de', ip: '192.168.1.101', name: 'ubuntu-web-01', status: 'online',
    description: 'Nginx web server', 
    authToken: 'tok_91af3c', 
    key: '6f8a1c9b2e4d7f3a5c8e0b1a9d2f6c4e7a1b3c5d9e0f2a4c6b8d1e3f5a7c9b2', 
    keyIV: '9a3f6c1b7d2e4a8f0c1e2b3d', 
    keyAuthTag: '4f9c2a7b1e3d5f6a8c0b2d4e6f1a3c9e' 
  },

  { 
    agent_id: 'b7d4e8a5', mac: '00:1A:2B:3C:4D:5E', ip: '192.168.1.115', name: 'win-client-02', status: 'offline',
    description: 'Employee workstation',
    authToken: 'tok_72bc9e', 
    key: '1a3c5e7f9b2d4c6e8a0f1b3d5c7e9a2b4c6d8e0f2a4b6c8d1e3f5a7b9c2d4e6', 
    keyIV: '7c1e9b3a5d2f4a6c8e0b1d3f', 
    keyAuthTag: 'a3f5c7e9b1d2a4c6e8f0b2d4c6a8e1f3' 
  },
  
  {
    agent_id: 'c9a2b6f1', mac: '52:54:00:12:34:56', ip: '10.0.0.23', name: 'db-node-01', status: 'online',
    description: 'PostgreSQL database node',
    authToken: 'tok_55ff21', 
    key: '9e2a4c6b8d1f3a5c7e0b2d4f6a8c1e3f5b7d9a2c4e6f8b0d1c3a5e7f9b2d4c6', 
    keyIV: '2d4f6a8c1e3f5b7d9a2c4e6f', 
    keyAuthTag: 'c6e8f0b2d4c6a8e1f3a5c7e9b1d2a4c6'
  }
],

  users: [
    { user_id: 'u-550e8400', username: 'admin_root', role: 'admin', created_at: '2024-04-20 10:00', hash: 'khonggiquyhondoclap' },
    { user_id: 'u-e8400b12', username: 'viewer_01', role: 'viewer', created_at: '2024-04-21 14:20', hash: 'tuhaolanguoiVietNam' },
  ],
  applications: [
    { app_id: 'app-991', agent_id: '8f2a-b1c3', software_name: 'Nginx Proxy', version: '1.24.0' },
    { app_id: 'app-992', agent_id: '8f2a-b1c3', software_name: 'Redis Cache', version: '7.0.11' },
  ],
  process_logs: [
    { pid: 1402, agent_id: '8f2a-b1c3', process_name: 'systemd', status: 'Running', user: 'SYSTEM', cmd_line: '/usr/lib/systemd/systemd --switched-root' },
    { pid: 2291, agent_id: '4d1e-f4a1', process_name: 'python3', status: 'Running', user: 'Admin', cmd_line: 'python3 data_aggregator.py' },
  ],
  network_logs: [
    { agent_id: '8f2a-b1c3', src_ip: '192.168.1.102', dest_ip: '8.8.8.8', protocol: 'TCP', dest_port: 443, connection_cnt: 12, pid: 1402 },
    { agent_id: '4d1e-f4a1', src_ip: '10.0.0.45', dest_ip: '172.16.0.1', protocol: 'UDP', dest_port: 53, connection_cnt: 5, pid: 2291 },
  ],

  file_logs: [
    { agent_id: '8f2a-b1c3', file_path: '/etc/nginx/nginx.conf', change_type: 'Modified', permission: 'Read/Write', created_at: '2024-04-29 09:12' },
    { agent_id: '4d1e-f4a1', file_path: '/var/www/html/index.php', change_type: 'Created', permission: 'Read', created_at: '2024-04-29 08:45' },
    { agent_id: '4d1e-f4a1', file_path: '/root/conf', change_type: 'Deleted', permission: 'Read/Write/Execute', created_at: '2024-04-28 08:40' },
  ],

  warning: [
    { rule_id: '001', 
      description: 'Suspicious outbound connection on uncommon port 4444 (possible reverse shell)', 
      target_type: 'port', target_value: '4444', priority_level: 'critical', created_by: 'system'
    },
    { rule_id: '002', 
      description: 'High-risk process execution detected: nc (netcat) often used for backdoor communication', 
      target_type: 'process', target_value: 'nc', priority_level: 'critical', created_by: 'system'
    },
    { rule_id: '003', 
      description: 'Connection to known malicious IP address detected', 
      target_type: 'network', target_value: '185.220.101.45', priority_level: 'critical', created_by: 'monitor-team2'
    },
    { rule_id: '004', 
      description: 'Execution of privilege escalation tool: mimikatz', 
      target_type: 'process', target_value: 'mimikatz.exe', priority_level: 'critical', created_by: 'monitor-team2'
    },
    { rule_id: '005', 
      description: 'Multiple connections detected on port 3389 (possible brute force RDP attack)', 
      target_type: 'port', target_value: '3389', priority_level: 'critical', created_by: 'system'
    },
  ],

  detailLog: [
    {time: "14:40:05", type: "WARNING",  msg: "Integrity check failed for /tmp/tmp_sys.log - Auto-healing..."},
    {time: "14:41:12", type: "WARNING",  msg: "Unexpected permission change on /var/www/html/index.php"},
    {time: "14:42:08", type: "WARNING",  msg: "New user 'temp_admin' created without proper authorization"},
    {time: "14:43:00", type: "CRITICAL", msg: "Unauthorized access attempt detected from 192.168.1.55"},
    {time: "14:43:01", type: "WARNING",  msg: "Firewall rules updated: 192.168.1.55 blacklist permanent"},
    {time: "14:44:15", type: "WARNING",  msg: "Suspicious cron job added: /tmp/.x/cleanup.sh"},
    {time: "14:45:03", type: "WARNING",  msg: "High frequency requests detected on /api/login endpoint"},
    {time: "14:46:05", type: "WARNING",  msg: "Multiple failed login attempts detected for user 'root'"},
    {time: "14:46:07", type: "WARNING",  msg: "Abnormal SSH traffic pattern from 192.168.1.88"},
    {time: "14:46:09", type: "CRITICAL", msg: "Brute-force attack suspected from 192.168.1.88"},
    {time: "14:46:10", type: "WARNING",  msg: "Auto-mitigation triggered: IP 192.168.1.88 blocked"},
    {time: "14:47:22", type: "WARNING",  msg: "Execution of unknown binary /tmp/kworker detected"},
    {time: "14:47:25", type: "CRITICAL", msg: "Malicious binary execution confirmed (hash mismatch)"},
    {time: "14:48:03", type: "WARNING",  msg: "Unusual file access detected: /etc/shadow"},
    {time: "14:48:07", type: "CRITICAL", msg: "Privilege escalation attempt blocked for user 'guest'"},
    {time: "14:49:12", type: "WARNING",  msg: "High outbound traffic detected to unknown destination 185.23.44.12"},
    {time: "14:49:15", type: "CRITICAL", msg: "Potential data exfiltration attempt detected"},
    {time: "14:49:45", type: "WARNING",  msg: "DNS tunneling pattern detected in outbound queries"},
    {time: "14:49:48", type: "CRITICAL", msg: "Covert channel communication confirmed via DNS"},
    {time: "14:50:01", type: "WARNING",  msg: "Process 'nc.exe' spawned suspicious network connection"},
    {time: "14:50:03", type: "CRITICAL", msg: "Reverse shell activity confirmed on port 4444"}
  ]
};