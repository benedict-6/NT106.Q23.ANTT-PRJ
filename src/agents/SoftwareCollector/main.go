package main

import (
	"bytes"
	"log"
	"net"
	"os/exec"
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
		log.Println("SoftwareCollector: Connection Failed. Retrying in 2 seconds...")
		time.Sleep(2 * time.Second)
	}
	defer conn.Close()
	log.Println("SoftwareCollector: Connected to agentCollector")

	for {
		// Use dpkg-query to list packages
		cmd := exec.Command("sh", "-c", "dpkg-query -W -f='{\"name\": \"${binary:Package}\", \"version\": \"${Version}\"},'")
		var out bytes.Buffer
		cmd.Stdout = &out
		err := cmd.Run()

		if err != nil {
			log.Printf("SoftwareCollector: dpkg-query failed: %v", err)
		} else {
			packages := out.String()
			// Remove trailing comma
			if len(packages) > 0 && packages[len(packages)-1] == ',' {
				packages = packages[:len(packages)-1]
			}

			// Since the output is a comma-separated string of JSON objects, we can construct the JSON string directly
			// or parse it. For simplicity and to match the C++ version, we construct it directly.
			payloadStr := `{"type": "software_list", "metadata": {"packages": [` + packages + `]}}` + "\n"

			_, err = conn.Write([]byte(payloadStr))
			if err != nil {
				log.Printf("SoftwareCollector: Send failed: %v", err)
				break
			}
		}

		// Collect every 60 seconds
		time.Sleep(60 * time.Second)
	}
}
