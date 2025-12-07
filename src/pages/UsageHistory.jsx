import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { db } from '../utils/firebaseConfig';
import { ref, onValue, off, get } from 'firebase/database';

const UsageHistory = ({ user, setUser }) => {
  const [pairId, setPairId] = useState('');
  const [rows, setRows] = useState([]);

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
    const histRef = ref(db, `meters/${pairId}/client/history`);
    const unsub = onValue(histRef, (snap) => {
      if (!snap.exists()) { setRows([]); return; }
      const data = snap.val();
      
      // Filter to show only hourly data
      const allTimestamps = Object.keys(data).sort(); // ascending timestamps
      const hourlyData = [];
      let lastHour = null;
      
      // Process timestamps to get one entry per hour
      allTimestamps.forEach((ts) => {
        const date = new Date(parseInt(ts, 10) * 1000);
        const currentHour = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
        
        // Only add if it's a different hour from the last one
        if (currentHour !== lastHour) {
          hourlyData.push({
            ts,
            ...data[ts],
          });
          lastHour = currentHour;
        }
      });
      
      // Take last 100 hourly entries and reverse
      const parsed = hourlyData.slice(-100).reverse();
      setRows(parsed);
    });
    return () => off(histRef);
  }, [pairId]);

  const exportToCSV = () => {
    if (rows.length === 0) return;
    
    // CSV Headers
    const headers = ['Date/Time', 'Voltage (V)', 'Current (A)', 'Power (W)', 'Energy (kWh)'];
    
    // CSV Rows
    const csvRows = rows.map(r => [
      new Date(parseInt(r.ts, 10) * 1000).toLocaleString(),
      Number(r.voltage || 0).toFixed(0),
      Number(r.current || 0).toFixed(2),
      Number(r.power || 0).toFixed(1),
      Number(r.energy || 0).toFixed(3)
    ]);
    
    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `usage_history_${new Date().toISOString().split('T')[0]}.csv`);
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
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-bold">Usage History</h1>
              <button
                onClick={exportToCSV}
                disabled={rows.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-gray-900 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-xl">download</span>
                Export to CSV
              </button>
            </div>
            <div className="rounded-xl border border-gray-200/10 dark:border-[#3b5454] overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-4 py-3 text-left">Time</th>
                    <th className="px-4 py-3 text-left">Voltage (V)</th>
                    <th className="px-4 py-3 text-left">Current (A)</th>
                    <th className="px-4 py-3 text-left">Power (W)</th>
                    <th className="px-4 py-3 text-left">Energy (kWh)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td className="px-4 py-8 text-center text-slate-400" colSpan={5}>No data</td>
                    </tr>
                  ) : (
                    rows.map((r) => (
                      <tr key={r.ts} className="border-t border-white/5">
                        <td className="px-4 py-2">{new Date(parseInt(r.ts, 10) * 1000).toLocaleString()}</td>
                        <td className="px-4 py-2">{Number(r.voltage || 0).toFixed(0)}</td>
                        <td className="px-4 py-2">{Number(r.current || 0).toFixed(2)}</td>
                        <td className="px-4 py-2">{Number(r.power || 0).toFixed(1)}</td>
                        <td className="px-4 py-2">{Number(r.energy || 0).toFixed(3)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default UsageHistory;
