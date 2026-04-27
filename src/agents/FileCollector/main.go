package main

import (
	"bytes"
	"encoding/json"
	"log"
	"net"
	"os/exec"
	"strings"
	"syscall"
	"time"
)

const socketPath = "/tmp/agent_queue.sock"

func computeSHA256(path string) string {
	cmd := exec.Command("sha256sum", path)
	var out bytes.Buffer
	cmd.Stdout = &out
	err := cmd.Run()
	if err != nil {
		return "ERROR"
	}
	// Output usually is: "HASH  filepath\n"
	result := out.String()
	parts := strings.SplitN(result, " ", 2)
	if len(parts) > 0 {
		return parts[0]
	}
	return "ERROR"
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
		log.Println("FileCollector: Connection Failed. Retrying in 2 seconds...")
		time.Sleep(2 * time.Second)
	}
	defer conn.Close()
	log.Println("FileCollector: Connected to agentCollector")

	fd, err := syscall.InotifyInit()
	if err != nil {
		log.Fatalf("FileCollector: inotify_init error: %v", err)
	}
	defer syscall.Close(fd)

	filesToWatch := []string{
		"/etc/passwd",
		"/etc/shadow",
		"/etc/sudoers",
	}

	for _, file := range filesToWatch {
		wd, err := syscall.InotifyAddWatch(fd, file, syscall.IN_MODIFY|syscall.IN_ATTRIB)
		if err != nil {
			log.Printf("FileCollector: Cannot watch %s: %v", file, err)
		} else {
			log.Printf("FileCollector: Watching %s (wd: %d)", file, wd)
		}
	}

	// Buffer to read events
	var buf [1024 * (syscall.SizeofInotifyEvent + 16)]byte

	for {
		n, err := syscall.Read(fd, buf[:])
		if err != nil {
			log.Printf("FileCollector: read error: %v", err)
			break
		}

		if n < syscall.SizeofInotifyEvent {
			continue
		}

		// Simply recreate hash and send for all files when any watched file is modified
		// This mimics the original C++ logic
		for _, file := range filesToWatch {
			hash := computeSHA256(file)
			payload := map[string]interface{}{
				"type": "file_integrity",
				"metadata": map[string]string{
					"file":        file,
					"event":       "MODIFIED",
					"hash_sha256": hash,
				},
			}
			data, _ := json.Marshal(payload)
			data = append(data, '\n') // Append newline

			_, err := conn.Write(data)
			if err != nil {
				log.Printf("FileCollector: Send failed: %v", err)
				return // Exit on connection error
			}
		}
	}
}
