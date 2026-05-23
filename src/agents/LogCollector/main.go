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
	"strings"
	"time"
)

const socketPath = "/tmp/agent_queue.sock"

var logFilePaths = []string{
	"/var/log/auth.log",
	"/var/log/audit/audit.log",
	"/var/log/syslog",
}

type Event struct {
	Type     string                 `json:"type"`
	Metadata map[string]interface{} `json:"metadata"`
}

func parseLogLine(line string, filePath string) Event {
	switch filePath {
	case "/var/log/auth.log":
		return parseAuthLog(line, filePath)

	case "/var/log/syslog":
		return parseSyslog(line, filePath)

	case "/var/log/audit/audit.log":
		return parseAuditLog(line, filePath)

	default:
		return fallback(line, filePath)
	}
}

func fallback(line, filePath string) Event {
	metadata := map[string]interface{}{
		"timestamp": time.Now().Format(time.RFC3339),
		"file":      filePath,
		"log":       line,
	}
	return Event{
		Type:     "log_monitoring",
		Metadata: metadata,
	}
}

// audit.log phân tích theo key = value
func parseAuditLog(line, filePath string) Event {
	meta := map[string]interface{}{
		"file":     filePath,
		"type_log": "auditLog",
	}

	// split nhưng giữ nguyên chuỗi có dấu '
	parts := strings.Fields(line)

	for _, part := range parts {
		if !strings.Contains(part, "=") {
			continue
		}

		kv := strings.SplitN(part, "=", 2)
		if len(kv) != 2 {
			continue
		}

		key := kv[0]
		val := strings.Trim(kv[1], "\"")

		if val == "?" || key == "hostname" || key == "addr" {
			continue
		}

		if key == "AUID" {
			continue
		}

		val = strings.Trim(val, "'")
		val = strings.ReplaceAll(val, "\u001d", "")

		if num, err := strconv.Atoi(val); err == nil {
			meta[key] = num
		} else {
			meta[key] = val
		}
	}

	// Parse audit timestamp từ trường msg=audit(1234567890.123:456)
	if msg, ok := meta["msg"].(string); ok {
		if strings.HasPrefix(msg, "audit(") {
			inner := strings.TrimPrefix(msg, "audit(")
			inner = strings.Split(inner, ")")[0]
			parts := strings.Split(inner, ".")
			if len(parts) >= 1 {
				if sec, err := strconv.ParseInt(parts[0], 10, 64); err == nil {
					meta["timestamp"] = time.Unix(sec, 0).Format("2006-01-02T15:04:05.000Z")
				}
			}
		}
	}
	if _, ok := meta["timestamp"]; !ok {
		meta["timestamp"] = time.Now().Format("2006-01-02T15:04:05.000Z")
	}

	if uid, ok := meta["uid"]; ok {
		meta["user_id"] = uid
	}

	if acct, ok := meta["acct"]; ok {
		meta["user"] = acct
	}

	if exe, ok := meta["exe"]; ok {
		meta["process"] = exe
	}

	if res, ok := meta["res"]; ok {
		meta["result"] = res
	}

	if t, ok := meta["type"]; ok {
		meta["action"] = t
	}

	return Event{
		Type:     "log_monitoring",
		Metadata: meta,
	}
}

// Regex phân tích cho syslog
var syslogRegex = regexp.MustCompile(`^(?P<log_time>[A-Z][a-z]{2}\s+\d+\s\d{2}:\d{2}:\d{2})\s+(?P<host>\S+)\s+(?P<service>\S+)(?:\[(?P<pid>\d+)\])?:\s+(?P<message>.+)`)

func parseSyslogTime(raw string) string {
	t, err := time.Parse("Jan  2 15:04:05", raw)
	if err != nil {
		t, err = time.Parse("Jan 2 15:04:05", raw)
	}
	if err != nil {
		return time.Now().Format(time.RFC3339)
	}
	// Gán năm hiện tại vì syslog không ghi năm
	now := time.Now()
	t = time.Date(now.Year(), t.Month(), t.Day(), t.Hour(), t.Minute(), t.Second(), 0, now.Location())
	return t.Format(time.RFC3339)
}

func parseSyslog(line, filePath string) Event {
	meta := map[string]interface{}{
		"file":     filePath,
		"type_log": "syslog",
	}

	match := syslogRegex.FindStringSubmatch(line)
	if match != nil {
		for i, name := range syslogRegex.SubexpNames() {
			if i != 0 && name != "" && match[i] != "" {
				if name == "log_time" {
					meta["timestamp"] = parseSyslogTime(match[i])
				} else if name == "pid" {
					if val, err := strconv.Atoi(match[i]); err == nil {
						meta[name] = val
					} else {
						meta[name] = match[i]
					}
				} else {
					meta[name] = match[i]
				}
			}
		}

		return Event{
			Type:     "log_monitoring",
			Metadata: meta,
		}
	}

	return fallback(line, filePath)
}

// Regex phân tích chi tiết log sshd và sudo của auth log
var sshdRegex = regexp.MustCompile(`^(?P<log_time>[A-Z][a-z]{2}\s+\d+\s\d{2}:\d{2}:\d{2})\s+(?P<host>\S+)\s+(?P<service>sshd)\[(?P<pid>\d+)\]:\s+(?P<action>Accepted\s+\S+|Failed\s+\S+|Invalid user|Disconnected|Connection closed)(?:\s+for\s+(?:invalid user\s+)?(?P<user>\S+))?\s+from\s+(?P<src_ip>\S+)\s+port\s+(?P<port>\d+)`)

var sudoRegex = regexp.MustCompile(`sudo:.*COMMAND=(?P<cmd>.+)`)

func parseAuthLog(line, filePath string) Event {
	meta := map[string]interface{}{
		"file": filePath,
	}

	// SSHD
	if match := sshdRegex.FindStringSubmatch(line); match != nil {
		meta["type_log"] = "sshd"
		for i, name := range sshdRegex.SubexpNames() {
			if i != 0 && name != "" && match[i] != "" {
				if name == "log_time" {
					meta["timestamp"] = parseSyslogTime(match[i])
				} else if name == "pid" || name == "port" {
					if val, err := strconv.Atoi(match[i]); err == nil {
						meta[name] = val
					} else {
						meta[name] = match[i]
					}
				} else {
					meta[name] = match[i]
				}
			}
		}

		return Event{
			Type:     "log_monitoring",
			Metadata: meta,
		}
	}

	// SUDO
	if match := sudoRegex.FindStringSubmatch(line); match != nil {
		meta["command"] = match[1]
		meta["type_log"] = "sudo"
		meta["timestamp"] = time.Now().Format(time.RFC3339)

		return Event{
			Type:     "log_monitoring",
			Metadata: meta,
		}
	}

	return fallback(line, filePath)
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
