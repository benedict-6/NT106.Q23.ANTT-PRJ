package main

import (
	"bufio"
	"bytes"
	"compress/gzip"
	"crypto/hmac"
	"crypto/sha256"
	"crypto/tls"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strconv"
	"syscall"
	"time"
)

const (
	socketPath = "/tmp/agent_queue.sock" // Keep socket in local folder or /tmp
	configPath = "./agent_config.json"
)

// Config được sinh từ Server khi user download agent
type AgentConfig struct {
	AgentID        string `json:"agent_id"`
	SecretKey      string `json:"secret_key"`
	ServerURL      string `json:"server_url"`
	LoadBalanceURL string `json:"lb_url"`
	// Runtime only — không lưu file
	SessionToken string `json:"-"`
}

var currentConfig AgentConfig

// Metric format sent by collectors
type AgentMessage struct {
	Type     string          `json:"type"`
	Metadata json.RawMessage `json:"metadata"`
}

func main() {
	log.Println("Starting agentCollector...")

	// 1. Đọc config (agent_id, secret_key, server_url)
	if err := loadConfig(); err != nil {
		log.Fatalf("Lỗi đọc config: %v", err)
	}
	log.Printf("Loaded config: agent_id=%s, server=%s", currentConfig.AgentID, currentConfig.ServerURL)

	// 2. Handshake HMAC-SHA256 với Master Server
	if err := performHandshake(); err != nil {
		log.Printf("[!] Handshake thất bại, sẽ thử lại sau: %v", err)
	} else {
		log.Println("Handshake thành công! Agent đã được xác thực.")
	}

	// 3. Thiết lập Unix Socket
	if err := os.RemoveAll(socketPath); err != nil {
		log.Fatalf("Failed to remove old socket file: %v", err)
	}
	os.MkdirAll(filepath.Dir(socketPath), 0755)

	listener, err := net.Listen("unix", socketPath) // yêu cầu hệ điều hành tạo 1 socket ở socketpath
	if err != nil {
		log.Fatalf("Listen error: %v", err)
	}
	defer listener.Close() //  tắt ngay khi main kết thúc

	log.Printf("Listening on Unix socket: %s", socketPath)
	os.Chmod(socketPath, 0777) // cấp quyền truy cập cho socketpath

	dataCh := make(chan []byte, 1000)

	// 4. Nhận data từ dataCh, xử lý và gửi đi
	// Worker to process and send data
	go dataProcessor(dataCh)

	// Handle graceful shutdown
	sigCh := make(chan os.Signal, 1) // tạo 1 channel để nhận tín hiệu từ hệ điều hành
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigCh
		log.Println("Stopping agentCollector...")
		listener.Close()
		os.Exit(0)
	}()

	// 5. Chấp nhận kết nối từ các collector khác
	for {
		conn, err := listener.Accept()
		if err != nil {
			log.Printf("Accept error: %v", err)
			continue
		}
		go handleConnection(conn, dataCh) // xử lý thu thập data và bơm vào dataCh
	}
}

// ---- Config & Authentication ----

func loadConfig() error {
	b, err := os.ReadFile(configPath)
	if err != nil {
		return fmt.Errorf("không tìm thấy file %s: %w\nHãy tải agent package từ Dashboard trước", configPath, err)
	}
	if err := json.Unmarshal(b, &currentConfig); err != nil {
		return fmt.Errorf("config JSON không hợp lệ: %w", err)
	}
	if currentConfig.AgentID == "" || currentConfig.SecretKey == "" || currentConfig.ServerURL == "" {
		return fmt.Errorf("config thiếu trường bắt buộc (agent_id, secret_key, server_url)")
	}
	return nil
}

func getMACAddress() string {
	interfaces, err := net.Interfaces()
	if err != nil {
		return "00:00:00:00:00:00"
	}
	for _, iface := range interfaces {
		// Bỏ qua loopback và interface không có MAC
		if iface.Flags&net.FlagLoopback != 0 || len(iface.HardwareAddr) == 0 {
			continue
		}
		// Bỏ qua interface không active
		if iface.Flags&net.FlagUp == 0 {
			continue
		}
		return iface.HardwareAddr.String()
	}
	return "00:00:00:00:00:00"
}

func getHostname() string {
	h, err := os.Hostname()
	if err != nil {
		return "unknown"
	}
	return h
}

func performHandshake() error {
	macAddr := getMACAddress()
	hostname := getHostname()
	timestamp := strconv.FormatInt(time.Now().UnixMilli(), 10)

	// Payload = MAC_Address + "|" + Timestamp
	payload := macAddr + "|" + timestamp

	// Signature = HMAC-SHA256(payload, secret_key)
	h := hmac.New(sha256.New, []byte(currentConfig.SecretKey))
	h.Write([]byte(payload))
	signature := hex.EncodeToString(h.Sum(nil))

	body, _ := json.Marshal(map[string]string{
		"agent_id":    currentConfig.AgentID,
		"mac_address": macAddr,
		"hostname":    hostname,
		"timestamp":   timestamp,
		"signature":   signature,
	})

	req, err := http.NewRequest("POST", currentConfig.ServerURL+"/api/agent/handshake", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	tr := &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	}
	client := &http.Client{Timeout: 10 * time.Second, Transport: tr}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("không thể kết nối Master Server: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("handshake thất bại [%s]: %s", resp.Status, string(respBody))
	}

	var result map[string]string
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return fmt.Errorf("không thể đọc response: %w", err)
	}

	if token, ok := result["session_token"]; ok {
		currentConfig.SessionToken = token
		log.Printf("Session token đã nhận được từ Master Server")
	} else {
		return fmt.Errorf("response không chứa session_token")
	}

	return nil
}

// ---- Data Processing ----

func handleConnection(conn net.Conn, dataCh chan<- []byte) {
	defer conn.Close()
	reader := bufio.NewReader(conn)
	for {
		line, err := reader.ReadBytes('\n')
		if len(line) > 0 {
			b := bytes.TrimSuffix(line, []byte("\n"))
			b = bytes.TrimSuffix(b, []byte("\r"))
			if len(b) > 0 {
				var msg AgentMessage
				if err := json.Unmarshal(b, &msg); err == nil {
					bCopy := make([]byte, len(b))
					copy(bCopy, b)
					dataCh <- bCopy
				}
			}
		}
		if err != nil {
			break
		}
	}
}

func dataProcessor(dataCh <-chan []byte) { // dùng goroutine bất đồng bộ để xử lý và gửi data
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	var batch [][]byte

	for {
		select {
		case msg := <-dataCh:
			batch = append(batch, msg)
		case <-ticker.C:
			if len(batch) > 0 {
				go sendBatch(batch) // thêm go để  thực hiện bất đồng bộ
				batch = nil
			}
		}
	}
}

func sendBatch(batch [][]byte) {
	var buffer bytes.Buffer
	for _, b := range batch {
		buffer.Write(b)
		buffer.WriteString("\n")
	}

	// 2. Compress via Gzip
	var compressed bytes.Buffer
	gw := gzip.NewWriter(&compressed)
	if _, err := gw.Write(buffer.Bytes()); err != nil {
		return
	}
	gw.Close()

	// 4. Send to server
	req, err := http.NewRequest("POST", currentConfig.LoadBalanceURL+"/api/agent/upload", bytes.NewReader(compressed.Bytes()))
	if err != nil {
		return
	}

	req.Header.Set("Content-Type", "application/octet-stream")
	req.Header.Set("Content-Encoding", "gzip")

	// Thêm Session Token vào Header để xác thực
	token := currentConfig.SessionToken
	if token != "" {
		req.Header.Set("authorization", "Bearer "+token)
	}

	tr := &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	}
	client := &http.Client{Timeout: 10 * time.Second, Transport: tr}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Failed to send data to server: %v", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
		log.Printf("Token hết hạn hoặc bị từ chối (401/403). Đang Handshake lại...")
		performHandshake() // Thử lấy lại token cho batch sau
	} else if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		log.Printf("Successfully sent batch of %d records", len(batch))
	} else {
		log.Printf("Server returned non-200 status: %s", resp.Status)
	}
}
