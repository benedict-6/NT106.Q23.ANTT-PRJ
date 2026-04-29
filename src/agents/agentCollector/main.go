package main

import (
	"bufio"
	"bytes"
	"compress/gzip"
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
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
	AgentID   string `json:"agent_id"`
	SecretKey string `json:"secret_key"`
	ServerURL string `json:"server_url"`
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

	listener, err := net.Listen("unix", socketPath)
	if err != nil {
		log.Fatalf("Listen error: %v", err)
	}
	defer listener.Close()

	log.Printf("Listening on Unix socket: %s", socketPath)
	os.Chmod(socketPath, 0777)

	dataCh := make(chan []byte, 1000)

	// Worker to process and send data
	go dataProcessor(dataCh)

	// Handle graceful shutdown
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigCh
		log.Println("Stopping agentCollector...")
		listener.Close()
		os.Exit(0)
	}()

	for {
		conn, err := listener.Accept()
		if err != nil {
			log.Printf("Accept error: %v", err)
			continue
		}
		go handleConnection(conn, dataCh)
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

	client := &http.Client{Timeout: 10 * time.Second}
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
	scanner := bufio.NewScanner(conn)
	for scanner.Scan() {
		b := scanner.Bytes()
		if len(b) > 0 {
			var msg AgentMessage
			if err := json.Unmarshal(b, &msg); err == nil {
				bCopy := make([]byte, len(b))
				copy(bCopy, b)
				dataCh <- bCopy
			}
		}
	}
}

func dataProcessor(dataCh <-chan []byte) {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	var batch [][]byte

	for {
		select {
		case msg := <-dataCh:
			batch = append(batch, msg)
		case <-ticker.C:
			if len(batch) > 0 {
				sendBatch(batch)
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

	// 3. Encrypt via AES-GCM
	encrypted, err := encrypt(compressed.Bytes(), []byte(currentConfig.SecretKey))
	if err != nil {
		return
	}

	// 4. Send to server
	req, err := http.NewRequest("POST", currentConfig.ServerURL+"/api/agent/upload", bytes.NewReader(encrypted))
	if err != nil {
		return
	}

	req.Header.Set("Content-Type", "application/octet-stream")
	req.Header.Set("Content-Encoding", "aes-gcm")

	// Thêm Session Token vào Header để xác thực
	token := currentConfig.SessionToken
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	client := &http.Client{Timeout: 10 * time.Second}
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

func encrypt(plaintext, key []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	aesgcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	nonce := make([]byte, aesgcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, err
	}

	ciphertext := aesgcm.Seal(nonce, nonce, plaintext, nil)
	return ciphertext, nil
}
