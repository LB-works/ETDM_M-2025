import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { db } from '../utils/firebaseConfig';
import { ref, onValue, off, get } from 'firebase/database';

const AlertsNotifications = ({ user, setUser }) => {
  const [pairId, setPairId] = useState('');
  const [alerts, setAlerts] = useState([]);
  const [groupedAlerts, setGroupedAlerts] = useState({});
  const [expandedDays, setExpandedDays] = useState({});

  useEffect(() => {
    const fetchPair = async () => {
      if (!user?.email) return;
      const emailKey = user.email.replaceAll('.', ',');
      try {
        const snap = await get(ref(db, `customersByEmail/${emailKey}`));
        if (snap.exists() && snap.val().pairId) setPairId(snap.val().pairId);
      } catch {}
    };
    fetchPair();
  }, [user?.email]);

  useEffect(() => {
    if (!pairId) return;
    // Show all bypass detections (no hourly filtering for alerts)
    const histRef = ref(db, `meters/${pairId}/client/history`);
    const unsub = onValue(histRef, (snap) => {
      if (!snap.exists()) { setAlerts([]); return; }
      const data = snap.val();
      const items = Object.keys(data).map((ts) => ({ ts, ...data[ts] }));
      // Filter only theft detected entries (bypass detection)
      const thefts = items.filter((i) => i.theft_detected);
      setAlerts(thefts.reverse());
      
      // Group alerts by day
      const grouped = {};
      thefts.forEach((alert) => {
        const date = new Date(parseInt(alert.ts, 10) * 1000);
        const dateKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(alert);
      });
      setGroupedAlerts(grouped);
      
      // Auto-expand today's alerts
      const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      setExpandedDays({ [today]: true });
    });
    return () => off(histRef);
  }, [pairId]);

  const toggleDay = (day) => {
    setExpandedDays(prev => ({ ...prev, [day]: !prev[day] }));
  };

  const exportToCSV = () => {
    if (alerts.length === 0) return;
    
    // CSV Headers
    const headers = ['Date/Time', 'Type', 'Client Current (A)', 'Pole Current (A)', 'Current Ratio'];
    
    // CSV Rows
    const rows = alerts.map(a => [
      new Date(parseInt(a.ts, 10) * 1000).toLocaleString(),
      'Energy Theft',
      Number(a.avg_pzem_current || a.current || 0).toFixed(2),
      Number(a.avg_ct_current || a.second_pzem_current || 0).toFixed(2),
      a.current_ratio?.toFixed?.(2) ?? a.current_ratio
    ]);
    
    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `alerts_notifications_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="relative flex min-h-screen w-full">
      <Sidebar userRole="customer" />
      <div className="flex-1 flex flex-col">
        <Navbar user={user} setUser={setUser} userRole="customer" />
        <main className="flex-1 overflow-y-auto p-6 lg:p-10">
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">Alerts & Notifications</h1>
              <button
                onClick={exportToCSV}
                disabled={alerts.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-gray-900 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-xl">download</span>
                Export to CSV
              </button>
            </div>

            {Object.keys(groupedAlerts).length === 0 ? (
              <div className="rounded-xl border border-gray-200/10 dark:border-[#3b5454] p-12 text-center text-slate-400">
                <span className="material-symbols-outlined text-6xl mb-4 block">notifications_off</span>
                <p>No alerts found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.keys(groupedAlerts).sort((a, b) => new Date(b) - new Date(a)).map((day) => (
                  <div key={day} className="rounded-xl border border-gray-200/10 dark:border-[#3b5454] overflow-hidden">
                    <button
                      onClick={() => toggleDay(day)}
                      className="w-full flex items-center justify-between px-6 py-4 bg-white/5 hover:bg-white/10 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-red-500">
                          {expandedDays[day] ? 'expand_more' : 'chevron_right'}
                        </span>
                        <div>
                          <h3 className="text-white font-semibold">{day}</h3>
                          <p className="text-slate-400 text-sm">{groupedAlerts[day].length} alert{groupedAlerts[day].length !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-red-500">warning</span>
                    </button>
                    
                    {expandedDays[day] && (
                      <div className="border-t border-gray-200/10 dark:border-[#3b5454]">
                        <table className="w-full text-sm">
                          <thead className="bg-white/5">
                            <tr>
                              <th className="px-4 py-3 text-left">Time</th>
                              <th className="px-4 py-3 text-left">Type</th>
                              <th className="px-4 py-3 text-left">Details</th>
                            </tr>
                          </thead>
                          <tbody>
                            {groupedAlerts[day].map((a) => (
                              <tr key={a.ts} className="border-t border-white/5 hover:bg-white/5">
                                <td className="px-4 py-2">{new Date(parseInt(a.ts, 10) * 1000).toLocaleTimeString()}</td>
                                <td className="px-4 py-2">Energy Theft</td>
                                <td className="px-4 py-2">Ratio: {a.current_ratio?.toFixed?.(2) ?? a.current_ratio} | Client I: {Number(a.avg_pzem_current || a.current || 0).toFixed(2)}A | Pole I: {Number(a.avg_ct_current || a.second_pzem_current || 0).toFixed(2)}A</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AlertsNotifications;
