#include <iostream>
#include <string>
#include <sys/socket.h>
#include <sys/un.h>
#include <unistd.h>
#include <cstring>
#include <thread>
#include <chrono>

int main() {
    const char *socket_path = "/tmp/agent_queue.sock";
    int sock = 0;
    struct sockaddr_un serv_addr;

    if ((sock = socket(AF_UNIX, SOCK_STREAM, 0)) < 0) {
        std::cerr << "SoftwareCollector: Socket creation error" << std::endl;
        return -1;
    }

    serv_addr.sun_family = AF_UNIX;
    strncpy(serv_addr.sun_path, socket_path, sizeof(serv_addr.sun_path) - 1);

    while (connect(sock, (struct sockaddr *)&serv_addr, sizeof(serv_addr)) < 0) {
        std::cerr << "SoftwareCollector: Connection Failed. Retrying in 2 seconds..." << std::endl;
        std::this_thread::sleep_for(std::chrono::seconds(2));
    }

    std::cout << "SoftwareCollector: Connected to agentCollector" << std::endl;

    while (true) {
        // Use dpkg-query to list packages
        FILE* pipe = popen("dpkg-query -W -f='{\"name\": \"${binary:Package}\", \"version\": \"${Version}\"},'", "r");
        if (pipe) {
            std::string packages = "";
            char buffer[1024];
            while (fgets(buffer, sizeof(buffer), pipe) != nullptr) {
                packages += buffer;
            }
            pclose(pipe);

            // Remove trailing comma
            if (!packages.empty() && packages.back() == ',') {
                packages.pop_back();
            }

            // Construct JSON
            std::string payload = "{\"type\": \"software_list\", \"metadata\": {\"packages\": [" + packages + "]}}\n";

            // Send
            if (send(sock, payload.c_str(), payload.length(), 0) < 0) {
                std::cerr << "SoftwareCollector: Send failed." << std::endl;
                break;
            }
        } else {
            std::cerr << "SoftwareCollector: dpkg-query failed" << std::endl;
        }

        // For demo purposes, collect every 60 seconds
        std::this_thread::sleep_for(std::chrono::seconds(60));
    }

    close(sock);
    return 0;
}
