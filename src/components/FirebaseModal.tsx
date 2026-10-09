'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  RefreshCw, 
  Trash2, 
  UploadCloud,
  HelpCircle,
  Copy
} from 'lucide-react';
import { FirebaseConfigState } from '../lib/types';
import { 
  getStoredFirebaseConfig, 
  saveFirebaseConfig, 
  clearFirebaseConfig, 
  testFirebaseConnection 
} from '../lib/firebase';
import { syncLocalToFirebase } from '../lib/storage';

interface FirebaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated: () => void;
}

export const FirebaseModal: React.FC<FirebaseModalProps> = ({
  isOpen,
  onClose,
  onConfigUpdated,
}) => {
  const [config, setConfig] = useState<FirebaseConfigState>({
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
  });

  const [rawJson, setRawJson] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [showJsonPaste, setShowJsonPaste] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredFirebaseConfig();
      if (stored && stored.apiKey) {
        setConfig(stored);
        setIsConnected(true);
        setStatusMessage({ type: 'success', text: `Connected to Firebase project: ${stored.projectId}` });
      } else {
        setIsConnected(false);
        setStatusMessage({ type: 'info', text: 'Firebase is currently not connected. Data is saved in offline Local Storage.' });
      }
    }
  }, [isOpen]);

  const handleJsonPaste = (text: string) => {
    setRawJson(text);
    try {
      // Try to parse direct JSON or JS object
      let cleaned = text.trim();
      if (cleaned.startsWith('const firebaseConfig =')) {
        cleaned = cleaned.replace('const firebaseConfig =', '').replace(/;\s*$/, '');
      }
      // Replace unquoted keys
      const jsonStr = cleaned.replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":').replace(/'/g, '"');
      const parsed = JSON.parse(jsonStr);
      setConfig({
        apiKey: parsed.apiKey || '',
        authDomain: parsed.authDomain || '',
        projectId: parsed.projectId || '',
        storageBucket: parsed.storageBucket || '',
        messagingSenderId: parsed.messagingSenderId || '',
        appId: parsed.appId || '',
      });
      setStatusMessage({ type: 'success', text: 'Firebase credentials auto-extracted successfully!' });
      setShowJsonPaste(false);
    } catch {
      // Wait for valid JSON
    }
  };

  const handleSaveAndTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config.apiKey || !config.projectId) {
      setStatusMessage({ type: 'error', text: 'API Key aur Project ID lazmi hain!' });
      return;
    }

    try {
      setIsTesting(true);
      setStatusMessage({ type: 'info', text: 'Testing Firebase Firestore connection...' });

      const testResult = await testFirebaseConnection(config);
      if (testResult.success) {
        saveFirebaseConfig(config);
        setIsConnected(true);
        setStatusMessage({ type: 'success', text: 'Mubarak! Firebase kamiyabi se connect ho gaya hai.' });
        onConfigUpdated();
      } else {
        setStatusMessage({ type: 'error', text: `Connection Failed: ${testResult.message}` });
      }
    } catch (err: unknown) {
      const e = err as Error;
      setStatusMessage({ type: 'error', text: `Error: ${e?.message || 'Connection failed'}` });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSyncData = async () => {
    setIsSyncing(true);
    setStatusMessage({ type: 'info', text: 'Local data ko Firestore par upload kiya ja raha hai...' });
    try {
      const res = await syncLocalToFirebase();
      if (res.success) {
        setStatusMessage({ type: 'success', text: `${res.count} transactions Firestore mein kamiyabi se sync ho gaye!` });
        onConfigUpdated();
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Sync fail ho gaya' });
      }
    } catch (e: unknown) {
      const err = e as Error;
      setStatusMessage({ type: 'error', text: err?.message || 'Sync failed' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = () => {
    if (confirm('Kya aap Firebase disconnect karna chahte hain? Data LocalStorage mein mehfooz rahega.')) {
      clearFirebaseConfig();
      setConfig({
        apiKey: '',
        authDomain: '',
        projectId: '',
        storageBucket: '',
        messagingSenderId: '',
        appId: '',
      });
      setIsConnected(false);
      setStatusMessage({ type: 'info', text: 'Firebase disconnect ho gaya. App LocalStorage mode par chal raha hai.' });
      onConfigUpdated();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Firebase Cloud Integration
                {isConnected && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Active
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                Apne business ka cash flow Firestore cloud database se connect karein
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 space-y-4">
          {/* Status Alert Banner */}
          {statusMessage && (
            <div className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                : statusMessage.type === 'error'
                ? 'bg-rose-950/60 text-rose-300 border border-rose-500/30'
                : 'bg-slate-800 text-slate-300 border border-slate-700'
            }`}>
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : statusMessage.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Sync Local Data to Firebase action if connected */}
          {isConnected && (
            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-800/40 flex items-center justify-between">
              <div>
                <h5 className="text-xs font-bold text-emerald-300">Sync Local Data to Cloud</h5>
                <p className="text-[11px] text-slate-400">
                  Apne computer ke tamam transactions Firebase Firestore par upload karein
                </p>
              </div>
              <button
                type="button"
                onClick={handleSyncData}
                disabled={isSyncing}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow cursor-pointer disabled:opacity-50"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>{isSyncing ? 'Syncing...' : 'Upload Data'}</span>
              </button>
            </div>
          )}

          {/* Paste JSON Config Toggle */}
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-slate-400">Firebase Web App Configuration</span>
            <button
              type="button"
              onClick={() => setShowJsonPaste(!showJsonPaste)}
              className="text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
            >
              {showJsonPaste ? 'Hide Config Object' : 'Paste firebaseConfig object'}
            </button>
          </div>

          {showJsonPaste && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Firebase Console se &quot;firebaseConfig = &#123; ... &#125;&quot; paste karein:
              </label>
              <textarea
                rows={4}
                value={rawJson}
                onChange={(e) => handleJsonPaste(e.target.value)}
                placeholder='{ "apiKey": "AIzaSy...", "projectId": "my-shop-flow", ... }'
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {/* Form Inputs */}
          <form onSubmit={handleSaveAndTest} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Project ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. my-cashbook-app"
                  value={config.projectId}
                  onChange={(e) => setConfig({ ...config, projectId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  API Key *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AIzaSyB123..."
                  value={config.apiKey}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Auth Domain
                </label>
                <input
                  type="text"
                  placeholder="project-id.firebaseapp.com"
                  value={config.authDomain}
                  onChange={(e) => setConfig({ ...config, authDomain: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  App ID
                </label>
                <input
                  type="text"
                  placeholder="1:123456789:web:abcdef..."
                  value={config.appId}
                  onChange={(e) => setConfig({ ...config, appId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Storage Bucket
                </label>
                <input
                  type="text"
                  placeholder="project-id.appspot.com"
                  value={config.storageBucket}
                  onChange={(e) => setConfig({ ...config, storageBucket: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Messaging Sender ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1029384756"
                  value={config.messagingSenderId}
                  onChange={(e) => setConfig({ ...config, messagingSenderId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Quick Guide / Help */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
              <p className="font-semibold text-slate-300 flex items-center gap-1">
                <span>Firebase se config kaise hasil karein?</span>
              </p>
              <ol className="list-decimal list-inside space-y-0.5 text-slate-400">
                <li><a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-emerald-400 underline inline-flex items-center gap-0.5">Firebase Console <ExternalLink className="w-2.5 h-2.5" /></a> par jayein aur Project banayein.</li>
                <li>Project Settings &gt; General &gt; &quot;Your Apps&quot; mein Web App add karein.</li>
                <li>Build &gt; <strong>Firestore Database</strong> banayein (Test Mode select karein).</li>
                <li>Upar diye gaye fields fill karein aur &quot;Test &amp; Connect&quot; dabayein!</li>
              </ol>
            </div>

            {/* Footer Buttons */}
            <div className="pt-2 flex items-center justify-between">
              {isConnected ? (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="px-3 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold transition cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isTesting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>{isTesting ? 'Connecting...' : 'Test & Connect'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
