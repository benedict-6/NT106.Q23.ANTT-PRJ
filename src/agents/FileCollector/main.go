package main

import (
	"bytes"
	"crypto/md5"
	"crypto/sha1"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"syscall"
	"time"
	"unsafe"
)

const socketPath = "/tmp/agent_queue.sock"

type FimEvent struct {
	Type     string                 `json:"type"`
	Metadata map[string]interface{} `json:"metadata"`
}

// Cấu trúc lưu trữ Baseline
type BaselineData struct {
	Size   int64
	Mtime  int64  // Last modify time
	Uid    uint32 // User ID
	Gid    uint32 // Group ID
	Mode   string // Permision (chmod)
	Inode  uint64 // File ID
	SHA256 string
}

var (
	baseline      = make(map[string]BaselineData)
	baselineMutex sync.RWMutex
)

func computeHashes(path string) (sha256Str string, err error) {
	file, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer file.Close()

	hMd5 := md5.New()
	hSha1 := sha1.New()
	hSha256 := sha256.New()

	writer := io.MultiWriter(hMd5, hSha1, hSha256)
	if _, err := io.Copy(writer, file); err != nil {
		return "", err
	}

	return hex.EncodeToString(hSha256.Sum(nil)), nil
}

func getFileMetadata(path string) (BaselineData, error) {
	var data BaselineData
	info, err := os.Lstat(path)
	if err != nil {
		return data, err
	}

	stat, ok := info.Sys().(*syscall.Stat_t)
	if !ok {
		return data, fmt.Errorf("failed to get syscall.Stat_t")
	}

	data.Size = info.Size()
	data.Mtime = info.ModTime().Unix()
	data.Uid = stat.Uid
	data.Gid = stat.Gid
	data.Mode = fmt.Sprintf("%04o", info.Mode().Perm())
	data.Inode = stat.Ino

	if info.Mode().IsRegular() {
		sha256Hash, err := computeHashes(path)
		if err == nil {
			data.SHA256 = sha256Hash
		}
	}

	return data, nil
}

func sendEventToAgent(conn net.Conn, event FimEvent) error {
	data, err := json.Marshal(event)
	if err != nil {
		return err
	}
	data = append(data, '\n')
	_, err = conn.Write(data)
	return err
}

var lastEvent = make(map[string]time.Time)

func shouldProcess(path string) bool {
	now := time.Now()

	if t, ok := lastEvent[path]; ok {
		if now.Sub(t) < 500*time.Millisecond {
			return false
		}
	}

	lastEvent[path] = now
	return true
}

func isNoise(path string) bool {
	return strings.HasSuffix(path, ".N") ||
		strings.HasSuffix(path, ".tmp") ||
		strings.Contains(path, "cups") ||
		strings.Contains(path, "systemd") ||
		strings.Contains(path, "apt")
}

func main() {
	eventChan := make(chan FimEvent, 10000)

	go func() {
		fd, err := syscall.InotifyInit()
		if err != nil {
			log.Fatalf("FIM: inotify_init error: %v", err)
		}
		defer syscall.Close(fd)

		pathsToWatch := []string{
			"/etc",
			"/usr/bin",
			"/usr/sbin",
			"/bin",
			"/sbin",
			"/boot",
		}

		watchDescriptors := make(map[int]string)

		addWatch := func(path string) {
			mask := uint32(syscall.IN_MODIFY | syscall.IN_ATTRIB | syscall.IN_CREATE | syscall.IN_DELETE)
			wd, err := syscall.InotifyAddWatch(fd, path, mask)
			if err != nil {
				return
			}
			watchDescriptors[wd] = path
		}

		//log.Println("FIM: Building baseline and scanning directories. Please wait...")
		for _, p := range pathsToWatch {
			info, err := os.Stat(p)
			if err != nil {
				continue
			}
			if info.IsDir() {
				filepath.Walk(p, func(path string, i os.FileInfo, err error) error {
					if err != nil {
						return nil
					}

					if meta, err := getFileMetadata(path); err == nil {
						baselineMutex.Lock()
						baseline[path] = meta
						baselineMutex.Unlock()
					}

					if i.IsDir() {
						addWatch(path)
					}
					return nil
				})
			} else {
				if meta, err := getFileMetadata(p); err == nil {
					baselineMutex.Lock()
					baseline[p] = meta
					baselineMutex.Unlock()
				}
				addWatch(p)
			}
		}

		log.Println("FIM: Baseline built successfully. Started monitoring inotify events.")

		var buf [syscall.SizeofInotifyEvent * 4096]byte

		for {
			n, err := syscall.Read(fd, buf[:])
			if err != nil {
				log.Printf("FIM: read error: %v", err)
				time.Sleep(1 * time.Second)
				continue
			}

			var offset uint32
			for offset < uint32(n) {
				raw := (*syscall.InotifyEvent)(unsafe.Pointer(&buf[offset]))

				mask := raw.Mask
				nameLen := raw.Len

				var name string
				if nameLen > 0 {
					nameBytes := buf[offset+syscall.SizeofInotifyEvent : offset+syscall.SizeofInotifyEvent+nameLen]
					name = string(bytes.TrimRight(nameBytes, "\x00"))
				}

				dirPath, ok := watchDescriptors[int(raw.Wd)]
				if ok {
					fullPath := filepath.Join(dirPath, name)
					if name == "" {
						fullPath = dirPath
					}

					eventType := ""
					if mask&syscall.IN_CREATE != 0 {
						eventType = "ADDED"

						info, err := os.Stat(fullPath)
						if err == nil && info.IsDir() {
							addWatch(fullPath)
						}
					} else if mask&syscall.IN_DELETE != 0 {
						eventType = "DELETED"
					} else if mask&syscall.IN_MODIFY != 0 || mask&syscall.IN_ATTRIB != 0 {
						eventType = "MODIFIED"
					}

					if eventType != "" {
						metadata := make(map[string]interface{})
						metadata["file"] = fullPath
						metadata["event"] = eventType
						now := time.Now().UTC()

						metadata["timestamp"] = now.Format(time.RFC3339)

						info, _ := os.Stat(fullPath)
						metadata["mtime"] = info.ModTime().UTC().Format(time.RFC3339)

						if isNoise(fullPath) || !shouldProcess(fullPath) {
							continue
						}

						baselineMutex.Lock()
						oldMeta, exists := baseline[fullPath]

						if eventType == "DELETED" {
							// Không hash file bị DELETE
							if exists {
								delete(baseline, fullPath)
							}
						} else {
							// Tính toán metadata và hash mới chỉ cho file thay đổi
							newMeta, err := getFileMetadata(fullPath)
							t := time.Unix(newMeta.Mtime, 0)
							if err == nil {
								metadata["size"] = newMeta.Size
								metadata["timestamp"] = t.UTC().Format(time.RFC3339)
								metadata["uid"] = newMeta.Uid
								metadata["gid"] = newMeta.Gid
								metadata["mode"] = newMeta.Mode
								metadata["inode"] = newMeta.Inode

								if newMeta.SHA256 != "" {
									metadata["hash_sha256"] = newMeta.SHA256
								}

								// So sánh với baseline để tìm sự thay đổi
								if eventType == "MODIFIED" && exists {
									if oldMeta.SHA256 != "" && oldMeta.SHA256 != newMeta.SHA256 {
										metadata["old_hash_sha256"] = oldMeta.SHA256
									}
									if oldMeta.Mode != newMeta.Mode {
										metadata["old_mode"] = oldMeta.Mode
									}
									if oldMeta.Uid != newMeta.Uid {
										metadata["old_uid"] = oldMeta.Uid
									}
									if oldMeta.Gid != newMeta.Gid {
										metadata["old_gid"] = oldMeta.Gid
									}
								}

								// Cập nhật lại baseline
								baseline[fullPath] = newMeta
							}
						}
						baselineMutex.Unlock()

						eventChan <- FimEvent{
							Type:     "file_integrity",
							Metadata: metadata,
						}
					}
				}

				offset += syscall.SizeofInotifyEvent + nameLen
			}
		}
	}()

	var conn net.Conn
	var err error

	for {
		if conn == nil {
			conn, err = net.Dial("unix", socketPath)
			if err != nil {
				log.Println("FIM: Connection Failed. Retrying in 2 seconds...")
				conn = nil
				time.Sleep(2 * time.Second)
				continue
			}
			log.Println("FIM: Connected to agentCollector")
		}

		event := <-eventChan
		err = sendEventToAgent(conn, event)
		if err != nil {
			log.Printf("FIM: Send failed: %v", err)
			conn.Close()
			conn = nil

			go func(e FimEvent) {
				eventChan <- e
			}(event)
		}
	}
}
