#include <iostream>
#include <string>
#include <sys/socket.h>
#include <sys/un.h>
#include <unistd.h>
#include <cstdlib>

int main() {
    const char *socket_path = "/tmp/agent_queue.sock";
    int sock = 0;
    struct sockaddr_un serv_addr;

    if ((sock = socket(AF_UNIX, SOCK_STREAM, 0)) < 0) {
        std::cerr << "NetProCollector: Socket creation error" << std::endl;
        return -1;
    }

    serv_addr.sun_family = AF_UNIX;
    strncpy(serv_addr.sun_path, socket_path, sizeof(serv_addr.sun_path) - 1);

    // Wait until socket is available (e.g. agentCollector spins up)
    while (connect(sock, (struct sockaddr *)&serv_addr, sizeof(serv_addr)) < 0) {
        std::cerr << "NetProCollector: Connection Failed. Retrying in 2 seconds..." << std::endl;
        sleep(2);
    }

    std::cout << "NetProCollector: Connected to agentCollector Unix socket." << std::endl;

    // Run ecli to load and run the ebpf program.
    // Ensure ecc and ecli are available or we use the local path.
    // ecli output format is one JSON per line usually.
    FILE *pipe = popen("./ebpf/tools/ecli run ./ebpf/package.json", "r");
    if (!pipe) {
        std::cerr << "NetProCollector: Failed to run ecli" << std::endl;
        return -1;
    }

    char buffer[2048];
    while (fgets(buffer, sizeof(buffer), pipe) != nullptr) {
        std::string line(buffer);
        // Remove trailing newline
        if (!line.empty() && line[line.length()-1] == '\n') {
            line.pop_back();
        }

        // Eunomia BPF ecli typically outputs some info logs before starting with JSON.
        // Usually json starts with '{'
        if (line.empty() || line[0] != '{') continue;

        // Wrap the payload
        std::string payload = "{\"type\": \"net_pro\", \"metadata\": " + line + "}\n";

        // Send to Unix Socket
        if (send(sock, payload.c_str(), payload.length(), 0) < 0) {
            std::cerr << "NetProCollector: Send failed. Exiting." << std::endl;
            break;
        }
    }

    pclose(pipe);
    close(sock);
    return 0;
}
