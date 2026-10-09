const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

const VERCEL_DEFAULT_URL = 'https://veloracashbook.vercel.app';
const configPath = path.join(app.getPath('userData'), 'casbook-electron-config.json');

function getSavedConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading config:', err);
  }
  return {
    mode: 'vercel', // 'vercel' or 'custom'
    customUrl: 'http://localhost:3000',
    vercelUrl: VERCEL_DEFAULT_URL,
  };
}

function saveConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving config:', err);
  }
}

function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push({ iface: name, ip: net.address });
      }
    }
  }
  return addresses;
}

let mainWindow = null;
let currentConfig = getSavedConfig();

const VERCEL_URL = 'https://veloracashbook.vercel.app';

function getFullUrl() {
  // If command line specifies another server (e.g. --local or --server=...)
  const argServer = process.argv.find((arg) => arg.startsWith('--server='));
  if (argServer) {
    return argServer.replace('--server=', '');
  }
  if (process.argv.includes('--local')) {
    return 'http://localhost:3000';
  }
  // Otherwise, ALWAYS connect directly to live Vercel URL!
  return VERCEL_URL;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 840,
    minWidth: 380,
    minHeight: 600,
    title: 'CashBook Pro - Velora CashBook',
    backgroundColor: '#020617',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const targetUrl = getFullUrl();
  console.log('Loading CashBook Pro in Electron from:', targetUrl);

  mainWindow.loadURL(targetUrl).catch((err) => {
    console.error('Failed to load URL:', err);
    showConnectionErrorPage(targetUrl);
  });

  mainWindow.webContents.on('did-fail-load', () => {
    showConnectionErrorPage(targetUrl);
  });

  createApplicationMenu();
}

function showConnectionErrorPage(attemptedUrl) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>CashBook Pro - Connection Error</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #020617; color: #f8fafc; padding: 40px; display: flex; align-items: center; justify-content: center; min-height: 80vh; }
          .card { background: #0f172a; border: 1px solid #1e293b; border-radius: 20px; padding: 32px; max-width: 580px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
          h2 { color: #f43f5e; margin-top: 0; font-size: 22px; }
          p { color: #94a3b8; font-size: 14px; line-height: 1.6; }
          code { background: #1e293b; padding: 2px 6px; border-radius: 6px; color: #38bdf8; font-family: monospace; }
          .btn { background: #10b981; color: white; border: none; padding: 10px 18px; border-radius: 12px; font-weight: bold; cursor: pointer; margin-right: 10px; margin-top: 15px; font-size: 13px; }
          .btn-secondary { background: #334155; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>⚠️ Connection Failed</h2>
          <p>Could not connect to: <code>${attemptedUrl}</code></p>
          <p>Please check your internet connection or switch to local server IP.</p>

          <button class="btn" onclick="window.electronAPI.changeIp()">Switch Server / IP Address</button>
          <button class="btn btn-secondary" onclick="window.location.reload()">Retry Connection</button>
        </div>
      </body>
    </html>
  `;

  if (mainWindow) {
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  }
}

function promptChangeIpAddress() {
  const localIps = getLocalIpAddresses()
    .map((item) => `${item.iface}: http://${item.ip}:3000`)
    .join('\n');

  const ipPromptWindow = new BrowserWindow({
    width: 500,
    height: 520,
    parent: mainWindow,
    modal: true,
    title: 'Server & IP Address Configuration',
    backgroundColor: '#020617',
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  ipPromptWindow.setMenu(null);

  const promptHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Server & IP Configuration</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #020617; color: white; padding: 24px; }
          h3 { margin-top: 0; color: #34d399; font-size: 18px; }
          .option-box { background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 14px; margin-top: 14px; cursor: pointer; }
          .option-box:hover { border-color: #10b981; }
          label { display: flex; align-items: center; gap: 8px; font-weight: bold; font-size: 13px; cursor: pointer; }
          input[type="text"] { width: 100%; box-sizing: border-box; padding: 9px; border-radius: 8px; background: #020617; border: 1px solid #334155; color: white; margin-top: 8px; font-size: 13px; }
          .hint { font-size: 11px; color: #64748b; margin-top: 5px; }
          .actions { margin-top: 24px; display: flex; justify-content: flex-end; gap: 8px; }
          button { padding: 9px 16px; border-radius: 8px; font-weight: bold; cursor: pointer; border: none; font-size: 13px; }
          .save { background: #10b981; color: white; }
          .cancel { background: #334155; color: #cbd5e1; }
          .ips-box { background: #0f172a; padding: 8px 12px; border-radius: 8px; font-size: 11px; color: #38bdf8; margin-top: 8px; font-family: monospace; border: 1px solid #1e293b; }
        </style>
      </head>
      <body>
        <h3>🌐 Server & IP Address Link</h3>
        <p style="font-size: 12px; color: #94a3b8; margin-bottom: 12px;">Choose whether Electron loads the Live Vercel App or a Local Network IP.</p>
        
        <!-- Vercel Live Option -->
        <div class="option-box">
          <label>
            <input type="radio" name="mode" value="vercel" ${currentConfig.mode === 'vercel' ? 'checked' : ''} onchange="toggleInputs()" />
            <span>Vercel Live Cloud URL (Official Production)</span>
          </label>
          <input type="text" id="vercelInput" value="${currentConfig.vercelUrl || VERCEL_DEFAULT_URL}" />
        </div>

        <!-- Custom Local IP Option -->
        <div class="option-box">
          <label>
            <input type="radio" name="mode" value="custom" ${currentConfig.mode === 'custom' ? 'checked' : ''} onchange="toggleInputs()" />
            <span>Local Machine / Custom IP Address</span>
          </label>
          <input type="text" id="customInput" value="${currentConfig.customUrl || 'http://localhost:3000'}" placeholder="e.g. http://192.168.1.50:3000" />
          <div class="hint">Detected Local Network IPs:</div>
          <div class="ips-box">${localIps.replace(/\n/g, '<br/>') || 'http://localhost:3000'}</div>
        </div>

        <div class="actions">
          <button class="cancel" onclick="window.close()">Cancel</button>
          <button class="save" onclick="save()">Save & Connect</button>
        </div>

        <script>
          const { ipcRenderer } = require('electron');
          function toggleInputs() {}
          function save() {
            const mode = document.querySelector('input[name="mode"]:checked').value;
            const vercelUrl = document.getElementById('vercelInput').value.trim() || '${VERCEL_DEFAULT_URL}';
            const customUrl = document.getElementById('customInput').value.trim() || 'http://localhost:3000';
            ipcRenderer.send('update-ip-config', { mode, vercelUrl, customUrl });
            window.close();
          }
        </script>
      </body>
    </html>
  `;

  ipPromptWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(promptHtml)}`);
}

ipcMain.on('open-change-ip-modal', () => {
  promptChangeIpAddress();
});

ipcMain.on('update-ip-config', (event, { mode, vercelUrl, customUrl }) => {
  currentConfig.mode = mode;
  currentConfig.vercelUrl = vercelUrl;
  currentConfig.customUrl = customUrl;
  saveConfig(currentConfig);

  const newUrl = getFullUrl();
  console.log('Reconnecting Electron to:', newUrl);
  if (mainWindow) {
    mainWindow.loadURL(newUrl);
  }
});

function createApplicationMenu() {
  const template = [
    {
      label: 'CashBook Pro',
      submenu: [
        {
          label: 'Connect to Vercel Live...',
          click: () => {
            currentConfig.mode = 'vercel';
            saveConfig(currentConfig);
            if (mainWindow) mainWindow.loadURL(currentConfig.vercelUrl || VERCEL_DEFAULT_URL);
          },
        },
        {
          label: 'Assign Server IP Address...',
          accelerator: 'CmdOrCtrl+I',
          click: () => promptChangeIpAddress(),
        },
        {
          label: 'Reload App',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            if (mainWindow) mainWindow.loadURL(getFullUrl());
          },
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'toggledevtools' },
        { type: 'separator' },
        { role: 'resetzoom' },
        { role: 'zoomin' },
        { role: 'zoomout' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Servers',
      submenu: [
        {
          label: `Vercel: ${VERCEL_DEFAULT_URL}`,
          click: () => {
            currentConfig.mode = 'vercel';
            saveConfig(currentConfig);
            if (mainWindow) mainWindow.loadURL(VERCEL_DEFAULT_URL);
          },
        },
        {
          label: 'Localhost: http://localhost:3000',
          click: () => {
            currentConfig.mode = 'custom';
            currentConfig.customUrl = 'http://localhost:3000';
            saveConfig(currentConfig);
            if (mainWindow) mainWindow.loadURL('http://localhost:3000');
          },
        },
        ...getLocalIpAddresses().map((item) => ({
          label: `${item.iface}: http://${item.ip}:3000`,
          click: () => {
            currentConfig.mode = 'custom';
            currentConfig.customUrl = `http://${item.ip}:3000`;
            saveConfig(currentConfig);
            if (mainWindow) mainWindow.loadURL(`http://${item.ip}:3000`);
          },
        })),
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
