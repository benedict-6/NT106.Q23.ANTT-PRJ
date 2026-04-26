package main

import (
	"bufio"
	"log"
	"net"
	"os/exec"
	"strings"
	"time"
)

const socketPath = "/tmp/agent_queue.sock"

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

	// Run ecli to load and run the ebpf program
	cmd := exec.Command("./ebpf/tools/ecli", "run", "./ebpf/package.json")
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

		// Eunomia BPF ecli typically outputs some info logs before starting with JSON.
		// Usually json starts with '{'
		if len(line) == 0 || line[0] != '{' {
			continue
		}

		payloadStr := `{"type": "net_pro", "metadata": ` + line + `}` + "\n"

		// Send to Unix Socket
		for {
			_, err = conn.Write([]byte(payloadStr))
			if err == nil {
				break
			}
			log.Println("NetProCollector: Send failed. Retrying in 2 seconds...")
			time.Sleep(2 * time.Second)

			// Reconnect
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
