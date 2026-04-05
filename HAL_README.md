# A254OS Hardware Abstraction Layer (HAL)

This directory contains the C++ Hardware Abstraction Layer that bridges the React UI with the underlying Arch Linux kernel.

## Dependencies

You will need a C++17 compatible compiler (like `g++` or `clang++`) and the following libraries:
- [uWebSockets](https://github.com/uNetworking/uWebSockets) (and its dependency uSockets)
- [nlohmann/json](https://github.com/nlohmann/json)

On Arch Linux, you can install the required dependencies (if available in AUR/repos) or fetch them as headers.
```bash
sudo pacman -S nlohmann-json zlib
```
*(Note: uWebSockets is header-only, but requires compiling uSockets. You can clone uWebSockets and build it according to their docs).*

## Compilation

Assuming you have `uWebSockets` headers in your include path and `uSockets` compiled:

```bash
g++ -std=c++17 -O3 hal_server.cpp -o hal_server -I/path/to/uWebSockets/src -I/path/to/uWebSockets/uSockets/src -L/path/to/uWebSockets/uSockets -luSockets -lz -lpthread
```

## Installation for Arch ISO

1. Copy the compiled `hal_server` binary to `/usr/local/bin/hal_server`.
2. Copy `hal.service` to `/etc/systemd/system/hal.service`.
3. Enable the service so it starts on boot:
   ```bash
   systemctl enable hal.service
   ```
