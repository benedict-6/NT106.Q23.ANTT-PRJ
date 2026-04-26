package main

import (
	"bufio"
	"encoding/json"
	"io"
	"log"
	"net"
	"os"
	"path/filepath"
	"time"
)

const socketPath = "/tmp/agent_queue.sock"

var logFilePaths = []string{
	"/var/log/auth.log",
	"/var/log/audit/audit.log",
	"/var/log/syslog",
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

			payload := map[string]interface{}{
				"type": filepath.Base(filePath),
				"metadata": map[string]string{
					"file": filePath,
					"log":  line,
				},
			}

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
