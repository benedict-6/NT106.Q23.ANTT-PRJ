#include <iostream>
#include <fstream>
#include <string>
#include <thread>
#include <chrono>
#include <sys/socket.h>
#include <sys/un.h>
#include <unistd.h>
#include <cstring>

// A simple utility to escape quotes in JSON string
std::string escapeJSON(const std::string& input) {
    std::string output;
    output.reserve(input.length());
    for (char c : input) {
        if (c == '"') {
            output += "\\\"";
        } else if (c == '\\') {
            output += "\\\\";
        } else if (c == '\n') {
            output += "\\n";
        } else if (c == '\r') {
            output += "\\r";
        } else if (c == '\t') {
            output += "\\t";
        } else if (c >= 0 && c < 32) {
            // ignore unprintable controls
        } else {
            output += c;
        }
    }
    return output;
}

int main() {
    const char *socket_path = "/tmp/agent_queue.sock";
    int sock = 0;
    struct sockaddr_un serv_addr;

    if ((sock = socket(AF_UNIX, SOCK_STREAM, 0)) < 0) {
        std::cerr << "LogCollector: Socket creation error" << std::endl;
        return -1;
    }

    serv_addr.sun_family = AF_UNIX;
    strncpy(serv_addr.sun_path, socket_path, sizeof(serv_addr.sun_path) - 1);

    while (connect(sock, (struct sockaddr *)&serv_addr, sizeof(serv_addr)) < 0) {
        std::cerr << "LogCollector: Connection Failed. Retrying in 2 seconds..." << std::endl;
        std::this_thread::sleep_for(std::chrono::seconds(2));
    }

    std::cout << "LogCollector: Connected to agentCollector" << std::endl;

    const std::string log_file_path = "/var/log/auth.log"; // Default for linux auth logs
    std::ifstream file(log_file_path);
    if (!file.is_open()) {
        std::cerr << "LogCollector: Cannot open " << log_file_path << std::endl;
        // Maybe try syslog instead
        // fallback
    }

    // Go to end of file to only read new logs
    file.seekg(0, std::ios::end);

    std::string line;
    while (true) {
        if (std::getline(file, line)) {
            if (line.empty()) continue;
            
            // Construct JSON
            std::string payload = "{\"type\": \"os_log\", \"metadata\": {\"file\": \"" + log_file_path + "\", \"log\": \"" + escapeJSON(line) + "\"}}\n";
            if (send(sock, payload.c_str(), payload.length(), 0) < 0) {
                std::cerr << "LogCollector: Send failed." << std::endl;
                break;
            }
        } else {
            // Clear EOF flag and wait for new data
            file.clear();
            std::this_thread::sleep_for(std::chrono::milliseconds(500));
        }
    }

    close(sock);
    return 0;
}
