const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  changeIp: () => ipcRenderer.send('open-change-ip-modal'),
  notifyOffline: () => ipcRenderer.send('notify-offline'),
  notifyOnline: () => ipcRenderer.send('notify-online'),
});

// Inject Top URL & Connectivity Bar into Electron Window
window.addEventListener('DOMContentLoaded', () => {
  const bar = document.createElement('div');
  bar.id = 'electron-status-bar';
  bar.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 36px;
    background: #020617;
    border-bottom: 1px solid #1e293b;
    color: #94a3b8;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 14px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 11px;
    font-weight: 600;
    z-index: 999999;
    user-select: none;
    box-shadow: 0 2px 10px rgba(0,0,0,0.4);
  `;

  const left = document.createElement('div');
  left.style.cssText = 'display: flex; align-items: center; gap: 8px; overflow: hidden;';
  
  const urlBadge = document.createElement('span');
  urlBadge.style.cssText = 'color: #38bdf8; background: #0f172a; padding: 2px 8px; border-radius: 6px; border: 1px solid #1e293b; font-family: monospace; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 480px;';
  urlBadge.id = 'electron-url-text';
  urlBadge.textContent = window.location.href || 'https://veloracashbook.vercel.app';
  urlBadge.title = window.location.href;

  left.innerHTML = '<span style="color:#64748b;">🔗 URL:</span>';
  left.appendChild(urlBadge);

  const right = document.createElement('div');
  right.style.cssText = 'display: flex; align-items: center; gap: 10px; shrink: 0;';

  const statusBadge = document.createElement('div');
  statusBadge.id = 'electron-online-badge';
  statusBadge.style.cssText = 'display: flex; align-items: center; gap: 6px; padding: 3px 8px; border-radius: 6px; font-weight: bold; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;';
  
  const changeBtn = document.createElement('button');
  changeBtn.textContent = 'Change IP / Server';
  changeBtn.style.cssText = 'background: #1e293b; color: #cbd5e1; border: 1px solid #334155; padding: 2px 8px; border-radius: 6px; cursor: pointer; font-size: 10px; font-weight: 600;';
  changeBtn.onclick = () => ipcRenderer.send('open-change-ip-modal');

  right.appendChild(statusBadge);
  right.appendChild(changeBtn);

  bar.appendChild(left);
  bar.appendChild(right);
  document.body.prepend(bar);

  // Push main page down by 36px so it doesn't overlap header
  document.body.style.paddingTop = '36px';

  function updateStatus(isOnline) {
    if (isOnline) {
      statusBadge.style.background = 'rgba(16, 185, 129, 0.15)';
      statusBadge.style.color = '#34d399';
      statusBadge.style.border = '1px solid rgba(16, 185, 129, 0.3)';
      statusBadge.innerHTML = '<span style="width:6px; height:6px; border-radius:50%; background:#10b981; display:inline-block;"></span> Online (Sync Active)';
      ipcRenderer.send('notify-online');
    } else {
      statusBadge.style.background = 'rgba(244, 63, 94, 0.2)';
      statusBadge.style.color = '#fb7185';
      statusBadge.style.border = '1px solid rgba(244, 63, 94, 0.4)';
      statusBadge.innerHTML = '<span style="width:6px; height:6px; border-radius:50%; background:#f43f5e; display:inline-block;"></span> Offline (Upload Paused)';
      ipcRenderer.send('notify-offline');
      
      // Native Offline Alert Popup
      alert('⚠️ ALERT: Aapka App OFFLINE Hai!\n\nInternet connection nahi hai. Data database par upload nahi hoga. Nayi entries local device mein mehfooz ki ja rahi hain.');
    }
  }

  // Initial check & event listeners
  updateStatus(navigator.onLine);
  window.addEventListener('online', () => updateStatus(true));
  window.addEventListener('offline', () => updateStatus(false));

  // Update URL if location changes
  setInterval(() => {
    if (urlBadge && urlBadge.textContent !== window.location.href) {
      urlBadge.textContent = window.location.href;
      urlBadge.title = window.location.href;
    }
  }, 1000);
});
