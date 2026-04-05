import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import os from "os";
import { exec } from "child_process";
import { promisify } from "util";
import { createProxyMiddleware } from "http-proxy-middleware";

const execAsync = promisify(exec);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize default Chrome OS style folders
  const homeDir = os.homedir();
  const defaultFolders = ['Downloads', 'Audio', 'Images', 'Videos', 'Recent'];
  defaultFolders.forEach(folder => {
    const folderPath = path.join(homeDir, folder);
    if (!fs.existsSync(folderPath)) {
      try {
        fs.mkdirSync(folderPath, { recursive: true });
      } catch (e) {
        console.error(`Failed to create default folder: ${folderPath}`, e);
      }
    }
  });

  app.use(express.json({ limit: '50mb' }));

  // Basic Adblock List
  const adblockDomains = [
    'doubleclick.net', 'googleadservices.com', 'googlesyndication.com', 
    'adsystem.com', 'adservice.google.com', 'amazon-adsystem.com',
    'adnxs.com', 'criteo.com', 'taboola.com', 'outbrain.com', 'rubiconproject.com',
    'pubmatic.com', 'openx.net', 'adsrvr.org', 'advertising.com', 'moatads.com'
  ];

  // Proxy for iframe-blocking sites
  app.use('/api/proxy', (req, res, next) => {
    try {
      const targetUrl = req.query.url as string;
      if (!targetUrl) return next();
      
      const urlObj = new URL(targetUrl);
      const hostname = urlObj.hostname;
      
      // Adblock check
      const useAdblock = req.query.adblock === 'true';
      if (useAdblock && adblockDomains.some(domain => hostname.includes(domain))) {
        return res.status(403).send('Blocked by Adblocker');
      }
    } catch (e) {}
    next();
  }, createProxyMiddleware({
    router: (req: any) => {
      return req.query.url as string;
    },
    changeOrigin: true,
    pathRewrite: (path, req: any) => {
      try {
        const urlObj = new URL(req.query.url as string);
        return urlObj.pathname + urlObj.search;
      } catch (e) {
        return path;
      }
    },
    on: {
      proxyRes: (proxyRes, req, res) => {
        delete proxyRes.headers['x-frame-options'];
        delete proxyRes.headers['content-security-policy'];
        proxyRes.headers['access-control-allow-origin'] = '*';
      }
    }
  }));

  // --- FILE EXPLORER ---
  app.get("/api/system/files/list", async (req, res) => {
    try {
      let dirPath = (req.query.path as string) || os.homedir();
      if (dirPath.startsWith('~')) {
        dirPath = dirPath.replace('~', os.homedir());
      }
      if (!fs.existsSync(dirPath)) return res.status(404).json({ error: "Path not found" });
      
      const items = fs.readdirSync(dirPath, { withFileTypes: true });
      const files = items.map(item => {
        const itemPath = path.join(dirPath, item.name);
        let size = 0;
        let modified = new Date();
        try {
          const stats = fs.statSync(itemPath);
          size = stats.size;
          modified = stats.mtime;
        } catch (e) {}
        
        return {
          name: item.name,
          isDirectory: item.isDirectory(),
          path: itemPath,
          size,
          modified
        };
      });
      
      // Sort directories first, then alphabetically
      files.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
      
      res.json({ path: dirPath, files });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.get("/api/system/files/read", async (req, res) => {
    try {
      let filePath = req.query.path as string;
      if (filePath && filePath.startsWith('~')) filePath = filePath.replace('~', os.homedir());
      if (!filePath || !fs.existsSync(filePath)) return res.status(404).json({ error: "File not found" });
      
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) return res.status(400).json({ error: "Cannot read directory as file" });
      if (stats.size > 10 * 1024 * 1024) return res.status(400).json({ error: "File too large for text editor. Please download it instead." });
      
      const content = fs.readFileSync(filePath, "utf-8");
      res.json({ content });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.get("/api/system/files/serve", (req, res) => {
    let filePath = req.query.path as string;
    if (filePath && filePath.startsWith('~')) filePath = filePath.replace('~', os.homedir());
    if (!filePath || !fs.existsSync(filePath)) return res.status(404).send("Not found");
    res.sendFile(path.resolve(filePath));
  });

  app.post("/api/system/files/action", async (req, res) => {
    try {
      let { action, path: targetPath, newPath, isDir, content } = req.body;
      if (targetPath && targetPath.startsWith('~')) targetPath = targetPath.replace('~', os.homedir());
      if (newPath && newPath.startsWith('~')) newPath = newPath.replace('~', os.homedir());
      
      if (!targetPath) return res.status(400).json({ error: "Path required" });
      
      if (action === 'delete') {
        if (fs.statSync(targetPath).isDirectory()) fs.rmSync(targetPath, { recursive: true, force: true });
        else fs.unlinkSync(targetPath);
      } else if (action === 'create') {
        if (isDir) fs.mkdirSync(targetPath, { recursive: true });
        else fs.writeFileSync(targetPath, "");
      } else if (action === 'rename' || action === 'move') {
        if (!newPath) return res.status(400).json({ error: "New path required" });
        fs.renameSync(targetPath, newPath);
      } else if (action === 'copy') {
        if (!newPath) return res.status(400).json({ error: "New path required" });
        if (fs.statSync(targetPath).isDirectory()) {
          fs.cpSync(targetPath, newPath, { recursive: true });
        } else {
          fs.copyFileSync(targetPath, newPath);
        }
      } else if (action === 'write') {
        fs.writeFileSync(targetPath, content || "", "utf-8");
      }
      res.json({ success: true });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // --- BATTERY ---
  app.get("/api/system/battery", async (req, res) => {
    try {
      const powerSupplyDir = "/sys/class/power_supply/";
      if (!fs.existsSync(powerSupplyDir)) return res.status(404).json({ error: "No battery found" });
      const supplies = fs.readdirSync(powerSupplyDir);
      const batDir = supplies.find(dir => dir.startsWith("BAT"));
      if (!batDir) return res.status(404).json({ error: "No battery found" });

      const capacity = fs.readFileSync(path.join(powerSupplyDir, batDir, "capacity"), "utf-8").trim();
      const status = fs.readFileSync(path.join(powerSupplyDir, batDir, "status"), "utf-8").trim();
      res.json({ capacity: parseInt(capacity, 10), status, device: batDir });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // --- WI-FI ---
  app.get("/api/system/wifi", async (req, res) => {
    try {
      const radioStatus = await execAsync("nmcli radio wifi");
      const enabled = radioStatus.stdout.trim() === "enabled";
      
      const { stdout } = await execAsync("nmcli -t -f SSID,SIGNAL,SECURITY dev wifi");
      const networks = stdout.split("\n").filter(l => l.trim() !== "").map(line => {
        const [ssid, signal, security] = line.split(":");
        return { ssid, signal: parseInt(signal, 10), security };
      }).filter(n => n.ssid && n.ssid !== "--").reduce((acc, curr) => acc.find((i: any) => i.ssid === curr.ssid) ? acc : [...acc, curr], [] as any[]);
      res.json({ enabled, networks });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.post("/api/system/wifi/connect", async (req, res) => {
    try {
      const { ssid, password } = req.body;
      const cmd = password ? `nmcli dev wifi connect "${ssid}" password "${password}"` : `nmcli dev wifi connect "${ssid}"`;
      const { stdout } = await execAsync(cmd);
      res.json({ success: true, output: stdout });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.post("/api/system/wifi/toggle", async (req, res) => {
    try {
      const { enabled } = req.body;
      await execAsync(`nmcli radio wifi ${enabled ? 'on' : 'off'}`);
      res.json({ success: true });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // --- AUDIO (Pipewire/Wireplumber) ---
  app.get("/api/system/audio", async (req, res) => {
    try {
      const { stdout } = await execAsync("wpctl get-volume @DEFAULT_AUDIO_SINK@");
      const match = stdout.match(/Volume:\s+([\d.]+)/);
      const isMuted = stdout.includes("[MUTED]");
      if (!match) throw new Error("Could not parse volume");
      res.json({ volume: Math.round(parseFloat(match[1]) * 100), muted: isMuted });
    } catch (error: any) { 
      res.json({ error: "Audio service unavailable (wpctl failed or not found)" }); 
    }
  });

  app.post("/api/system/audio", async (req, res) => {
    try {
      const { volume, muted } = req.body;
      if (volume !== undefined) {
        await execAsync(`wpctl set-volume @DEFAULT_AUDIO_SINK@ ${volume / 100}`);
      }
      if (muted !== undefined) {
        await execAsync(`wpctl set-mute @DEFAULT_AUDIO_SINK@ ${muted ? 1 : 0}`);
      }
      res.json({ success: true });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // --- SYSTEM INFO ---
  app.get("/api/system/info", async (req, res) => {
    try {
      const cpuinfo = fs.existsSync("/proc/cpuinfo") ? fs.readFileSync("/proc/cpuinfo", "utf-8") : "";
      const meminfo = fs.existsSync("/proc/meminfo") ? fs.readFileSync("/proc/meminfo", "utf-8") : "";
      
      const cpuMatch = cpuinfo.match(/model name\s+:\s+(.+)/);
      const memTotalMatch = meminfo.match(/MemTotal:\s+(\d+)\s+kB/);
      const memFreeMatch = meminfo.match(/MemAvailable:\s+(\d+)\s+kB/);

      res.json({
        cpu: cpuMatch ? cpuMatch[1] : "Unknown CPU",
        memTotal: memTotalMatch ? Math.round(parseInt(memTotalMatch[1]) / 1024) : 0,
        memFree: memFreeMatch ? Math.round(parseInt(memFreeMatch[1]) / 1024) : 0,
      });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // --- BOOT TIME & USER INFO ---
  app.get("/api/system/boot", async (req, res) => {
    try {
      try {
        const { stdout } = await execAsync("systemd-analyze time");
        res.json({ bootTime: stdout.trim() });
        return;
      } catch (e) {
        if (fs.existsSync("/proc/uptime")) {
          const uptime = fs.readFileSync("/proc/uptime", "utf-8");
          const seconds = parseFloat(uptime.split(" ")[0]);
          res.json({ bootTime: `System up for ${seconds.toFixed(2)} seconds` });
          return;
        }
        res.json({ bootTime: "Boot time unavailable" });
      }
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // --- AUTHENTICATION ---
  const AUTH_FILE = path.join(process.cwd(), '.os_shadow.json');

  app.get("/api/system/auth/status", (req, res) => {
    try {
      if (fs.existsSync(AUTH_FILE)) {
        const data = JSON.parse(fs.readFileSync(AUTH_FILE, "utf-8"));
        res.json({ isSetup: true, username: data.username });
      } else {
        res.json({ isSetup: false });
      }
    } catch (e) {
      res.json({ isSetup: false });
    }
  });

  app.post("/api/system/auth/setup", (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) return res.status(400).json({ error: "Missing fields" });
      
      // In a real OS, this would use PAM or shadow passwords. 
      // For this React DE preview, we store a simple base64 hash in a hidden file.
      const data = { username, password: Buffer.from(password).toString('base64') };
      fs.writeFileSync(AUTH_FILE, JSON.stringify(data));
      
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/system/auth/login", (req, res) => {
    try {
      const { password } = req.body;
      if (!fs.existsSync(AUTH_FILE)) return res.status(400).json({ error: "No user setup" });
      
      const data = JSON.parse(fs.readFileSync(AUTH_FILE, "utf-8"));
      const inputHash = Buffer.from(password).toString('base64');
      
      if (data.password === inputHash) {
        res.json({ success: true });
      } else {
        res.status(401).json({ error: "Incorrect password" });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- SETTINGS: ABOUT ---
  app.get("/api/system/about", async (req, res) => {
    try {
      const kernel = (await execAsync("uname -r")).stdout.trim();
      const arch = (await execAsync("uname -m")).stdout.trim();
      let uptime = "";
      try {
        uptime = (await execAsync("uptime -p")).stdout.trim();
      } catch (e) {
        if (fs.existsSync("/proc/uptime")) {
          const uptimeSeconds = parseFloat(fs.readFileSync("/proc/uptime", "utf-8").split(" ")[0]);
          const hours = Math.floor(uptimeSeconds / 3600);
          const minutes = Math.floor((uptimeSeconds % 3600) / 60);
          uptime = `up ${hours} hours, ${minutes} minutes`;
        } else {
          uptime = "Unknown";
        }
      }
      
      const cpuinfo = fs.existsSync("/proc/cpuinfo") ? fs.readFileSync("/proc/cpuinfo", "utf-8") : "";
      const meminfo = fs.existsSync("/proc/meminfo") ? fs.readFileSync("/proc/meminfo", "utf-8") : "";
      const cpuMatch = cpuinfo.match(/model name\s+:\s+(.+)/);
      const memTotalMatch = meminfo.match(/MemTotal:\s+(\d+)\s+kB/);

      res.json({ 
        kernel, 
        arch, 
        uptime, 
        os: "Arcadegamer254 os", 
        version: "1.0.0-stable",
        cpu: cpuMatch ? cpuMatch[1].trim() : "Unknown CPU",
        ram: memTotalMatch ? Math.round(parseInt(memTotalMatch[1]) / 1024) + " MB" : "Unknown RAM"
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- SETTINGS: STORAGE ---
  app.get("/api/system/storage", async (req, res) => {
    try {
      const { stdout } = await execAsync("df -h /");
      const lines = stdout.trim().split('\n');
      if (lines.length > 1) {
        const parts = lines[1].trim().split(/\s+/);
        res.json({
          total: parts[1],
          used: parts[2],
          available: parts[3],
          usePercentage: parts[4]
        });
      } else {
        throw new Error("Unexpected df output");
      }
    } catch (e: any) {
      res.json({ error: e.message });
    }
  });

  // --- SETTINGS: DISPLAY ---
  app.get("/api/system/display", async (req, res) => {
    try {
      const { stdout } = await execAsync("xrandr");
      const lines = stdout.split('\n');
      let currentRes = "";
      let currentRate = "";
      
      for (const line of lines) {
        if (line.includes('*')) {
          const match = line.trim().match(/^(\d+x\d+)\s+([\d.]+)\*/);
          if (match) {
            currentRes = match[1];
            currentRate = match[2];
          } else {
            const parts = line.trim().split(/\s+/);
            currentRes = parts[0];
            const rateMatch = parts.find(p => p.includes('*'));
            if (rateMatch) currentRate = rateMatch.replace(/[^0-9.]/g, '');
          }
        }
      }
      if (!currentRes) throw new Error("Could not parse xrandr output");
      res.json({ resolution: currentRes, refreshRate: currentRate ? currentRate + " Hz" : "" });
    } catch (e: any) {
      res.json({ error: "Display info unavailable (xrandr failed or not found)" });
    }
  });

  // --- SETTINGS: BLUETOOTH ---
  app.get("/api/system/bluetooth", async (req, res) => {
    try {
      const { stdout } = await execAsync("bluetoothctl devices");
      const devices = stdout.trim().split('\n').filter(Boolean).map(line => {
        const parts = line.split(' ');
        return { mac: parts[1], name: parts.slice(2).join(' ') };
      });
      res.json({ enabled: true, devices });
    } catch (e: any) {
      res.json({ enabled: false, devices: [], error: "Bluetooth service unavailable or bluetoothctl failed" });
    }
  });

  // --- SETTINGS: POWER ---
  app.get("/api/system/power", async (req, res) => {
    try {
      const powerSupplyDir = "/sys/class/power_supply/";
      if (!fs.existsSync(powerSupplyDir)) throw new Error("No power supply directory");
      const supplies = fs.readdirSync(powerSupplyDir);
      const batDir = supplies.find(dir => dir.startsWith("BAT"));
      if (!batDir) throw new Error("No battery found");

      const capacity = fs.readFileSync(path.join(powerSupplyDir, batDir, "capacity"), "utf-8").trim();
      const status = fs.readFileSync(path.join(powerSupplyDir, batDir, "status"), "utf-8").trim();
      let health = "Unknown";
      try { health = fs.readFileSync(path.join(powerSupplyDir, batDir, "health"), "utf-8").trim(); } catch(e) {}
      
      res.json({ capacity, status, health });
    } catch (e: any) {
      res.json({ error: e.message });
    }
  });

  // --- SETTINGS: DATETIME ---
  app.get("/api/system/datetime", async (req, res) => {
    try {
      const { stdout } = await execAsync("timedatectl");
      res.json({ raw: stdout.trim() });
    } catch (e: any) {
      const date = new Date().toString();
      res.json({ raw: `Local time: ${date}\nUniversal time: ${new Date().toUTCString()}`, error: "timedatectl failed" });
    }
  });

  // --- SETTINGS: REGION ---
  app.get("/api/system/region", async (req, res) => {
    try {
      const { stdout } = await execAsync("localectl");
      res.json({ raw: stdout.trim() });
    } catch (e: any) {
      res.json({ raw: "System Locale: LANG=en_US.UTF-8\nVC Keymap: us\nX11 Layout: us", error: "localectl failed" });
    }
  });

  // --- SETTINGS: DEFAULT APPS ---
  app.get("/api/system/defaultapps", async (req, res) => {
    try {
      const browser = (await execAsync("xdg-settings get default-web-browser")).stdout.trim();
      let urlScheme = "";
      try {
        urlScheme = (await execAsync("xdg-mime query default x-scheme-handler/http")).stdout.trim();
      } catch (e) {}
      res.json({ browser, urlScheme });
    } catch (e: any) {
      res.json({ error: "xdg-utils not available or failed" });
    }
  });

  // --- SETTINGS: STARTUP APPS ---
  app.get("/api/system/startup", async (req, res) => {
    try {
      const autostartDir = path.join(os.homedir(), ".config", "autostart");
      let apps: string[] = [];
      if (fs.existsSync(autostartDir)) {
        const files = fs.readdirSync(autostartDir).filter(f => f.endsWith('.desktop'));
        apps = files.map(f => f.replace('.desktop', ''));
      }
      res.json({ apps });
    } catch (e: any) {
      res.json({ error: e.message });
    }
  });

  // --- SETTINGS: PERMISSIONS ---
  app.get("/api/system/permissions", async (req, res) => {
    try {
      const { stdout } = await execAsync("flatpak list --app --columns=application");
      const apps = stdout.trim().split('\n').filter(Boolean);
      res.json({ apps, note: "Granular permissions apply to Flatpak apps." });
    } catch (e: any) {
      res.json({ error: "Flatpak not installed or no flatpak apps found. Native Arch packages have full system access." });
    }
  });

  // --- SETTINGS: LOCKSCREEN ---
  app.get("/api/system/lockscreen", async (req, res) => {
    res.json({ status: "Managed by display manager (e.g., GDM, SDDM) or swayidle." });
  });

  // --- SETTINGS: PERSONALIZATION ---
  const settingsFile = path.join(os.homedir(), ".config", "arcadegamer254_settings.json");
  let personalization = {
    theme: 'dark',
    wallpaper: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop',
    font: 'Inter',
    fontSize: 14,
    dockPosition: 'Bottom',
    dockAutoHide: false,
    desktopApps: [
      { name: "Arcade Terminal", exec: "internal:terminal", icon: "terminal", category: "System" },
      { name: "App Store", exec: "internal:appstore", icon: "store", category: "System" },
      { name: "File Explorer", exec: "internal:files", icon: "folder", category: "System" },
      { name: "System Monitor", exec: "internal:monitor", icon: "activity", category: "System" },
      { name: "Settings", exec: "internal:settings", icon: "settings", category: "System" }
    ],
    dockApps: [
      { name: "Arcade Terminal", exec: "internal:terminal", icon: "terminal", category: "System" },
      { name: "App Store", exec: "internal:appstore", icon: "store", category: "System" },
      { name: "File Explorer", exec: "internal:files", icon: "folder", category: "System" },
      { name: "Arcade Browser", exec: "internal:browser", icon: "browser", category: "Internet" },
      { name: "Settings", exec: "internal:settings", icon: "settings", category: "System" }
    ],
    systemSound: true
  };

  try {
    if (fs.existsSync(settingsFile)) {
      personalization = { ...personalization, ...JSON.parse(fs.readFileSync(settingsFile, 'utf-8')) };
      // Migration: Rename Terminal to Arcade Terminal
      if (personalization.desktopApps) {
        personalization.desktopApps = personalization.desktopApps.map((app: any) => app.name === 'Terminal' ? { ...app, name: 'Arcade Terminal' } : app);
      }
      if (personalization.dockApps) {
        personalization.dockApps = personalization.dockApps.map((app: any) => app.name === 'Terminal' ? { ...app, name: 'Arcade Terminal' } : app);
      }
    } else {
      if (!fs.existsSync(path.dirname(settingsFile))) {
        fs.mkdirSync(path.dirname(settingsFile), { recursive: true });
      }
      fs.writeFileSync(settingsFile, JSON.stringify(personalization, null, 2));
    }
  } catch (e) {}

  app.get("/api/system/personalization", (req, res) => res.json(personalization));
  app.post("/api/system/personalization", (req, res) => {
    personalization = { ...personalization, ...req.body };
    try {
      fs.writeFileSync(settingsFile, JSON.stringify(personalization, null, 2));
    } catch (e) {}
    res.json({ success: true, settings: personalization });
  });

  app.get("/api/system/user", (req, res) => {
    try {
      const username = require('os').userInfo().username;
      res.json({ username });
    } catch (error: any) {
      res.json({ username: "arcadegamer254" });
    }
  });

  // --- APP LAUNCHER ---
  app.get("/api/system/apps", async (req, res) => {
    try {
      const dirs = [
        "/usr/share/applications",
        path.join(process.env.HOME || "/root", ".local/share/applications")
      ];
      const apps: any[] = [];
      
      const builtInApps = [
        { name: "Arcade Terminal", exec: "internal:terminal", icon: "terminal", category: "System" },
        { name: "Settings", exec: "internal:settings", icon: "settings", category: "System" },
        { name: "App Store", exec: "internal:appstore", icon: "store", category: "System" },
        { name: "System Monitor", exec: "internal:monitor", icon: "activity", category: "System" },
        { name: "File Explorer", exec: "internal:files", icon: "folder", category: "System" },
        { name: "Arcade Browser", exec: "internal:browser", icon: "browser", category: "Internet" },
        // Web Games
        { name: "Minecraft Classic", exec: "web:https://classic.minecraft.net/", icon: "game", category: "Games" },
        { name: "JS-DOS (DOSBox)", exec: "web:https://js-dos.com/games/", icon: "game", category: "Games" },
        { name: "Tetris", exec: "web:https://tetris.com/play-tetris", icon: "game", category: "Games" },
        { name: "Chess.com", exec: "web:https://www.chess.com/play/computer", icon: "game", category: "Games" },
        { name: "2048", exec: "web:https://play2048.co/", icon: "game", category: "Games" },
        // Web Apps
        { name: "VS Code", exec: "web:https://vscode.dev", icon: "code", category: "Development" },
        { name: "Discord", exec: "web:https://discord.com/app", icon: "chat", category: "Internet" },
        { name: "Spotify", exec: "web:https://open.spotify.com", icon: "music", category: "Media" },
        { name: "Photopea (GIMP)", exec: "web:https://www.photopea.com/", icon: "image", category: "Graphics" },
        { name: "YouTube", exec: "web:https://www.youtube.com", icon: "video", category: "Media" },
        { name: "Twitch", exec: "web:https://www.twitch.tv", icon: "video", category: "Media" },
        { name: "GitHub", exec: "web:https://github.com", icon: "code", category: "Development" },
        { name: "Excalidraw", exec: "web:https://excalidraw.com", icon: "image", category: "Graphics" },
        { name: "Google Docs", exec: "web:https://docs.google.com", icon: "office", category: "Office" },
        { name: "Termux", exec: "web:https://termux.com", icon: "terminal", category: "System" },
        { name: "Docker", exec: "docker-desktop", icon: "system", category: "Development" }
      ];

      for (const dir of dirs) {
        if (!fs.existsSync(dir)) continue;
        const files = fs.readdirSync(dir).filter(f => f.endsWith(".desktop"));
        
        for (const file of files) {
          try {
            const content = fs.readFileSync(path.join(dir, file), "utf-8");
            const nameMatch = content.match(/^Name=(.+)$/m);
            const execMatch = content.match(/^Exec=(.+)$/m);
            const iconMatch = content.match(/^Icon=(.+)$/m);
            const categoryMatch = content.match(/^Categories=(.+)$/m);
            
            let category = "Other";
            if (categoryMatch) {
              const cats = categoryMatch[1].split(';');
              if (cats.includes('Game')) category = "Games";
              else if (cats.includes('Network') || cats.includes('WebBrowser')) category = "Internet";
              else if (cats.includes('AudioVideo')) category = "Media";
              else if (cats.includes('Graphics')) category = "Graphics";
              else if (cats.includes('Development')) category = "Development";
              else if (cats.includes('Office')) category = "Office";
              else if (cats.includes('System') || cats.includes('Settings')) category = "System";
              else if (cats.includes('Utility')) category = "Utilities";
            }

            if (nameMatch && execMatch) {
              apps.push({
                name: nameMatch[1].trim(),
                exec: execMatch[1].trim().replace(/%[a-zA-Z]/g, "").trim(),
                icon: iconMatch ? iconMatch[1].trim() : "",
                category
              });
            }
          } catch (e) { /* ignore unreadable files */ }
        }
      }
      
      // Deduplicate by name and sort
      const uniqueApps = Array.from(new Map([...builtInApps, ...apps].map(a => [a.name, a])).values());
      uniqueApps.sort((a, b) => a.name.localeCompare(b.name));
      
      res.json({ apps: uniqueApps });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.post("/api/system/apps/launch", async (req, res) => {
    try {
      const { exec: cmd } = req.body;
      const child = require('child_process').spawn(cmd, [], { 
        shell: true, 
        detached: true, 
        stdio: 'ignore',
        env: { ...process.env, DISPLAY: process.env.DISPLAY || ':0' }
      });
      child.unref();
      res.json({ success: true });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // --- TERMINAL ---
  app.post("/api/system/terminal", async (req, res) => {
    try {
      const { command } = req.body;
      const { stdout, stderr } = await execAsync(command);
      res.json({ output: stdout || stderr });
    } catch (error: any) { 
      res.json({ output: error.message }); 
    }
  });

  // --- SYSTEM MONITOR (CPU & RAM) ---
  let lastCpu = { idle: 0, total: 0 };
  app.get("/api/system/monitor", async (req, res) => {
    try {
      const meminfo = fs.existsSync("/proc/meminfo") ? fs.readFileSync("/proc/meminfo", "utf-8") : "";
      const memTotalMatch = meminfo.match(/MemTotal:\s+(\d+)/);
      const memAvailMatch = meminfo.match(/MemAvailable:\s+(\d+)/);
      
      let ramUsage = 0, memTotal = 0, memAvail = 0;
      if (memTotalMatch && memAvailMatch) {
        memTotal = parseInt(memTotalMatch[1], 10);
        memAvail = parseInt(memAvailMatch[1], 10);
        ramUsage = ((memTotal - memAvail) / memTotal) * 100;
      }

      const stat = fs.existsSync("/proc/stat") ? fs.readFileSync("/proc/stat", "utf-8") : "";
      const cpuMatch = stat.match(/^cpu\s+(.*)$/m);
      let cpuUsage = 0;
      if (cpuMatch) {
        const parts = cpuMatch[1].trim().split(/\s+/).map(Number);
        const idle = parts[3] + (parts[4] || 0);
        const total = parts.reduce((a, b) => a + b, 0);
        
        const idleDiff = idle - lastCpu.idle;
        const totalDiff = total - lastCpu.total;
        if (totalDiff > 0) {
          cpuUsage = 100 * (1 - idleDiff / totalDiff);
        }
        lastCpu = { idle, total };
      }

      res.json({ cpu: cpuUsage, ram: ramUsage, memTotal, memAvail });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // --- PACKAGE MANAGER (Hybrid: Web Apps + System Packages) ---
  const webApps = [
    { name: "excalidraw", version: "1.0.0", description: "Virtual whiteboard for sketching hand-drawn like diagrams", installed: false, category: "Graphics", exec: "web:https://excalidraw.com", icon: "image", isWebApp: true },
    { name: "vscode", version: "1.80.0", description: "Code editing. Redefined.", installed: false, category: "Development", exec: "web:https://vscode.dev", icon: "code", isWebApp: true },
    { name: "discord", version: "1.0.0", description: "Chat for Communities and Friends", installed: false, category: "Internet", exec: "web:https://discord.com/app", icon: "chat", isWebApp: true },
    { name: "spotify", version: "1.0.0", description: "Web Player: Music for everyone", installed: false, category: "Media", exec: "web:https://open.spotify.com", icon: "music", isWebApp: true },
    { name: "photopea", version: "1.0.0", description: "Advanced Photo Editor", installed: false, category: "Graphics", exec: "web:https://www.photopea.com/", icon: "image", isWebApp: true },
    { name: "youtube", version: "1.0.0", description: "Enjoy the videos and music you love", installed: false, category: "Media", exec: "web:https://piped.video", icon: "video", isWebApp: true },
    { name: "twitch", version: "1.0.0", description: "Twitch is the world's leading video platform and community for gamers.", installed: false, category: "Media", exec: "web:https://www.twitch.tv", icon: "video", isWebApp: true },
    { name: "github", version: "1.0.0", description: "Where the world builds software", installed: false, category: "Development", exec: "web:https://github.com", icon: "code", isWebApp: true },
    { name: "google-docs", version: "1.0.0", description: "Create and edit documents online", installed: false, category: "Office", exec: "web:https://docs.google.com", icon: "office", isWebApp: true },
    { name: "minecraft-classic", version: "1.0.0", description: "Play Minecraft Classic in your browser", installed: false, category: "Games", exec: "web:https://classic.minecraft.net/", icon: "game", isWebApp: true },
    { name: "js-dos", version: "1.0.0", description: "DOSBox in the browser", installed: false, category: "Games", exec: "web:https://js-dos.com/games/", icon: "game", isWebApp: true },
    { name: "tetris", version: "1.0.0", description: "Play Tetris", installed: false, category: "Games", exec: "web:https://tetris.com/play-tetris", icon: "game", isWebApp: true },
    { name: "chess", version: "1.0.0", description: "Play Chess against the computer", installed: false, category: "Games", exec: "web:https://www.chess.com/play/computer", icon: "game", isWebApp: true },
    { name: "2048", version: "1.0.0", description: "Join the numbers and get to the 2048 tile!", installed: false, category: "Games", exec: "web:https://play2048.co/", icon: "game", isWebApp: true },
    { name: "figma", version: "1.0.0", description: "The collaborative interface design tool.", installed: false, category: "Graphics", exec: "web:https://www.figma.com", icon: "image", isWebApp: true },
    { name: "notion", version: "1.0.0", description: "One workspace. Every team.", installed: false, category: "Office", exec: "web:https://www.notion.so", icon: "office", isWebApp: true },
    { name: "canva", version: "1.0.0", description: "Collaborate & Create Amazing Graphic Design for Free", installed: false, category: "Graphics", exec: "web:https://www.canva.com", icon: "image", isWebApp: true },
    { name: "chatgpt", version: "1.0.0", description: "OpenAI's conversational AI model.", installed: false, category: "Internet", exec: "web:https://chat.openai.com", icon: "chat", isWebApp: true },
    { name: "claude", version: "1.0.0", description: "Anthropic's AI assistant.", installed: false, category: "Internet", exec: "web:https://claude.ai", icon: "chat", isWebApp: true },
    { name: "reddit", version: "1.0.0", description: "Dive into anything", installed: false, category: "Internet", exec: "web:https://www.reddit.com", icon: "browser", isWebApp: true },
    { name: "x-twitter", version: "1.0.0", description: "It's what's happening", installed: false, category: "Internet", exec: "web:https://twitter.com", icon: "browser", isWebApp: true },
    { name: "pinterest", version: "1.0.0", description: "Discover recipes, home ideas, style inspiration and other ideas to try.", installed: false, category: "Internet", exec: "web:https://www.pinterest.com", icon: "image", isWebApp: true },
    { name: "whatsapp", version: "1.0.0", description: "WhatsApp Web", installed: false, category: "Internet", exec: "web:https://web.whatsapp.com", icon: "chat", isWebApp: true },
    { name: "telegram", version: "1.0.0", description: "Telegram Web", installed: false, category: "Internet", exec: "web:https://web.telegram.org", icon: "chat", isWebApp: true },
    { name: "gedit", version: "46.0", description: "A simple and powerful text editor", installed: false, category: "Office", exec: "web:https://gedit.org/", icon: "office", isWebApp: true },
    { name: "sublime-text", version: "4.0", description: "A sophisticated text editor for code, markup and prose", installed: false, category: "Development", exec: "web:https://www.sublimetext.com/", icon: "code", isWebApp: true },
    { name: "vlc", version: "3.0.20", description: "VLC is a free and open source cross-platform multimedia player", installed: false, category: "Media", exec: "web:https://www.videolan.org/vlc/", icon: "video", isWebApp: true },
    { name: "audacious", version: "4.3.1", description: "Audacious is an open source audio player", installed: false, category: "Media", exec: "web:https://audacious-media-player.org/", icon: "music", isWebApp: true },
    { name: "onlyoffice", version: "8.0.1", description: "ONLYOFFICE Docs is an open-source office suite", installed: false, category: "Office", exec: "web:https://www.onlyoffice.com/", icon: "office", isWebApp: true },
    { name: "libreoffice", version: "24.2", description: "LibreOffice is a free and powerful office suite", installed: false, category: "Office", exec: "web:https://www.libreoffice.org/", icon: "office", isWebApp: true },
    { name: "stackblitz", version: "1.0.0", description: "The fastest, most secure dev environment on the planet.", installed: false, category: "Development", exec: "web:https://stackblitz.com", icon: "code", isWebApp: true },
    { name: "replit", version: "1.0.0", description: "The collaborative browser-based IDE", installed: false, category: "Development", exec: "web:https://replit.com", icon: "code", isWebApp: true },
  ];

  app.get("/api/system/packages/search", async (req, res) => {
    try {
      const { q } = req.query;
      const installedAppsDir = path.join(process.env.HOME || "/root", ".local/share/applications");
      let installedApps: string[] = [];
      if (fs.existsSync(installedAppsDir)) {
        installedApps = fs.readdirSync(installedAppsDir).map(f => f.replace('.desktop', ''));
      }

      let results = webApps.map(pkg => ({
        ...pkg,
        installed: installedApps.includes(pkg.name)
      }));

      if (q) {
        const query = (q as string).toLowerCase();
        results = results.filter(pkg => 
          pkg.name.toLowerCase().includes(query) || 
          pkg.description.toLowerCase().includes(query)
        );
        
        // Try to search system packages (pacman or apt)
        try {
          try {
            const { stdout } = await execAsync(`pacman -Ss ${query}`);
            const lines = stdout.split('\n');
            for (let i = 0; i < lines.length; i += 2) {
              if (!lines[i] || !lines[i].includes('/')) continue;
              const [repoAndName, version, ...rest] = lines[i].split(' ');
              const installed = rest.join(' ').includes('[installed');
              const description = lines[i+1]?.trim() || '';
              const name = repoAndName.split('/')[1] || repoAndName;
              if (!results.find(p => p.name === name)) {
                results.push({ name, version, description, installed: !!installed, isWebApp: false, category: 'System', exec: name, icon: 'box' });
              }
            }
          } catch (pacmanErr) {
            // Fallback to apt
            const { stdout } = await execAsync(`apt-cache search ${query} | head -n 20`);
            const lines = stdout.split('\n').filter(Boolean);
            for (const line of lines) {
              const parts = line.split(' - ');
              if (parts.length >= 2) {
                const name = parts[0].trim();
                const description = parts.slice(1).join(' - ').trim();
                if (!results.find(p => p.name === name)) {
                  results.push({ name, version: 'latest', description, installed: false, isWebApp: false, category: 'System', exec: name, icon: 'box' });
                }
              }
            }
          }
        } catch (sysErr) {
          // Ignore system package manager errors
        }
      } else {
        // If no query, also return installed system packages if possible
        try {
          try {
            const { stdout } = await execAsync(`pacman -Q`);
            const lines = stdout.split('\\n').filter(Boolean).slice(0, 50); // Limit to 50
            for (const line of lines) {
              const [name, version] = line.split(' ');
              results.push({ name, version, description: 'Installed system package', installed: true, isWebApp: false, category: 'System', exec: '', icon: 'box' });
            }
          } catch (pacmanErr) {
            const { stdout } = await execAsync(`dpkg-query -W -f='\${binary:Package} \${Version}\\n' | head -n 50`);
            const lines = stdout.split('\\n').filter(Boolean);
            for (const line of lines) {
              const [name, version] = line.split(' ');
              results.push({ name, version, description: 'Installed system package', installed: true, isWebApp: false, category: 'System', exec: '', icon: 'box' });
            }
          }
        } catch (sysErr) {}
      }
      
      res.json({ packages: results });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.post("/api/system/packages/install", async (req, res) => {
    try {
      const { pkg, isWebApp } = req.body;
      
      if (isWebApp !== false) {
        const packageInfo = webApps.find(p => p.name === pkg);
        if (packageInfo) {
          const desktopFileContent = `[Desktop Entry]\nName=${packageInfo.name.charAt(0).toUpperCase() + packageInfo.name.slice(1)}\nExec=${packageInfo.exec}\nIcon=${packageInfo.icon}\nType=Application\nCategories=${packageInfo.category};`;
          const appsDir = path.join(process.env.HOME || "/root", ".local/share/applications");
          if (!fs.existsSync(appsDir)) fs.mkdirSync(appsDir, { recursive: true });
          fs.writeFileSync(path.join(appsDir, `${pkg}.desktop`), desktopFileContent);
          
          // Update personalization
          const newApp = { name: packageInfo.name, exec: packageInfo.exec, icon: packageInfo.icon, category: packageInfo.category };
          if (!personalization.desktopApps.find(a => a.name === newApp.name)) {
            personalization.desktopApps.push(newApp);
          }
          if (!personalization.dockApps.find(a => a.name === newApp.name)) {
            personalization.dockApps.push(newApp);
          }
          fs.writeFileSync(settingsFile, JSON.stringify(personalization, null, 2));
          
          return res.json({ success: true });
        }
      }
      
      // System package install
      try {
        await execAsync(`pacman -S --noconfirm ${pkg}`);
        
        // Update personalization for native app
        const newApp = { name: pkg, exec: pkg, icon: 'box', category: 'System' };
        if (!personalization.desktopApps.find(a => a.name === newApp.name)) {
          personalization.desktopApps.push(newApp);
        }
        fs.writeFileSync(settingsFile, JSON.stringify(personalization, null, 2));
        
        res.json({ success: true });
      } catch (pacmanErr) {
        await execAsync(`DEBIAN_FRONTEND=noninteractive apt-get install -y ${pkg}`);
        
        // Update personalization for native app
        const newApp = { name: pkg, exec: pkg, icon: 'box', category: 'System' };
        if (!personalization.desktopApps.find(a => a.name === newApp.name)) {
          personalization.desktopApps.push(newApp);
        }
        fs.writeFileSync(settingsFile, JSON.stringify(personalization, null, 2));
        
        res.json({ success: true });
      }
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.post("/api/system/packages/uninstall", async (req, res) => {
    try {
      const { pkg, isWebApp } = req.body;
      
      if (isWebApp !== false) {
        const desktopFile = path.join(process.env.HOME || "/root", ".local/share/applications", `${pkg}.desktop`);
        if (fs.existsSync(desktopFile)) {
          fs.unlinkSync(desktopFile);
          
          // Update personalization
          personalization.desktopApps = personalization.desktopApps.filter(a => a.name.toLowerCase() !== pkg.toLowerCase());
          personalization.dockApps = personalization.dockApps.filter(a => a.name.toLowerCase() !== pkg.toLowerCase());
          fs.writeFileSync(settingsFile, JSON.stringify(personalization, null, 2));
          
          return res.json({ success: true });
        }
      }
      
      // System package uninstall
      try {
        await execAsync(`pacman -Rns --noconfirm ${pkg}`);
        res.json({ success: true });
      } catch (pacmanErr) {
        await execAsync(`DEBIAN_FRONTEND=noninteractive apt-get remove -y ${pkg}`);
        res.json({ success: true });
      }
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.get("/api/system/packages/installed", async (req, res) => {
    try {
      const appsDir = path.join(process.env.HOME || "/root", ".local/share/applications");
      let packages: any[] = [];
      
      if (fs.existsSync(appsDir)) {
        const files = fs.readdirSync(appsDir).filter(f => f.endsWith('.desktop'));
        packages = files.map(f => ({ name: f.replace('.desktop', ''), version: '1.0.0' }));
      }
      res.json({ packages });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.post("/api/system/bluetooth/toggle", async (req, res) => {
    try {
      const { enabled } = req.body;
      await execAsync(`rfkill ${enabled ? 'unblock' : 'block'} bluetooth`);
      res.json({ success: true });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.post("/api/system/bluetooth/connect", async (req, res) => {
    try {
      const { mac } = req.body;
      await execAsync(`bluetoothctl connect ${mac}`);
      res.json({ success: true });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // --- SETTINGS: STARTUP ---
  app.get("/api/system/startup", async (req, res) => {
    try {
      const autostartDir = path.join(process.env.HOME || "/root", ".config/autostart");
      let apps: string[] = [];
      if (fs.existsSync(autostartDir)) {
        const files = fs.readdirSync(autostartDir).filter(f => f.endsWith('.desktop'));
        apps = files.map(f => f.replace('.desktop', ''));
      }
      res.json({ apps });
    } catch (e: any) {
      res.json({ error: e.message });
    }
  });

  // --- SETTINGS: PERMISSIONS ---
  app.get("/api/system/permissions", async (req, res) => {
    try {
      res.json({ note: "Flatpak/Snap permissions are managed here.", apps: ["Firefox", "Spotify", "Discord"] });
    } catch (e: any) {
      res.json({ error: e.message });
    }
  });

  // --- SETTINGS: LOCKSCREEN ---
  app.get("/api/system/lockscreen", async (req, res) => {
    try {
      res.json({ status: "Screen lock is enabled." });
    } catch (e: any) {
      res.json({ error: e.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => console.log(`Server running on http://localhost:${PORT}`));
}

startServer();
