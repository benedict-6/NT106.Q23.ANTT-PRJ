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

	// Kết nối tới Unix socket của agentCollector
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

	lastPackages := make(map[string]string)
	lastFullScan := time.Now().Add(-24 * time.Hour) // Đảm bảo lần đầu tiên sẽ gửi full list

	for {
		// Quét toàn bộ phần mềm hiện tại
		cmd := exec.Command("sh", "-c", `dpkg-query -W -f='{"name":"${binary:Package}","version":"${Version}"}\n'`)
		var out bytes.Buffer
		cmd.Stdout = &out
		err := cmd.Run()

		if err != nil {
			log.Printf("SoftwareCollector: dpkg-query failed: %v", err)
			time.Sleep(1 * time.Minute)
			continue
		}

		currentPackages := parsePackages(out.String())
		currentMap := make(map[string]string)
		var newOrUpdated []map[string]string

		for _, pkg := range currentPackages {
			name := pkg["name"]
			version := pkg["version"]
			currentMap[name] = version

			if oldVersion, exists := lastPackages[name]; !exists || oldVersion != version {
				newOrUpdated = append(newOrUpdated, pkg)
			}
		}

		now := time.Now()
		is12HoursPassed := now.Sub(lastFullScan) >= 12*time.Hour

		var packagesToSend []map[string]string

		if is12HoursPassed {
			log.Println("SoftwareCollector: 12 hours passed or initial scan. Sending FULL software list.")
			packagesToSend = currentPackages
			lastFullScan = now
		} else if len(newOrUpdated) > 0 {
			log.Printf("SoftwareCollector: Detected %d NEW or UPDATED packages. Sending PARTIAL software list.\n", len(newOrUpdated))
			packagesToSend = newOrUpdated
		}

		if len(packagesToSend) > 0 {
			event := Event{
				Type: "software_list",
				Metadata: map[string]interface{}{
					"packages":  packagesToSend,
					"timestamp": now.UTC().Format("2006-01-02T15:04:05.000Z"),
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

			// Cập nhật lại state sau khi gửi thành công
			lastPackages = currentMap
		}

		// Quét mỗi phút để kịp thời phát hiện app mới, nhưng chỉ gửi lên khi có app mới hoặc khi đủ 12 tiếng
		time.Sleep(1 * time.Minute)
	}
}
