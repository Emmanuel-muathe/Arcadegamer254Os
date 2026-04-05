# A254OS: Chrome OS Architecture Guide

To make A254OS function exactly like Chrome OS, you need to bypass traditional Linux desktop environments (like GNOME, KDE, or XFCE) and boot directly into a hardware-accelerated web browser that runs your React UI as the system shell.

This is exactly how Chrome OS works under the hood: a Linux kernel booting directly into a specialized Chromium environment (Ash/Aura).

Here is the exact configuration to include in your Arch Linux ISO build to achieve this.

## 1. Required Packages
In your Arch ISO `packages.x86_64` file (or via pacman), include these packages:
```text
cage
chromium
wayland
xorg-xwayland
mesa
```
*Note: `cage` is a Wayland compositor designed specifically to run a single, fullscreen application (a kiosk). It is the perfect, ultra-lightweight display server for a web-based OS.*

## 2. The Chromium Launch Script
Create a script that launches Chromium with the exact flags needed to act as an operating system shell. This disables iframe security (fixing your web app loading issues) and enables hardware acceleration.

**Create file in ISO:** `/usr/local/bin/start-a254os-ui`
```bash
#!/bin/bash

# Wait for the local Node.js server to be ready (if running locally)
# sleep 2 

# Launch Chromium as the OS Shell
exec chromium \
  --app=http://localhost:3000 \
  --kiosk \
  --start-fullscreen \
  --start-maximized \
  --disable-infobars \
  --no-first-run \
  --no-default-browser-check \
  --disable-web-security \
  --disable-site-isolation-trials \
  --disable-features=IsolateOrigins,site-per-process \
  --enable-features=UseOzonePlatform \
  --ozone-platform=wayland \
  --enable-gpu-rasterization \
  --enable-zero-copy \
  --ignore-gpu-blocklist \
  --user-data-dir=/tmp/a254os-session
```
*Make sure to make it executable: `chmod +x /usr/local/bin/start-a254os-ui`*

## 3. The Systemd Service
Create a systemd service that automatically starts `cage` (the display server) and your Chromium UI immediately on boot, bypassing the login screen.

**Create file in ISO:** `/etc/systemd/system/a254os-ui.service`
```ini
[Unit]
Description=A254OS Chrome OS-style UI
After=systemd-user-sessions.service network.target sound.target hal.service
Conflicts=getty@tty1.service

[Service]
Type=simple
# Replace 'a254user' with your actual non-root username in the ISO
User=a254user
Environment=WLR_LIBINPUT_NO_DEVICES=1
Environment=XDG_SESSION_TYPE=wayland
# Launch cage, which in turn launches our Chromium script
ExecStart=/usr/bin/cage -s -- /usr/local/bin/start-a254os-ui
Restart=always
RestartSec=3
StandardInput=tty
TTYPath=/dev/tty1
TTYReset=yes
TTYVHangup=yes

[Install]
WantedBy=graphical.target
```

## 4. Enable the Services
In your Arch ISO build script (often in `airootfs/customize_airootfs.sh` or via `systemctl enable` in the chroot environment), enable the services:

```bash
# Disable the standard login prompt on TTY1
systemctl disable getty@tty1.service

# Enable your Node.js backend (assuming you have a service for it)
# systemctl enable a254os-backend.service

# Enable the C++ HAL we created earlier
systemctl enable hal.service

# Enable the Chrome OS UI
systemctl enable a254os-ui.service

# Set the default target to graphical
systemctl set-default graphical.target
```

## Why this makes it a true "Chrome OS":
1. **No Desktop Environment Overhead:** You aren't wasting RAM on a desktop environment. The only graphical application running is the Wayland compositor (`cage`) and Chromium.
2. **Native Web Apps:** Because of the `--disable-web-security` flag, your React UI's `<iframe>` tags now have native privileges. Spotify, YouTube, and complex web apps will load perfectly without CORS or X-Frame-Options errors.
3. **Hardware Acceleration:** The Wayland and GPU flags ensure that WebGL and CSS animations run at native 60fps/120fps, just like a real OS.
4. **Instant Boot:** It boots straight from the Linux Kernel -> Systemd -> Cage -> React UI.
