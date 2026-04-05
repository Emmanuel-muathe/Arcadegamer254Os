#include <iostream>
#include <string>
#include <memory>
#include <stdexcept>
#include <array>
#include <fstream>
#include <filesystem>
#include <vector>
#include <thread>
#include <unistd.h>
#include <sys/wait.h>
#include <App.h> // uWebSockets
#include <nlohmann/json.hpp> // nlohmann/json

using json = nlohmann::json;
namespace fs = std::filesystem;

// Safe execution using fork and execvp to prevent shell injection
std::string safe_exec(const std::vector<std::string>& args) {
    if (args.empty()) return "Error: empty command";

    int pipefd[2];
    if (pipe(pipefd) == -1) return "Error: pipe failed";

    pid_t pid = fork();
    if (pid == -1) return "Error: fork failed";

    if (pid == 0) { // Child process
        close(pipefd[0]); // Close read end
        dup2(pipefd[1], STDOUT_FILENO);
        dup2(pipefd[1], STDERR_FILENO);
        close(pipefd[1]);

        std::vector<char*> c_args;
        for (const auto& arg : args) {
            c_args.push_back(const_cast<char*>(arg.c_str()));
        }
        c_args.push_back(nullptr);

        execvp(c_args[0], c_args.data());
        // If execvp returns, it failed
        std::cerr << "execvp failed for " << c_args[0] << std::endl;
        exit(1);
    } else { // Parent process
        close(pipefd[1]); // Close write end
        std::string result;
        char buffer[256];
        ssize_t count;
        while ((count = read(pipefd[0], buffer, sizeof(buffer) - 1)) > 0) {
            buffer[count] = '\0';
            result += buffer;
        }
        close(pipefd[0]);
        waitpid(pid, nullptr, 0);
        return result;
    }
}

// Helper to write to a file (e.g., sysfs)
bool write_sysfs(const std::string& path, const std::string& value) {
    std::ofstream file(path);
    if (file.is_open()) {
        file << value;
        return true;
    }
    return false;
}

// Helper to read from a file
std::string read_sysfs(const std::string& path) {
    std::ifstream file(path);
    std::string value;
    if (file.is_open()) {
        std::getline(file, value);
    }
    return value;
}

int main() {
    int port = 8080;

    uWS::App().ws<int>("/*", {
        .message = [](auto *ws, std::string_view message, uWS::OpCode opCode) {
            try {
                json req = json::parse(message);
                std::string action = req.value("action", "");

                // Offload to background thread to prevent blocking the uWS event loop
                std::thread([ws, req, action, opCode]() {
                    json res;
                    res["action"] = action;

                    if (action == "mount_disk") {
                        std::string label = req.value("label", "A254OS");
                        std::string mount_point = "/mnt/" + label;
                        
                        // Create mount point if it doesn't exist
                        safe_exec({"mkdir", "-p", mount_point});
                        
                        // Mount by label
                        res["output"] = safe_exec({"mount", "/dev/disk/by-label/" + label, mount_point});
                        res["status"] = "success";
                        res["mount_point"] = mount_point;

                    } else if (action == "poweroff") {
#ifdef __ANDROID__
                        res["output"] = safe_exec({"reboot", "-p"});
#else
                        res["output"] = safe_exec({"systemctl", "poweroff"});
#endif
                        res["status"] = "success";

                    } else if (action == "reboot") {
#ifdef __ANDROID__
                        res["output"] = safe_exec({"reboot"});
#else
                        res["output"] = safe_exec({"systemctl", "reboot"});
#endif
                        res["status"] = "success";

                    } else if (action == "set_brightness") {
                        int value = req.value("value", 50); // Percentage 0-100
                        
                        // Find the first available backlight device
                        std::string backlight_dir = "/sys/class/backlight/";
                        bool found = false;
                        
                        if (fs::exists(backlight_dir)) {
                            for (const auto& entry : fs::directory_iterator(backlight_dir)) {
                                std::string max_b_str = read_sysfs(entry.path().string() + "/max_brightness");
                                if (!max_b_str.empty()) {
                                    int max_b = std::stoi(max_b_str);
                                    int target_b = (max_b * value) / 100;
                                    
                                    if (write_sysfs(entry.path().string() + "/brightness", std::to_string(target_b))) {
                                        res["status"] = "success";
                                        res["device"] = entry.path().filename().string();
                                        found = true;
                                        break;
                                    }
                                }
                            }
                        }
                        if (!found) {
                            res["error"] = "No backlight device found or permission denied.";
                        }

                    } else if (action == "wifi_list") {
#ifdef __ANDROID__
                        // Termux/Android fallback (requires root/adb usually)
                        res["output"] = safe_exec({"cmd", "wifi", "list-scan-results"});
#else
                        res["output"] = safe_exec({"nmcli", "-t", "-f", "SSID,SIGNAL,SECURITY", "dev", "wifi"});
#endif
                        res["status"] = "success";

                    } else if (action == "wifi_connect") {
                        std::string ssid = req.value("ssid", "");
                        std::string pass = req.value("password", "");
                        
#ifdef __ANDROID__
                        res["output"] = safe_exec({"cmd", "wifi", "connect-network", ssid, "wpa2", pass});
#else
                        if (pass.empty()) {
                            res["output"] = safe_exec({"nmcli", "dev", "wifi", "connect", ssid});
                        } else {
                            res["output"] = safe_exec({"nmcli", "dev", "wifi", "connect", ssid, "password", pass});
                        }
#endif
                        res["status"] = "success";

                    } else {
                        res["error"] = "Unknown action";
                    }

                    // Safely return to the main uWS thread to send the message
                    struct uWS::Loop *loop = uWS::Loop::get();
                    loop->defer([ws, res, opCode]() {
                        ws->send(res.dump(), opCode);
                    });

                }).detach();

            } catch (const std::exception& e) {
                json err;
                err["error"] = e.what();
                ws->send(err.dump(), opCode);
            }
        }
    }).listen(port, [port](auto *listen_socket) {
        if (listen_socket) {
            std::cout << "A254OS HAL Server listening on port " << port << std::endl;
        } else {
            std::cerr << "Failed to listen on port " << port << std::endl;
        }
    }).run();

    return 0;
}
