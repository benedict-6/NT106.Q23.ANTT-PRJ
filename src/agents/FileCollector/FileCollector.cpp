#include <iostream>
#include <string>
#include <vector>
#include <sys/inotify.h>
#include <sys/socket.h>
#include <sys/un.h>
#include <unistd.h>
#include <cstring>
#include <thread>
#include <chrono>

#define EVENT_SIZE  ( sizeof (struct inotify_event) )
#define EVENT_BUF_LEN     ( 1024 * ( EVENT_SIZE + 16 ) )

// Function to compute SHA256 using system command
std::string computeSHA256(const std::string& path) {
    std::string cmd = "sha256sum " + path + " 2>/dev/null";
    FILE* pipe = popen(cmd.c_str(), "r");
    if (!pipe) return "ERROR";
    
    char buffer[128];
    std::string result = "";
    if (fgets(buffer, sizeof(buffer), pipe) != nullptr) {
        result = buffer;
        // Output usually is: "HASH  filepath\n"
        size_t pos = result.find(' ');
        if (pos != std::string::npos) {
            result = result.substr(0, pos);
        }
    }
    pclose(pipe);
    return result;
}

int main() {
    const char *socket_path = "/tmp/agent_queue.sock";
    int sock = 0;
    struct sockaddr_un serv_addr;

    if ((sock = socket(AF_UNIX, SOCK_STREAM, 0)) < 0) {
        std::cerr << "FileCollector: Socket creation error" << std::endl;
        return -1;
    }

    serv_addr.sun_family = AF_UNIX;
    strncpy(serv_addr.sun_path, socket_path, sizeof(serv_addr.sun_path) - 1);

    while (connect(sock, (struct sockaddr *)&serv_addr, sizeof(serv_addr)) < 0) {
        std::cerr << "FileCollector: Connection Failed. Retrying in 2 seconds..." << std::endl;
        std::this_thread::sleep_for(std::chrono::seconds(2));
    }

    std::cout << "FileCollector: Connected to agentCollector" << std::endl;

    int length, i = 0;
    int fd;
    int wd;
    char buffer[EVENT_BUF_LEN];

    fd = inotify_init();
    if (fd < 0) {
        std::cerr << "inotify_init error" << std::endl;
        return -1;
    }

    std::vector<std::string> files_to_watch = {
        "/etc/passwd",
        "/etc/shadow",
        "/etc/sudoers"
    };

    for (const auto& file : files_to_watch) {
        wd = inotify_add_watch(fd, file.c_str(), IN_MODIFY | IN_ATTRIB);
        if (wd == -1) {
            std::cerr << "Cannot watch " << file << std::endl;
        } else {
            std::cout << "Watching " << file << std::endl;
        }
    }

    while (true) {
        length = read(fd, buffer, EVENT_BUF_LEN); 
        if (length < 0) {
            std::cerr << "read error" << std::endl;
            break;
        }

        i = 0;
        while (i < length) {
            struct inotify_event *event = (struct inotify_event *) &buffer[i];
            if (event->mask & IN_MODIFY || event->mask & IN_ATTRIB) {
                // Determine the file path
                std::string path = "unknown";
                // Since we added file paths directly instead of directory, the event is on the file itself.
                // In this case event->name is empty, we must map wd to path but for simplicity:
                // We'll just emit an alert and a hash.
                
                // Let's figure out path. A simple way is to re-read all watched files' hashes if anything changes, 
                // or keep a map of wd to file path.
                // Let's rebuild the hash for all files on ANY modification for simplicity.
                for (const auto& file : files_to_watch) {
                    std::string hash = computeSHA256(file);
                    std::string payload = "{\"type\": \"file_integrity\", \"metadata\": {\"file\": \"" + file + "\", \"event\": \"MODIFIED\", \"hash_sha256\": \"" + hash + "\"}}\n";
                    if (send(sock, payload.c_str(), payload.length(), 0) < 0) {
                        std::cerr << "FileCollector: Send failed." << std::endl;
                        goto end;
                    }
                }
            }
            i += EVENT_SIZE + event->len;
        }
    }

end:
    inotify_rm_watch(fd, wd);
    close(fd);
    close(sock);
    return 0;
}
