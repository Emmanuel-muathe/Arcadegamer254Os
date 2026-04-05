#!/bin/bash

# Arch Linux React DE - Termux Installation Script
# This script installs the necessary dependencies to run the React DE shell in Termux.

echo "--- Arch Linux React DE: Termux Installer ---"

# Update packages
pkg update && pkg upgrade -y

# Install Node.js and other dependencies
pkg install -y nodejs git x11-repo tur-repo

# Install PulseAudio for sound support
pkg install -y pulseaudio

# Install build tools
pkg install -y make python binutils

# Clone the repository (if not already in it)
# git clone <repo_url>
# cd <repo_dir>

# Install npm dependencies
npm install

echo ""
echo "--- Installation Complete ---"
echo "To start the development server, run:"
echo "npm run dev"
echo ""
echo "To view the UI, open your browser to:"
echo "http://localhost:3000"
echo ""
echo "Note: For full system integration (PulseAudio, etc.), you may need to start the pulseaudio server in Termux:"
echo "pulseaudio --start --exit-idle-time=-1"
echo "pacmd load-module module-native-protocol-tcp auth-ip-acl=127.0.0.1 auth-anonymous=1"
