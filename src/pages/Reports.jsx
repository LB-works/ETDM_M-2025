import { useState, useEffect } from 'react';
import { ref, onValue, off, get } from 'firebase/database';
import { db } from '../utils/firebaseConfig';
import { extractMeterPairs } from '../utils/dataParser';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

const Reports = ({ user, setUser }) => {
  const [bypassLogs, setBypassLogs] = useState([]);
  const [allBypassHistory, setAllBypassHistory] = useState([]);
  const [groupedBypassHistory, setGroupedBypassHistory] = useState({});
  const [expandedDays, setExpandedDays] = useState({});

  useEffect(() => {
    const metersRef = ref(db, 'meters');
    
    const unsubscribe = onValue(metersRef, (snapshot) => {
      const pairs = extractMeterPairs(snapshot);
      const logs = pairs
        .filter(pair => pair.client?.theft_detected)
        .map(pair => ({
          pairId: pair.pairId,
          timestamp: pair.client?.timestamp || Date.now() / 1000,
          clientCurrent: pair.client?.current || 0,
          poleCurrent: pair.pole?.second_pzem_current || 0,
          clientEnergy: pair.client?.energy || 0,
          poleEnergy: pair.pole?.pole_energy || 0,
          bypassedEnergy: (pair.pole?.pole_energy || 0) - (pair.client?.energy || 0),
          ratio: pair.pole?.second_pzem_current && pair.client?.current
            ? (pair.pole.second_pzem_current / pair.client.current).toFixed(2)
            : 'N/A',
        }));
      setBypassLogs(logs);
    });

    return () => {
      off(metersRef);
    };
  }, []);

  // Fetch ALL historical bypass events
  useEffect(() => {
    const fetchAllBypassHistory = async () => {
      try {
        const metersSnapshot = await get(ref(db, 'meters'));
        if (!metersSnapshot.exists()) return;

        const metersData = metersSnapshot.val();
        const allEvents = [];

        // Loop through each meter pair
        for (const pairId of Object.keys(metersData)) {
          const clientHistory = metersData[pairId]?.client?.history;
          
          if (clientHistory) {
            // Check each history entry
            Object.keys(clientHistory).forEach((timestamp) => {
              const entry = clientHistory[timestamp];
              
              // If it has theft detected
              if (entry.theft_detected) {
                allEvents.push({
                  pairId,
                  timestamp: parseInt(timestamp),
                  clientCurrent: entry.current || 0,
                  poleCurrent: entry.second_pzem_current || entry.avg_ct_current || 0,
                  clientEnergy: entry.energy || 0,
                  ratio: entry.current_ratio || 'N/A',
                });
              }
            });
          }
        }
        
        // Sort by timestamp (newest first)
        allEvents.sort((a, b) => b.timestamp - a.timestamp);
        setAllBypassHistory(allEvents);
        
        // Group by day
        const grouped = {};
        allEvents.forEach((event) => {
          const date = new Date(event.timestamp * 1000);
          const dateKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
          if (!grouped[dateKey]) {
            grouped[dateKey] = [];
          }
          grouped[dateKey].push(event);
        });
        setGroupedBypassHistory(grouped);
        
        // Auto-expand today's events
        const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        setExpandedDays({ [today]: true });
      } catch (error) {
        console.error('Error fetching bypass history:', error);
      }
    };

    fetchAllBypassHistory();
    // Refresh every minute
    const interval = setInterval(fetchAllBypassHistory, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const toggleDay = (day) => {
    setExpandedDays(prev => ({ ...prev, [day]: !prev[day] }));
  };

  const exportToCSV = () => {
    const dataToExport = allBypassHistory.length > 0 ? allBypassHistory : bypassLogs;
    
    if (dataToExport.length === 0) return;
    
    // CSV Headers
    const headers = ['Date/Time', 'Pair ID', 'Client Current (A)', 'Pole Current (A)', 'Current Ratio', 'Status'];
    
    // CSV Rows
    const rows = dataToExport.map(log => [
      new Date(log.timestamp * 1000).toLocaleString(),
      log.pairId,
      typeof log.clientCurrent === 'number' ? log.clientCurrent.toFixed(3) : log.clientCurrent,
      typeof log.poleCurrent === 'number' ? log.poleCurrent.toFixed(3) : log.poleCurrent,
      log.ratio,
      'Bypass Detected'
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
    link.setAttribute('download', `bypass_detection_logs_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="relative flex min-h-screen w-full">
      <Sidebar userRole="provider" />
      
      <div className="flex-1 flex flex-col">
        <Navbar user={user} setUser={setUser} userRole="provider" />
        
        <main className="flex-1 p-10">
          <div className="flex flex-col max-w-7xl mx-auto gap-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-white text-4xl font-black leading-tight">Bypass Detection Logs</h1>
                <p className="text-slate-400 text-base mt-2">
                  History of all bypass detection incidents • {allBypassHistory.length} total events
                </p>
              </div>
              <button
                onClick={exportToCSV}
                disabled={bypassLogs.length === 0 && allBypassHistory.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-gray-900 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-xl">download</span>
                Export to CSV
              </button>
            </div>

            {/* Currently Active Bypasses */}
            {bypassLogs.length > 0 && (
              <div className="rounded-xl border border-red-500/50 bg-red-950/20 overflow-hidden">
                <div className="px-6 py-4 bg-red-950/30 border-b border-red-500/50">
                  <h2 className="text-red-400 text-lg font-semibold flex items-center gap-2">
                    <span className="material-symbols-outlined animate-pulse">warning</span>
                    Currently Active Bypass Incidents ({bypassLogs.length})
                  </h2>
                </div>
                <table className="w-full">
                  <thead className="bg-white/5 border-b border-white/10">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Timestamp</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Pair ID</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Client Current</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Pole Current</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Ratio</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bypassLogs.map((log, index) => (
                      <tr key={`active-${index}`} className="border-b border-red-500/20 hover:bg-red-950/30 transition-colors">
                        <td className="px-6 py-4 text-slate-300">
                          {new Date(log.timestamp * 1000).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-white font-medium">{log.pairId}</td>
                        <td className="px-6 py-4 text-white">{log.clientCurrent.toFixed(3)} A</td>
                        <td className="px-6 py-4 text-white">{log.poleCurrent.toFixed(3)} A</td>
                        <td className="px-6 py-4 text-red-400 font-semibold">{log.ratio}x</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
                            <span className="material-symbols-outlined text-sm">warning</span>
                            Active Now
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Historical Bypass Events - Grouped by Day */}
            {Object.keys(groupedBypassHistory).length > 0 ? (
              <div className="space-y-4">
                <h2 className="text-white text-2xl font-bold">Historical Bypass Events</h2>
                {Object.keys(groupedBypassHistory).sort((a, b) => new Date(b) - new Date(a)).map((day) => (
                  <div key={day} className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                    <button
                      onClick={() => toggleDay(day)}
                      className="w-full flex items-center justify-between px-6 py-4 bg-white/5 hover:bg-white/10 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-yellow-400">
                          {expandedDays[day] ? 'expand_more' : 'chevron_right'}
                        </span>
                        <div>
                          <h3 className="text-white font-semibold">{day}</h3>
                          <p className="text-slate-400 text-sm">{groupedBypassHistory[day].length} incident{groupedBypassHistory[day].length !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-yellow-400">history</span>
                    </button>
                    
                    {expandedDays[day] && (
                      <div className="border-t border-white/10">
                        <table className="w-full">
                          <thead className="bg-white/5">
                            <tr>
                              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Time</th>
                              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Pair ID</th>
                              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Client Current</th>
                              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Pole Current</th>
                              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Ratio</th>
                              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {groupedBypassHistory[day].map((log, index) => (
                              <tr key={`history-${day}-${index}`} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                                <td className="px-6 py-3 text-slate-300">
                                  {new Date(log.timestamp * 1000).toLocaleTimeString()}
                                </td>
                                <td className="px-6 py-3 text-white font-medium">{log.pairId}</td>
                                <td className="px-6 py-3 text-white">{log.clientCurrent.toFixed(3)} A</td>
                                <td className="px-6 py-3 text-white">{log.poleCurrent.toFixed(3)} A</td>
                                <td className="px-6 py-3 text-yellow-400 font-semibold">{log.ratio}x</td>
                                <td className="px-6 py-3">
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-slate-500/20 text-slate-400">
                                    <span className="material-symbols-outlined text-sm">check_circle</span>
                                    Cleared
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              !bypassLogs.length && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
                  <span className="material-symbols-outlined text-6xl text-slate-400 mb-4 block">security</span>
                  <p className="text-slate-400">No bypass incidents detected. System is secure.</p>
                </div>
              )
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Reports;

