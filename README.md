# Velora CashBook Pro 💰

A modern, full-featured **Business Cash Flow Management, Khata Ledger, and Financial Tracking Application** built with **Next.js 15, Tailwind CSS, Firebase Firestore, PWA, and Electron.js**.

---

## 🚀 Features

- **⚡ Real-Time Cash Flow Dashboard:** Net balance, Cash In (آمدنی), Cash Out (خرچہ), and today's cash movement.
- **🔥 Firebase Cloud Sync:** Real-time 2-way live sync with Google Cloud Firestore.
- **📊 7-Day Interactive Flow Chart:** Visual inflow vs outflow bar graph with payment channel distributions (Cash, Bank, JazzCash/EasyPaisa).
- **👥 Parties & Khata Ledger:** Customer and supplier accounts (لین دین / کھاتہ) with balance tracking.
- **📱 100% Mobile Responsive:** Native-app bottom navigation bar and mobile card view.
- **📦 Progressive Web App (PWA):** Installable on Android, iOS, Windows, and macOS directly from the browser.
- **🖥️ Electron Desktop App:** Cross-platform desktop app with dynamic **IP address assignment** and local network interface detection.
- **📄 Export to CSV:** One-click business report export.

---

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router, React 19, TypeScript)
- **Styling:** Tailwind CSS v4
- **Database:** Firebase Cloud Firestore
- **Desktop:** Electron.js (v34)
- **Icons:** Lucide React

---

## 🏃 Getting Started

### 1. Install Dependencies
```bash
npm install --legacy-peer-deps
```

### 2. Configure Firebase
Create a `.env.local` file (see `.env.example`):
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 3. Run Web App Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🖥️ Running Electron Desktop App

Start the Electron application:
```bash
npm run electron
```

### Assigning a Custom Server IP Address:
- In the Electron app, press **`Ctrl + I`** or go to **Menu > CashBook Pro > Assign Server IP Address...**
- Enter your server IP (e.g. `192.168.1.10`) and Port (`3000`).
- You can also start it directly with an assigned IP:
  ```bash
  npm run electron -- --server=http://192.168.1.10:3000
  ```
