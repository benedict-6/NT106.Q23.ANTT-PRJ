package main

import (
	"bytes"
	"encoding/json"
	"log"
	"net"
	"os/exec"
	"time"
)

const socketPath = "/tmp/agent_queue.sock"

type Event struct {
	Type     string                 `json:"type"`
	Metadata map[string]interface{} `json:"metadata"`
}

func parsePackages(raw string) []map[string]string {
	lines := bytes.Split([]byte(raw), []byte("\n"))

	var result []map[string]string

	for _, line := range lines {
		if len(line) == 0 {
			continue
		}

		var pkg map[string]string
		err := json.Unmarshal(line, &pkg)
		if err != nil {
			continue
		}

		result = append(result, pkg)
	}

	return result
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
		log.Println("SoftwareCollector: Connection Failed. Retrying in 2 seconds...")
		time.Sleep(2 * time.Second)
	}
	defer conn.Close()
	log.Println("SoftwareCollector: Connected to agentCollector")

	for {
		// Use dpkg-query to list packages
		cmd := exec.Command("sh", "-c", `dpkg-query -W -f='{"name":"${binary:Package}","version":"${Version}"}\n'`)
		var out bytes.Buffer
		cmd.Stdout = &out
		err := cmd.Run()

		if err != nil {
			log.Printf("SoftwareCollector: dpkg-query failed: %v", err)
		} else {
			packages := parsePackages(out.String())

			event := Event{
				Type: "software_list",
				Metadata: map[string]interface{}{
					"packages": packages,
					"timestamp": time.Now().UTC().Format("2006-01-02T15:04:05.000Z"),
				},
			}

			data, _ := json.Marshal(event)
			data = append(data, '\n')

			for {
				_, err = conn.Write(data)
				if err == nil {
					break
				}

				log.Println("SoftwareCollector: Send failed. Reconnecting...")
				time.Sleep(2 * time.Second)

				conn.Close()

				for {
					conn, err = net.Dial("unix", socketPath)
					if err == nil {
						log.Println("SoftwareCollector: Reconnected")
						break
					}
					time.Sleep(2 * time.Second)
				}
			}
		}

		// Collect every 12 hour
		time.Sleep(12 * time.Hour)
	}
}
