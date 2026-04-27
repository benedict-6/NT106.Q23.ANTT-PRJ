package main

import (
	"bufio"
	"encoding/json"
	"io"
	"log"
	"net"
	"os"
	"regexp"
	"strconv"
	"time"
)

const socketPath = "/tmp/agent_queue.sock"

var logFilePaths = []string{
	"/var/log/auth.log",
	"/var/log/audit/audit.log",
	"/var/log/syslog",
}

// Regex phân tích chi tiết log sshd
var sshdRegex = regexp.MustCompile(`^(?P<timestamp>[A-Z][a-z]{2}\s+\d+\s\d{2}:\d{2}:\d{2})\s+(?P<host>\S+)\s+(?P<service>sshd)\[(?P<pid>\d+)\]:\s+(?P<action>Accepted\s+\S+|Failed\s+\S+|Invalid user|Disconnected|Connection closed)(?:\s+for\s+(?:invalid user\s+)?(?P<user>\S+))?\s+from\s+(?P<src_ip>\S+)\s+port\s+(?P<port>\d+)`)

func parseLogLine(line string, filePath string) map[string]interface{} {
	match := sshdRegex.FindStringSubmatch(line)
	if match != nil {
		metadata := make(map[string]interface{})
		
		// Luôn đính kèm tên file sinh ra log
		metadata["file"] = filePath
		
		for i, name := range sshdRegex.SubexpNames() {
			if i != 0 && name != "" {
				valStr := match[i]
				if valStr == "" {
					continue // Bỏ qua nếu capture group trống (ví dụ: không có user)
				}
				// Ép kiểu pid và port sang int
				if name == "pid" || name == "port" {
					if val, err := strconv.Atoi(valStr); err == nil {
						metadata[name] = val
					} else {
						metadata[name] = valStr
					}
				} else {
					metadata[name] = valStr
				}
			}
		}

		return map[string]interface{}{
			"type":     "log_monitoring",
			"metadata": metadata,
		}
	}

	// Fallback mặc định nếu log không match với Regex (không phải sshd chuẩn)
	return map[string]interface{}{
		"type": "log_monitoring",
		"metadata": map[string]string{
			"file": filePath,
			"log":  line,
		},
	}
}

func collectLogs(filePath string, logChan chan<- []byte) {
	for {
		file, err := os.Open(filePath)
		if err != nil {
			log.Printf("LogCollector: Cannot open %s: %v. Retrying in 10s...", filePath, err)
			time.Sleep(10 * time.Second)
			continue
		}

		// Go to end of file to only read new logs
		file.Seek(0, io.SeekEnd)
		reader := bufio.NewReader(file)

		log.Printf("LogCollector: Started monitoring %s", filePath)

		for {
			line, err := reader.ReadString('\n')
			if err != nil {
				if err == io.EOF {
					time.Sleep(500 * time.Millisecond)
					continue
				}
				log.Printf("LogCollector: Read error on %s: %v", filePath, err)
				break // Thoát vòng lặp con để mở lại file (hữu ích khi log bị rotate)
			}

			if len(line) == 0 || line == "\n" {
				continue
			}

			line = line[:len(line)-1] // Remove newline

			payload := parseLogLine(line, filePath)

			data, _ := json.Marshal(payload)
			data = append(data, '\n') // Append newline

			logChan <- data
		}

		file.Close()
		time.Sleep(2 * time.Second) // Chờ một chút trước khi thử mở lại
	}
}

func main() {
	logChan := make(chan []byte, 1000)

	// Chạy mỗi file log trên một goroutine riêng biệt
	for _, file := range logFilePaths {
		go collectLogs(file, logChan)
	}

	// Vòng lặp chính xử lý kết nối socket và gửi dữ liệu
	for {
		conn, err := net.Dial("unix", socketPath)
		if err != nil {
			log.Printf("LogCollector: Connection failed: %v. Retrying in 2s...", err)
			time.Sleep(2 * time.Second)
			continue
		}
		log.Println("LogCollector: Connected to agentCollector")

		// Đọc dữ liệu từ channel và gửi qua socket
		for data := range logChan {
			_, err = conn.Write(data)
			if err != nil {
				log.Printf("LogCollector: Send failed: %v", err)
				break // Bị lỗi gửi -> Thoát vòng lặp đọc channel để kết nối lại
			}
		}

		conn.Close()
	}
}
