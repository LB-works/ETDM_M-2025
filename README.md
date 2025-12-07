# Smart Energy Meter Dashboard

React + Firebase dashboard for IoT Energy Meter with Bypass Detection system.

## Features

- 🔐 Role-based authentication (Customer & Provider)
- 📊 Real-time data visualization with Firebase Realtime Database
- 🚨 Bypass detection alerts with toast notifications
- 📈 Historical charts using Recharts
- 🎨 Dark mode UI with consistent design system
- 📱 Responsive design

## Setup

1. Install dependencies:
```bash
npm install
```

2. Update Firebase configuration in `src/utils/firebaseConfig.js` with your Firebase credentials.

3. Run development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## Firebase Structure

```
/meters/
  └── {PAIR_ID}/
      ├── client/
      │   ├── live_data
      │   └── history/
      └── pole/
          ├── live_data
          └── history/
```

## Login

- Customer: Use any email (defaults to customer role)
- Provider: Use email with "admin" or "provider" in it

## Color Scheme

- Primary: `#13ecec` (Cyan/Teal)
- Background Dark: `#102222`
- Card Dark: `#1a2e2e`
- Success: `#10b981` (Green)
- Danger: `#ef4444` (Red)

## Pages

### Customer
- Dashboard - Live meter readings, charts, alerts
- Usage History - Historical consumption data
- Alerts & Notifications - Alert management
- Account Settings - User preferences

### Provider
- Fleet Overview - All meters grid/map view
- Customer Management - Customer list and management
- Reports / Analytics - Analytics dashboard
- Bypass Detection Logs - Historical bypass incidents

