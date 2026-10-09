const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Config file path for persisting assigned IP address and port
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
    serverIp: 'localhost',
    serverPort: '3000',
    protocol: 'http',
  };
}

function saveConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving config:', err);
  }
}

// Find local Wi-Fi / Ethernet IPv4 addresses
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

function getFullUrl() {
  // Can be overridden via command-line arguments: --server=http://192.168.1.10:3000
  const argServer = process.argv.find((arg) => arg.startsWith('--server='));
  if (argServer) {
    return argServer.replace('--server=', '');
  }
  return `${currentConfig.protocol || 'http'}://${currentConfig.serverIp || 'localhost'}:${currentConfig.serverPort || '3000'}`;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 840,
    minWidth: 380, // allows resizing to mobile screen width!
    minHeight: 600,
    title: 'CashBook Pro - Business Cash Flow',
    backgroundColor: '#020617',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const targetUrl = getFullUrl();
  console.log('Loading CashBook Pro at:', targetUrl);

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
  const localIps = getLocalIpAddresses()
    .map((item) => `<li><strong>${item.iface}:</strong> <code>http://${item.ip}:${currentConfig.serverPort}</code></li>`)
    .join('');

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
          ul { color: #cbd5e1; font-size: 13px; line-height: 1.8; padding-left: 20px; }
          .btn { background: #10b981; color: white; border: none; padding: 10px 18px; border-radius: 12px; font-weight: bold; cursor: pointer; margin-right: 10px; margin-top: 15px; font-size: 13px; }
          .btn-secondary { background: #334155; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>⚠️ Server Connection Failed</h2>
          <p>Could not connect to: <code>${attemptedUrl}</code></p>
          <p>Please ensure that Next.js server is running (<code>npm run dev</code>) or update the assigned IP address.</p>
          
          <p><strong>Your Local Network IP Addresses:</strong></p>
          <ul>${localIps || '<li>localhost (127.0.0.1)</li>'}</ul>

          <button class="btn" onclick="window.electronAPI.changeIp()">Change IP Address / Server</button>
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
    .map((item) => `${item.iface}: ${item.ip}`)
    .join('\n');

  const ipPromptWindow = new BrowserWindow({
    width: 480,
    height: 480,
    parent: mainWindow,
    modal: true,
    title: 'Assign IP Address',
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
        <title>Assign Server IP Address</title>
        <style>
          body { font-family: sans-serif; background: #020617; color: white; padding: 24px; }
          h3 { margin-top: 0; color: #34d399; font-size: 18px; }
          label { display: block; font-size: 12px; color: #94a3b8; margin-top: 12px; text-transform: uppercase; font-weight: bold; }
          input { width: 100%; box-sizing: border-box; padding: 10px; border-radius: 8px; background: #0f172a; border: 1px solid #334155; color: white; margin-top: 4px; font-size: 14px; }
          .hint { font-size: 11px; color: #64748b; margin-top: 4px; }
          .actions { margin-top: 24px; display: flex; justify-content: flex-end; gap: 8px; }
          button { padding: 9px 16px; border-radius: 8px; font-weight: bold; cursor: pointer; border: none; font-size: 13px; }
          .save { background: #10b981; color: white; }
          .cancel { background: #334155; color: #cbd5e1; }
          .ips-box { background: #0f172a; padding: 8px 12px; border-radius: 8px; font-size: 11px; color: #38bdf8; margin-top: 10px; font-family: monospace; border: 1px solid #1e293b; }
        </style>
      </head>
      <body>
        <h3>🌐 Assign Server IP Address</h3>
        <p style="font-size: 12px; color: #94a3b8;">Set the host IP address where CashBook Pro is running.</p>
        
        <label>Server IP / Hostname</label>
        <input type="text" id="ipInput" value="${currentConfig.serverIp}" placeholder="e.g. 192.168.1.100 or localhost" />

        <label>Port</label>
        <input type="text" id="portInput" value="${currentConfig.serverPort}" placeholder="3000" />

        <div class="hint">Detected Local Machine IPs:</div>
        <div class="ips-box">${localIps.replace(/\n/g, '<br/>') || '127.0.0.1 (localhost)'}</div>

        <div class="actions">
          <button class="cancel" onclick="window.close()">Cancel</button>
          <button class="save" onclick="save()">Save & Connect</button>
        </div>

        <script>
          const { ipcRenderer } = require('electron');
          function save() {
            const ip = document.getElementById('ipInput').value.trim() || 'localhost';
            const port = document.getElementById('portInput').value.trim() || '3000';
            ipcRenderer.send('update-ip-config', { ip, port });
            window.close();
          }
        </script>
      </body>
    </html>
  `;

  ipPromptWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(promptHtml)}`);
}

ipcMain.on('update-ip-config', (event, { ip, port }) => {
  currentConfig.serverIp = ip;
  currentConfig.serverPort = port;
  saveConfig(currentConfig);

  const newUrl = getFullUrl();
  console.log('Reconnecting to updated IP:', newUrl);
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
      label: 'Network IP Info',
      submenu: getLocalIpAddresses().map((item) => ({
        label: `${item.iface}: ${item.ip}`,
        click: () => {
          dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Network IP Address',
            message: `Interface: ${item.iface}\nIP: ${item.ip}\nFull URL: http://${item.ip}:${currentConfig.serverPort}`,
          });
        },
      })),
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
