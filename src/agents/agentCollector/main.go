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
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
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

var (
	currentConfig AgentConfig
	tcpConn       net.Conn
	connMutex     sync.Mutex
	writeMutex    sync.Mutex // Bảo vệ đồng bộ các thao tác ghi dữ liệu xuống Socket tránh bị dính gói chéo nhau
)

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

	// Khởi chạy Keep-Alive Heartbeat cho kết nối TCP
	startHeartbeat()

	// Handle graceful shutdown
	sigCh := make(chan os.Signal, 1) // tạo 1 channel để nhận tín hiệu từ hệ điều hành
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigCh
		log.Println("Stopping agentCollector...")
		listener.Close()
		closeTCPConnection()
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
		// Đóng kết nối cũ để lần gửi tiếp theo dùng token mới kết nối lại và xác thực lại
		closeTCPConnection()
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

func getTCPConnection() (net.Conn, error) {
	connMutex.Lock()
	defer connMutex.Unlock()

	// Trả về kết nối hiện có nếu kết nối đó vẫn hoạt động (chưa bị đóng/gặp lỗi)
	if tcpConn != nil {
		return tcpConn, nil
	}

	// Trích xuất host và port từ LoadBalanceURL
	rawAddr := currentConfig.LoadBalanceURL
	if !strings.HasPrefix(rawAddr, "http://") && !strings.HasPrefix(rawAddr, "https://") && !strings.HasPrefix(rawAddr, "tcp://") {
		rawAddr = "tcp://" + rawAddr
	}

	u, err := url.Parse(rawAddr)
	if err != nil {
		return nil, fmt.Errorf("không thể parse LoadBalanceURL: %w", err)
	}

	tcpAddr := u.Host
	if tcpAddr == "" {
		return nil, fmt.Errorf("LoadBalanceURL không chứa host/port")
	}

	log.Printf("[TCP Client] Đang khởi tạo Socket và kết nối tới TCP Server: %s...", tcpAddr)
	// ĐOẠN 1: TẠO SOCKET TCP & KẾT NỐI
	// Sử dụng net.DialTimeout để tạo một kết nối Socket TCP chủ động tới địa chỉ đích.
	// Có timeout 5 giây để tránh việc chương trình bị treo nếu Server không hoạt động.
	conn, err := net.DialTimeout("tcp", tcpAddr, 5*time.Second)
	if err != nil {
		return nil, err
	}

	// Xác thực thông tin kết nối (Authentication)
	token := currentConfig.SessionToken
	if token == "" {
		conn.Close()
		return nil, fmt.Errorf("chưa có Session Token, cần handshake trước")
	}

	tokenBytes := []byte(token)
	length := uint32(len(tokenBytes))

	// Chuẩn bị Header của Frame Auth: [1 byte: Type (0x01)] + [4 bytes: Length (Độ dài Token)]
	header := make([]byte, 5)
	header[0] = 0x01 // Gói tin có loại là 0x01 (Auth Request)
	binary.BigEndian.PutUint32(header[1:5], length)

	// Thiết lập thời hạn tối đa cho việc ghi dữ liệu vào Socket (5 giây) để tránh tắc nghẽn
	conn.SetWriteDeadline(time.Now().Add(5 * time.Second))

	// ĐOẠN 2: GHI DỮ LIỆU VÀO SOCKET (GỬI AUTH HEADER & PAYLOAD)
	// Ghi 5 bytes Header chứa mã gói tin và độ dài payload xuống cổng socket
	if _, err := conn.Write(header); err != nil {
		conn.Close()
		return nil, err
	}
	// Tiếp tục ghi dữ liệu thô (JWT Session Token) nối tiếp vào luồng truyền dẫn socket
	if _, err := conn.Write(tokenBytes); err != nil {
		conn.Close()
		return nil, err
	}

	// Thiết lập thời hạn tối đa cho việc đọc dữ liệu từ Socket (5 giây) phòng trường hợp Server bị đơ
	conn.SetReadDeadline(time.Now().Add(5 * time.Second))

	// ĐOẠN 3: ĐỌC DỮ LIỆU TỪ SOCKET (NHẬN PHẢN HỒI XÁC THỰC - AUTH RESPONSE)
	// Đọc trước đúng 5 bytes đầu tiên của gói tin phản hồi (Header) để lấy thông tin Type và Length
	// io.ReadFull đảm bảo sẽ đọc đủ số byte yêu cầu, nếu socket bị ngắt nửa chừng sẽ báo lỗi ngay lập tức
	respHeader := make([]byte, 5)
	if _, err := io.ReadFull(conn, respHeader); err != nil {
		conn.Close()
		return nil, fmt.Errorf("lỗi đọc auth response header: %w", err)
	}

	// Phản hồi phản hồi xác thực phải có Type = 0x04
	if respHeader[0] != 0x04 {
		conn.Close()
		return nil, fmt.Errorf("phản hồi auth sai định dạng type: %d", respHeader[0])
	}

	// Đọc độ dài dữ liệu phản hồi (chuyển 4 bytes Big-Endian về dạng số nguyên uint32)
	respLen := binary.BigEndian.Uint32(respHeader[1:5])
	if respLen != 1 {
		conn.Close()
		return nil, fmt.Errorf("độ dài phản hồi auth không hợp lệ: %d", respLen)
	}

	// Đọc đúng số bytes payload tương ứng (ở đây là 1 byte mã trạng thái phản hồi) từ Socket
	statusByte := make([]byte, 1)
	if _, err := io.ReadFull(conn, statusByte); err != nil {
		conn.Close()
		return nil, fmt.Errorf("lỗi đọc status byte: %w", err)
	}

	// Kiểm tra kết quả xác thực từ server (0x00 là thành công)
	if statusByte[0] != 0x00 {
		conn.Close()
		// Nếu token không hợp lệ hoặc hết hạn (mã 0x02), chạy handshake HTTP nền để lấy token mới
		if statusByte[0] == 0x02 {
			log.Println("[TCP Client] Token không hợp lệ. Đang yêu cầu handshake lại...")
			go performHandshake()
		}
		return nil, fmt.Errorf("server từ chối xác thực TCP, mã lỗi: %d", statusByte[0])
	}

	log.Printf("[TCP Client] Kết nối và xác thực thành công tới %s", tcpAddr)
	tcpConn = conn

	// Khởi chạy luồng đọc dữ liệu từ Server bất đồng bộ (Nhận Pong, Alert...)
	go readLoop(conn)

	return tcpConn, nil
}

func closeTCPConnection() {
	connMutex.Lock()
	defer connMutex.Unlock()
	// Thực hiện đóng Socket an toàn và dọn dẹp biến đại diện kết nối
	if tcpConn != nil {
		tcpConn.Close()
		tcpConn = nil
		log.Println("[TCP Client] Đã đóng kết nối TCP chủ động")
	}
}

func startHeartbeat() {
	// Khởi tạo ticker gửi gói tin Ping định kỳ mỗi 30 giây để giữ kết nối không bị timeout ngắt
	ticker := time.NewTicker(30 * time.Second)
	go func() {
		for range ticker.C {
			connMutex.Lock()
			conn := tcpConn
			connMutex.Unlock()

			if conn != nil {
				// Chuẩn bị gói tin Ping: [Type: 0x03 (Ping)] + [Length: 0]
				header := make([]byte, 5)
				header[0] = 0x03
				binary.BigEndian.PutUint32(header[1:5], 0)

				// ĐOẠN 4: GHI PING HEARTBEAT VÀO SOCKET
				// Đồng bộ ghi bằng writeMutex để tránh gửi gói Ping chen giữa gói tin Logs lớn đang gửi
				writeMutex.Lock()
				conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
				_, err := conn.Write(header)
				writeMutex.Unlock()

				if err != nil {
					log.Printf("[TCP Ping] Lỗi gửi Ping: %v. Đóng kết nối để reconnect sau.", err)
					closeTCPConnection()
				}
			}
		}
	}()
}

func sendBatch(batch [][]byte) {
	// Gộp dữ liệu trong batch lại cách nhau bởi ký tự xuống dòng
	var buffer bytes.Buffer
	for _, b := range batch {
		buffer.Write(b)
		buffer.WriteString("\n")
	}

	// 2. Thực hiện nén dữ liệu bằng Gzip để tiết kiệm dung lượng đường truyền
	var compressed bytes.Buffer
	gw := gzip.NewWriter(&compressed)
	if _, err := gw.Write(buffer.Bytes()); err != nil {
		log.Printf("Lỗi nén Gzip: %v", err)
		return
	}
	gw.Close()

	// 3. Thực hiện mã hóa AES-GCM để bảo vệ dữ liệu truyền tải
	block, err := aes.NewCipher([]byte(currentConfig.SecretKey))
	if err != nil {
		log.Printf("Lỗi tạo cipher AES: %v", err)
		return
	}
	aesgcm, err := cipher.NewGCM(block)
	if err != nil {
		log.Printf("Lỗi GCM: %v", err)
		return
	}
	nonce := make([]byte, 12)
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		log.Printf("Lỗi tạo nonce: %v", err)
		return
	}

	ciphertext := aesgcm.Seal(nil, nonce, compressed.Bytes(), nil)
	finalData := append(nonce, ciphertext...) // finalData = [12 bytes Nonce] + [Mã hóa AES GCM] + [16 bytes Auth Tag]

	// 4. Gửi dữ liệu qua kết nối TCP dài hạn (Thử lại tối đa 3 lần)
	for attempt := 1; attempt <= 3; attempt++ {
		conn, err := getTCPConnection()
		if err != nil {
			log.Printf("[TCP Client] Không thể kết nối/xác thực TCP (Lần %d/3): %v", attempt, err)
			time.Sleep(2 * time.Second)
			continue
		}

		// Chuẩn bị gói tin chứa data gửi đi: [Type: 0x02 (Data)] + [Length: Độ dài dữ liệu mã hóa]
		length := uint32(len(finalData))
		header := make([]byte, 5)
		header[0] = 0x02 // Type: 0x02 đại diện cho gói tin chứa dữ liệu logs
		binary.BigEndian.PutUint32(header[1:5], length)

		// Đặt thời gian timeout truyền tải dữ liệu là 15 giây
		conn.SetWriteDeadline(time.Now().Add(15 * time.Second))
		
		// ĐOẠN 6: GHI HEADER VÀ PAYLOAD DỮ LIỆU VÀO SOCKET
		// Giải pháp khắc phục tránh Race Condition: Sử dụng writeMutex (khóa loại trừ lẫn nhau cho việc ghi).
		// Khi Agent chuẩn bị ghi Header + Payload, nó sẽ gọi writeMutex.Lock().
		// Mọi Goroutine khác (kể cả Ping Heartbeat chạy song song) muốn ghi vào Socket lúc này đều phải
		// xếp hàng đợi cho đến khi Goroutine hiện tại ghi xong trọn vẹn cả Header lẫn Payload và gọi writeMutex.Unlock().
		// Điều này đảm bảo tuyệt đối Header đi trước và Payload đi liền sau mà không bị xen ngang.
		writeMutex.Lock()
		_, errHeader := conn.Write(header)
		var errPayload error
		if errHeader == nil {
			_, errPayload = conn.Write(finalData)
		}
		writeMutex.Unlock()

		if errHeader != nil {
			log.Printf("[TCP Client] Lỗi ghi header: %v. Đóng kết nối để thử lại.", errHeader)
			closeTCPConnection()
			continue
		}

		if errPayload != nil {
			log.Printf("[TCP Client] Lỗi ghi payload: %v. Đóng kết nối để thử lại.", errPayload)
			closeTCPConnection()
			continue
		}

		log.Printf("[TCP Client] Đã gửi thành công batch gồm %d bản ghi", len(batch))
		return
	}

	log.Printf("[TCP Client] Gửi batch dữ liệu thất bại sau 3 lần thử.")
}

// readLoop lắng nghe liên tục dữ liệu phản hồi/cảnh báo từ Server qua Socket TCP thô.
func readLoop(conn net.Conn) {
	defer func() {
		log.Println("[TCP Client] Kết thúc luồng đọc từ Server.")
		closeTCPConnection()
	}()

	for {
		// Đặt ReadDeadline lớn hơn Heartbeat (45 giây) để tự phát hiện nếu mất mạng/server ngắt đột ngột
		conn.SetReadDeadline(time.Now().Add(45 * time.Second))

		// Đọc 5 bytes Header: [Type (1 byte)] + [Length (4 bytes)]
		header := make([]byte, 5)
		if _, err := io.ReadFull(conn, header); err != nil {
			if netErr, ok := err.(net.Error); ok && netErr.Timeout() {
				log.Println("[TCP Client] Timeout chờ đọc dữ liệu từ Server (Heartbeat failure).")
			} else {
				log.Printf("[TCP Client] Lỗi đọc từ Socket: %v", err)
			}
			return
		}

		packetType := header[0]
		length := binary.BigEndian.Uint32(header[1:5])

		// Đọc Payload tương ứng
		var payload []byte
		if length > 0 {
			payload = make([]byte, length)
			if _, err := io.ReadFull(conn, payload); err != nil {
				log.Printf("[TCP Client] Lỗi đọc payload (Type 0x%02x): %v", packetType, err)
				return
			}
		}

		// Xử lý các loại gói tin phản hồi từ Server
		switch packetType {
		case 0x05:
			// Pong
			log.Println("[TCP Client] Nhận phản hồi Pong từ Server.")
		case 0x06:
			// Alert Notification từ Server gửi về
			displayAlertBox(payload)
		default:
			log.Printf("[TCP Client] Nhận gói tin không xác định: Type 0x%02x, Length %d", packetType, length)
		}
	}
}

// displayAlertBox hiển thị giao diện hộp thông báo cảnh báo bảo mật ra màn hình terminal của Agent
func displayAlertBox(payload []byte) {
	type AlertData struct {
		RuleID    string `json:"rule_id"`
		RuleName  string `json:"rule_name"`
		Level     int    `json:"level"`
		LogType   string `json:"log_type"`
		Timestamp string `json:"timestamp"`
	}

	var data AlertData
	if err := json.Unmarshal(payload, &data); err != nil {
		log.Printf("[TCP Alert] Nhận cảnh báo thô: %s", string(payload))
		return
	}

	// Xác định màu ANSI dựa trên cấp độ nghiêm trọng của cảnh báo
	colorCode := "\033[1;33m" // Vàng cho cảnh báo trung bình
	if data.Level >= 12 {
		colorCode = "\033[1;31m" // Đỏ cho cảnh báo nguy cấp (Critical)
	} else if data.Level < 6 {
		colorCode = "\033[1;32m" // Xanh lá cho cảnh báo nhẹ
	}
	resetColor := "\033[0m"

	// Vẽ hộp hiển thị thông tin cảnh báo bắt mắt
	fmt.Println()
	fmt.Printf("%s┌────────────────────────────────────────────────────────┐%s\n", colorCode, resetColor)
	fmt.Printf("%s│                   CẢNH BÁO BẢO MẬT                     │%s\n", colorCode, resetColor)
	fmt.Printf("%s├────────────────────────────────────────────────────────┤%s\n", colorCode, resetColor)
	fmt.Printf("%s│ %-54s │%s\n", colorCode, fmt.Sprintf("Nguồn: %s", strings.ToUpper(data.LogType)), resetColor)
	fmt.Printf("%s│ %-54s │%s\n", colorCode, fmt.Sprintf("Độ nguy hại (Level): %d", data.Level), resetColor)
	fmt.Printf("%s│ %-54s │%s\n", colorCode, fmt.Sprintf("Luật phát hiện: %s", data.RuleName), resetColor)
	fmt.Printf("%s│ %-54s │%s\n", colorCode, fmt.Sprintf("Thời gian: %s", data.Timestamp), resetColor)
	fmt.Printf("%s└────────────────────────────────────────────────────────┘%s\n", colorCode, resetColor)
	fmt.Println()
}

