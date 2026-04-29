package main

import (
	"bufio"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"os/exec"
	"strings"
	"time"
)

const socketPath = "/tmp/agent_queue.sock"

type Event struct {
	Type     string                 `json:"type"`
	Metadata map[string]interface{} `json:"metadata"`
}

func main() {
	var conn net.Conn
	var err error

	// Try to connect to socket with retry
	for {
		conn, err = net.Dial("unix", socketPath)
		if err == nil {
			break
		}
		log.Println("NetProCollector: Connection Failed. Retrying in 2 seconds...")
		time.Sleep(2 * time.Second)
	}
	defer conn.Close()
	log.Println("NetProCollector: Connected to agentCollector Unix socket.")

	// Run ecli
	cmd := exec.Command(
		"./ebpf/tools/ecli",
		"run",
		"--json",
		"./ebpf/package.json",
	)

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		log.Fatalf("NetProCollector: Failed to create stdout pipe: %v", err)
	}

	if err := cmd.Start(); err != nil {
		log.Fatalf("NetProCollector: Failed to start ecli: %v", err)
	}

	reader := bufio.NewScanner(stdout)
	for reader.Scan() {
		line := strings.TrimSpace(reader.Text())

		if len(line) == 0 || line[0] != '{' {
			continue
		}

		var meta map[string]interface{}
		if err := json.Unmarshal([]byte(line), &meta); err != nil {
			continue
		}

		delete(meta, "_pad1")

		// ---------------- protocol ----------------
		if p, ok := meta["protocol"].(float64); ok {
			switch int(p) {
			case 6:
				meta["protocol"] = "TCP"
			case 17:
				meta["protocol"] = "UDP"
			default:
				delete(meta, "protocol")
			}
		}

		// ---------------- family ----------------
		if f, ok := meta["family"].(float64); ok {
			switch int(f) {
			case 2:
				meta["family"] = "IPv4"
			case 10:
				meta["family"] = "IPv6"
			default:
				delete(meta, "family")
			}
		}

		// ---------------- event (FIX QUAN TRỌNG) ----------------
		if t, ok := meta["type"].(float64); ok {
			switch int(t) {
			case 0:
				meta["event"] = "TCP_CONNECT"
			case 1:
				meta["event"] = "TCP_ACCEPT"
			case 2:
				meta["event"] = "TCP_STATE"
			case 3:
				meta["event"] = "UDP_SEND"
			case 4:
				meta["event"] = "UDP_RECV"
			case 5:
				meta["event"] = "PROC_FORK"
			case 6:
				meta["event"] = "PROC_EXEC"
			case 7:
				meta["event"] = "PROC_EXIT"
			default:
				meta["event"] = fmt.Sprintf("UNKNOWN(%d)", int(t))
			}
		}
		delete(meta, "type")

		eventName, _ := meta["event"].(string)

		// ---------------- state (chỉ giữ khi TCP_STATE) ----------------
		if st, ok := meta["state"].(float64); ok && eventName == "TCP_STATE" {
			switch int(st) {
			case 1:
				meta["state"] = "ESTABLISHED"
			case 2:
				meta["state"] = "SYN_SENT"
			case 3:
				meta["state"] = "SYN_RECV"
			case 4:
				meta["state"] = "FIN_WAIT1"
			case 5:
				meta["state"] = "FIN_WAIT2"
			case 6:
				meta["state"] = "TIME_WAIT"
			case 7:
				meta["state"] = "CLOSE"
			case 8:
				meta["state"] = "CLOSE_WAIT"
			case 9:
				meta["state"] = "LAST_ACK"
			case 10:
				meta["state"] = "LISTEN"
			case 11:
				meta["state"] = "CLOSING"
			case 12:
				meta["state"] = "NEW_SYN_RECV"
			default:
				delete(meta, "state")
			}
		} else {
			delete(meta, "state")
		}

		// ---------------- IP (FIX endian + rename) ----------------
		if s, ok := meta["saddr"].(float64); ok && s != 0 {
			ip := make(net.IP, 4)
			binary.BigEndian.PutUint32(ip, uint32(s))
			meta["src_ip"] = ip.String()
		}
		delete(meta, "saddr")

		if d, ok := meta["daddr"].(float64); ok && d != 0 {
			ip := make(net.IP, 4)
			binary.BigEndian.PutUint32(ip, uint32(d))
			meta["dst_ip"] = ip.String()
		}
		delete(meta, "daddr")

		// ---------------- timestamp (GIỮ event time) ----------------
		if ts, ok := meta["timestamp"].(float64); ok && ts > 0 {
			t := time.Unix(0, int64(ts)).UTC()
			meta["timestamp"] = t.Format(time.RFC3339)
		} else {
			meta["timestamp"] = time.Now().UTC().Format(time.RFC3339)
		}

		// ---------------- clean field rỗng ----------------
		for k, v := range meta {
			if str, ok := v.(string); ok && str == "" {
				delete(meta, k)
			}
		}

		event := Event{
			Type:     "net_pro",
			Metadata: meta,
		}

		data, err := json.Marshal(event)
		if err != nil {
			continue
		}
		data = append(data, '\n')

		// send socket
		for {
			_, err = conn.Write(data)
			if err == nil {
				break
			}

			log.Println("NetProCollector: Send failed. Retrying in 2 seconds...")
			time.Sleep(2 * time.Second)

			conn.Close()
			for {
				conn, err = net.Dial("unix", socketPath)
				if err == nil {
					break
				}
				time.Sleep(2 * time.Second)
			}
		}
	}

	if err := cmd.Wait(); err != nil {
		log.Printf("NetProCollector: ecli finished with error: %v", err)
	}
}
