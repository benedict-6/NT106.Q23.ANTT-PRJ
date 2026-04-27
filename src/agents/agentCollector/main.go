package main

import (
	"bufio"
	"bytes"
	"compress/gzip"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"
)

const (
	socketPath    = "/tmp/agent_queue.sock" // Keep socket in local folder or /tmp
	serverBaseURL = "http://localhost:3000"
	secretKey     = "supersecretkey1234567890123456" // Used for AES payload encryption
	configPath    = "./agent_metadata.json"
)

type AgentConfig struct {
	Username    string `json:"username"`
	Password    string `json:"password"`
	AccessToken string `json:"access_token,omitempty"`
}

var currentConfig AgentConfig

// Metric format sent by C++ collectors
type AgentMessage struct {
	Type     string          `json:"type"`
	Metadata json.RawMessage `json:"metadata"`
}

func main() {
	log.Println("Starting agentCollector...")

	// 1. Quản lý Đăng ký / Đăng nhập
	err := setupAuthentication()
	if err != nil {
		log.Fatalf("Failed to setup authentication: %v", err)
	}

	// 2. Thiết lập Unix Socket
	if err := os.RemoveAll(socketPath); err != nil {
		log.Fatalf("Failed to remove old socket file: %v", err)
	}
	// Create directories if not exist
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

<<<<<<< HEAD
// // ---- Authentication Logic ----
=======
// ---- Authentication Logic ----
>>>>>>> 7e7693a (agent completed)

func setupAuthentication() error {
	// Kiểm tra xem file cấu hình có tồn tại không
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		// Chưa có, tiến hành tạo thông tin tài khoản tự động (Đăng ký)
		hostname, _ := os.Hostname()
		if hostname == "" {
			hostname = "unknown_device"
		}
<<<<<<< HEAD

=======
		
>>>>>>> 7e7693a (agent completed)
		// Random password 12 kí tự
		passBytes := make([]byte, 6)
		rand.Read(passBytes)
		randomPass := fmt.Sprintf("%x", passBytes)
<<<<<<< HEAD

=======
		
>>>>>>> 7e7693a (agent completed)
		currentConfig = AgentConfig{
			Username: "agent_" + hostname,
			Password: randomPass,
		}
<<<<<<< HEAD

=======
		
>>>>>>> 7e7693a (agent completed)
		log.Printf("[!] CHƯA CÓ CẤU HÌNH. Tiến hành Đăng ký hệ thống với Master Node...")
		if err := registerAgent(currentConfig); err != nil {
			log.Printf("Warning: Đăng ký thất bại (có thể server chưa bật). Sẽ thử lại sau: %v", err)
		} else {
			log.Printf("\n=======================================================")
			log.Printf("  ĐĂNG KÝ THÀNH CÔNG!")
			log.Printf("  Dùng tài khoản này để đăng nhập vào Web Dashboard:")
			log.Printf("  > Username : %s", currentConfig.Username)
			log.Printf("  > Password : %s", currentConfig.Password)
			log.Printf("=======================================================\n")
		}
		saveConfig() // Lưu lại ID và Pass kể cả khi chưa gọi được server
	} else {
		// Đã có, đọc file
		b, err := ioutil.ReadFile(configPath)
		if err != nil {
			return err
		}
		json.Unmarshal(b, &currentConfig)
	}

	// Sau khi đọc hoặc tạo mới, tiến hành Login lấy Token
	log.Printf("Đang tiến hành Xác thực (Login) lấy phiên bản chạy...")
	if err := loginAgent(); err != nil {
		log.Printf("Warning: Không thể login server lúc này, process vẫn sẽ chạy và tự thử lại sau: %v", err)
	} else {
		log.Printf("Xác thực hoàn tất, Server cấp quyền OK.")
	}
	return nil
}

func registerAgent(cfg AgentConfig) error {
	payload, _ := json.Marshal(map[string]string{
		"username": cfg.Username,
		"password": cfg.Password,
		"info":     "Agent Device Node",
	})
<<<<<<< HEAD

	req, err := http.NewRequest("POST", serverBaseURL+"/api/agent/register", bytes.NewReader(payload))
	if err != nil {
		return err
	}
=======
	
	req, err := http.NewRequest("POST", serverBaseURL+"/api/agent/register", bytes.NewReader(payload))
	if err != nil { return err }
>>>>>>> 7e7693a (agent completed)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
<<<<<<< HEAD
	if err != nil {
		return err
	}
=======
	if err != nil { return err }
>>>>>>> 7e7693a (agent completed)
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return fmt.Errorf("server returned status: %s", resp.Status)
	}
	return nil
}

func loginAgent() error {
	payload, _ := json.Marshal(map[string]string{
		"username": currentConfig.Username,
		"password": currentConfig.Password,
	})
<<<<<<< HEAD

	req, err := http.NewRequest("POST", serverBaseURL+"/api/agent/login", bytes.NewReader(payload))
	if err != nil {
		return err
	}
=======
	
	req, err := http.NewRequest("POST", serverBaseURL+"/api/agent/login", bytes.NewReader(payload))
	if err != nil { return err }
>>>>>>> 7e7693a (agent completed)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
<<<<<<< HEAD
	if err != nil {
		return err
	}
=======
	if err != nil { return err }
>>>>>>> 7e7693a (agent completed)
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return fmt.Errorf("server returned status: %s", resp.Status)
	}

	// Đọc response json (giả sử {"token": "xyz123"})
	var res map[string]string
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return err
	}

	if t, ok := res["token"]; ok {
		currentConfig.AccessToken = t
		saveConfig()
	} else {
		// Fallback
		currentConfig.AccessToken = "dummy-token-if-backend-not-implemented"
	}
	return nil
}

func saveConfig() {
	b, _ := json.MarshalIndent(currentConfig, "", "  ")
	ioutil.WriteFile(configPath, b, 0644)
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
	encrypted, err := encrypt(compressed.Bytes(), []byte(secretKey))
	if err != nil {
		return
	}

	// 4. Send to server
	req, err := http.NewRequest("POST", serverBaseURL+"/upload", bytes.NewReader(encrypted))
<<<<<<< HEAD
	if err != nil {
		return
	}

	req.Header.Set("Content-Type", "application/octet-stream")
	req.Header.Set("Content-Encoding", "aes-gcm")

=======
	if err != nil { return }
	
	req.Header.Set("Content-Type", "application/octet-stream")
	req.Header.Set("Content-Encoding", "aes-gcm")
	
>>>>>>> 7e7693a (agent completed)
	// Thêm Access Token vào Header để xác thực tiến trình gửi
	token := currentConfig.AccessToken
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
		log.Printf("Token hết hạn hoặc bị từ chối (401/403). Đang Login lại...")
		loginAgent() // Thử lấy lại token cho batch sau
	} else if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		log.Printf("Successfully sent batch of %d records", len(batch))
	} else {
		log.Printf("Server returned non-200 status: %s", resp.Status)
	}
}

func encrypt(plaintext, key []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
<<<<<<< HEAD
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
=======
	if err != nil { return nil, err }

	aesgcm, err := cipher.NewGCM(block)
	if err != nil { return nil, err }

	nonce := make([]byte, aesgcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil { return nil, err }
>>>>>>> 7e7693a (agent completed)

	ciphertext := aesgcm.Seal(nonce, nonce, plaintext, nil)
	return ciphertext, nil
}
