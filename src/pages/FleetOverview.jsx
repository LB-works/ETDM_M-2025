import { useState, useEffect } from 'react';
import { ref, onValue, off, get } from 'firebase/database';
import { db } from '../utils/firebaseConfig';
import { extractMeterPairs } from '../utils/dataParser';
import { sendBypassAlertEmail } from '../services/emailService';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

const FleetOverview = ({ user, setUser }) => {
  const [meters, setMeters] = useState([]);
  const [filter, setFilter] = useState('all'); // all, active, bypass
  const [bypassAlertsToday, setBypassAlertsToday] = useState(0);
  const [bypassHistory, setBypassHistory] = useState({});
  const [processedAlerts, setProcessedAlerts] = useState(new Set());

  useEffect(() => {
    // Listen to all meters
    const metersRef = ref(db, 'meters');
    
    const unsubscribe = onValue(metersRef, (snapshot) => {
      const pairs = extractMeterPairs(snapshot);
      setMeters(pairs);
      
      // Check for new bypass alerts and send emails
      pairs.forEach(async (meter) => {
        if (meter.client?.theft_detected) {
          const alertKey = `${meter.pairId}_${meter.client.timestamp}`;
          
          // Only process if we haven't sent email for this specific alert
          if (!processedAlerts.has(alertKey)) {
            console.log('New bypass detected, sending email alert...', meter.pairId);
            
            const emailResult = await sendBypassAlertEmail({
              pairId: meter.pairId,
              meterId: meter.client?.meter_id || meter.pairId,
              clientCurrent: meter.client?.current || 0,
              poleCurrent: meter.pole?.second_pzem_current || 0,
              clientEnergy: meter.client?.energy || 0,
              poleEnergy: meter.pole?.pole_energy || 0,
              timestamp: meter.client?.timestamp || Math.floor(Date.now() / 1000),
              customerEmail: meter.customer_email, // Add customer email to meter data if available
              customerName: meter.customer_name, // Add customer name to meter data if available
            });
            
            if (emailResult.success) {
              // Mark this alert as processed
              setProcessedAlerts(prev => new Set([...prev, alertKey]));
              console.log('Email sent successfully for', meter.pairId);
            } else if (emailResult.reason === 'throttled') {
              console.log('Email throttled for', meter.pairId);
            } else {
              console.error('Email failed for', meter.pairId, emailResult.error);
            }
          }
        }
      });
    }, (error) => {
      console.error('Firebase error:', error);
    });

    return () => {
      off(metersRef);
    };
  }, [processedAlerts]);

  // Fetch today's bypass alerts from history
  useEffect(() => {
    const fetchBypassHistory = async () => {
      try {
        const metersSnapshot = await get(ref(db, 'meters'));
        if (!metersSnapshot.exists()) return;

        const metersData = metersSnapshot.val();
        let todayBypassCount = 0;
        const bypassLog = {};
        
        // Get today's start timestamp (midnight)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = Math.floor(today.getTime() / 1000);

        // Loop through each meter pair
        for (const pairId of Object.keys(metersData)) {
          const clientHistory = metersData[pairId]?.client?.history;
          
          if (clientHistory) {
            const bypassEvents = [];
            
            // Check each history entry
            Object.keys(clientHistory).forEach((timestamp) => {
              const ts = parseInt(timestamp);
              const entry = clientHistory[timestamp];
              
              // If it's from today and has theft detected
              if (ts >= todayTimestamp && entry.theft_detected) {
                bypassEvents.push({
                  timestamp: ts,
                  ...entry
                });
              }
            });
            
            if (bypassEvents.length > 0) {
              bypassLog[pairId] = bypassEvents;
              todayBypassCount++;
            }
          }
        }
        
        setBypassAlertsToday(todayBypassCount);
        setBypassHistory(bypassLog);
      } catch (error) {
        console.error('Error fetching bypass history:', error);
      }
    };

    fetchBypassHistory();
    // Refresh every 30 seconds
    const interval = setInterval(fetchBypassHistory, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Calculate stats
  const totalMeters = meters.length;
  const activeMeters = meters.filter(m => m.client?.status === 'active' || m.pole?.status === 'active').length;
  const currentBypassAlerts = meters.filter(m => m.client?.theft_detected).length;

  // Filter meters
  const filteredMeters = meters.filter(meter => {
    if (filter === 'bypass') return meter.client?.theft_detected;
    if (filter === 'active') return meter.client?.status === 'active' || meter.pole?.status === 'active';
    return true;
  });

  return (
    <div className="relative flex min-h-screen w-full">
      <Sidebar userRole="provider" />
      
      <div className="flex-1 flex flex-col">
        <Navbar user={user} setUser={setUser} userRole="provider" />
        
        <main className="flex-1 p-10">
          <div className="flex flex-col max-w-7xl mx-auto gap-8">
            {/* Page Heading */}
            <div className="flex flex-wrap justify-between gap-3">
              <div className="flex min-w-72 flex-col gap-2">
                <p className="text-white text-4xl font-black leading-tight tracking-[-0.033em]">
                  Fleet Overview
                </p>
                <p className="text-slate-400 text-base font-normal leading-normal">
                  Real-time status of all energy meters.
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col gap-2 rounded-xl p-6 bg-white/5 border border-white/10">
                <p className="text-slate-300 text-base font-medium leading-normal">Total Meters</p>
                <p className="text-white tracking-light text-3xl font-bold leading-tight">{totalMeters}</p>
              </div>
              <div className="flex flex-col gap-2 rounded-xl p-6 bg-white/5 border border-white/10">
                <p className="text-slate-300 text-base font-medium leading-normal">Active Customers</p>
                <p className="text-white tracking-light text-3xl font-bold leading-tight">{activeMeters}</p>
              </div>
              <div className={`flex flex-col gap-2 rounded-xl p-6 bg-white/5 border border-white/10 ${bypassAlertsToday > 0 ? 'glow-danger' : ''}`}>
                <p className="text-slate-300 text-base font-medium leading-normal">Bypass Alerts Today</p>
                <div className="flex items-center gap-2">
                  <p className="text-red-500 tracking-light text-3xl font-bold leading-tight">{bypassAlertsToday}</p>
                  {bypassAlertsToday > 0 && (
                    <span className="material-symbols-outlined text-red-500 text-2xl">warning</span>
                  )}
                </div>
                {currentBypassAlerts > 0 && (
                  <p className="text-red-400 text-xs mt-1">{currentBypassAlerts} active now</p>
                )}
              </div>
            </div>

            {/* Filters */}
            <div className="flex justify-between items-center flex-wrap gap-4">
              {/* Status Legend */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-3 w-3 rounded-full bg-lime-400"></span>
                  <span className="text-xs text-slate-400">Online</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex h-3 w-3 rounded-full bg-slate-500"></span>
                  <span className="text-xs text-slate-400">Offline</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex h-3 w-3 rounded-full bg-red-500"></span>
                  <span className="text-xs text-slate-400">Bypass</span>
                </div>
              </div>

              {/* Filter */}
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Meters</option>
                <option value="active">Active Only</option>
                <option value="bypass">Bypass Alerts</option>
              </select>
            </div>

            {/* Meter Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMeters.length === 0 ? (
                <div className="col-span-full text-center py-12 text-slate-400">
                  <span className="material-symbols-outlined text-6xl mb-4">devices</span>
                  <p>No meters found. Meters will appear here when data is available.</p>
                </div>
              ) : (
                filteredMeters.map((meter) => {
                  const isOnline = meter.client?.status === 'active' || meter.pole?.status === 'active';
                  const hasBypass = meter.client?.theft_detected;
                  
                  return (
                    <div
                      key={meter.pairId}
                      className={`rounded-xl p-6 bg-white/5 border ${
                        hasBypass
                          ? 'border-red-500 glow-danger'
                          : 'border-white/10'
                      } hover:bg-white/10 transition-colors`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-white text-lg font-bold">{meter.pairId}</h3>
                          <p className="text-slate-400 text-sm">
                            {meter.client?.meter_id || 'N/A'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {hasBypass ? (
                            <span className="material-symbols-outlined text-red-500 text-2xl">warning</span>
                          ) : (
                            <span
                              className={`flex h-3 w-3 rounded-full ${
                                isOnline ? 'bg-lime-400' : 'bg-slate-500'
                              }`}
                            ></span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Power</span>
                          <span className="text-white font-medium">
                            {meter.client?.power?.toFixed(1) || '0.0'} W
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Current</span>
                          <span className="text-white font-medium">
                            {meter.client?.current?.toFixed(3) || '0.000'} A
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Energy</span>
                          <span className="text-white font-medium">
                            {meter.client?.energy?.toFixed(2) || '0.00'} kWh
                          </span>
                        </div>
                        {hasBypass && (
                          <div className="mt-4 pt-4 border-t border-red-500/50">
                            <p className="text-red-400 text-sm font-semibold">⚠️ Bypass Detected (Active)</p>
                            <p className="text-red-300 text-xs mt-1">
                              Pole: {meter.pole?.second_pzem_current?.toFixed(3) || 0}A
                            </p>
                            {bypassHistory[meter.pairId] && (
                              <p className="text-yellow-400 text-xs mt-1">
                                {bypassHistory[meter.pairId].length} event(s) today
                              </p>
                            )}
                          </div>
                        )}
                        {!hasBypass && bypassHistory[meter.pairId] && (
                          <div className="mt-4 pt-4 border-t border-yellow-500/50">
                            <p className="text-yellow-400 text-sm font-semibold">⚠️ Previous Bypass Today</p>
                            <p className="text-yellow-300 text-xs mt-1">
                              {bypassHistory[meter.pairId].length} event(s) detected
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default FleetOverview;

