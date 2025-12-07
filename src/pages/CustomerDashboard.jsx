import { useState, useEffect } from 'react';
import { ref, onValue, off, get } from 'firebase/database';
import { db } from '../utils/firebaseConfig';
import {
  formatPower, formatVoltage, formatCurrent, formatEnergy,
  formatFrequency, formatPowerFactor, calculateCost
} from '../utils/dataParser';
import { sendBypassAlertEmail } from '../services/emailService';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import MeterCard from '../components/MeterCard';
import AlertPanel from '../components/AlertPanel';
import { EnergyChart, CurrentComparisonChart } from '../components/ChartView';

const CustomerDashboard = ({ user, setUser }) => {
  const [liveData, setLiveData] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [period, setPeriod] = useState('Daily');
  const [pairId, setPairId] = useState('');
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
  const [isDeviceActive, setIsDeviceActive] = useState(true);
  const [processedAlerts, setProcessedAlerts] = useState(new Set());

  // Resolve pairId for this customer from mapping
  useEffect(() => {
    const fetchPair = async () => {
      if (!user?.email) return;
      const emailKey = user.email.replaceAll('.', ',');
      try {
        const snap = await get(ref(db, `customersByEmail/${emailKey}`));
        if (snap.exists()) {
          const val = snap.val();
          if (val.pairId) setPairId(val.pairId);
        }
      } catch { }
    };
    fetchPair();
  }, [user?.email]);

  // Fetch historical data based on period
  useEffect(() => {
    if (!pairId) return;

    const fetchHistoricalData = async () => {
      try {
        const historyRef = ref(db, `meters/${pairId}/client/history`);
        const snapshot = await get(historyRef);

        if (snapshot.exists()) {
          const allData = [];
          const now = Date.now() / 1000; // Current time in seconds
          let timeRange;

          // Determine time range based on period
          switch (period) {
            case 'Daily':
              timeRange = 24 * 60 * 60; // Last 24 hours
              break;
            case 'Weekly':
              timeRange = 7 * 24 * 60 * 60; // Last 7 days
              break;
            case 'Monthly':
              timeRange = 30 * 24 * 60 * 60; // Last 30 days
              break;
            default:
              timeRange = 24 * 60 * 60;
          }

          console.log('Fetching historical data:', { pairId, period, timeRange, now });

          // Filter data by time range
          snapshot.forEach((childSnapshot) => {
            const timestamp = parseInt(childSnapshot.key);
            const data = childSnapshot.val();

            console.log('Processing data point:', { key: childSnapshot.key, timestamp, data, timeDiff: now - timestamp });

            if (now - timestamp <= timeRange) {
              allData.push({
                timestamp,
                time: new Date(timestamp * 1000).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  ...(period !== 'Daily' && { month: 'short', day: 'numeric' })
                }),
                energy: data.energy || 0,
                power: data.power || 0,
                current: data.current || 0,
              });
            }
          });

          console.log('Filtered data points:', allData.length);

          // Sort by timestamp and limit data points
          allData.sort((a, b) => a.timestamp - b.timestamp);

          // Downsample data for better visualization
          let sampledData = allData;
          if (period === 'Weekly' && allData.length > 50) {
            // Take every nth item to get ~50 points
            const step = Math.ceil(allData.length / 50);
            sampledData = allData.filter((_, index) => index % step === 0);
          } else if (period === 'Monthly' && allData.length > 50) {
            const step = Math.ceil(allData.length / 50);
            sampledData = allData.filter((_, index) => index % step === 0);
          }

          console.log('Sampled data points:', sampledData.length);
          setHistoricalData(sampledData);
        } else {
          console.log('No historical data found for pairId:', pairId);
          setHistoricalData([]);
        }
      } catch (error) {
        console.error('Error fetching historical data:', error);
        setHistoricalData([]);
      }
    };

    fetchHistoricalData();
  }, [pairId, period]);

  useEffect(() => {
    // Listen to live data for real-time updates
    if (!pairId) return;
    const liveDataRef = ref(db, `meters/${pairId}/client/live_data`);

    const unsubscribe = onValue(liveDataRef, async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        console.log('📊 Customer Dashboard - Live data received:', data);
        setLiveData(data);
        setLastUpdateTime(Date.now()); // Update last received time
        setIsDeviceActive(true); // Device is active

        // Check for bypass detection and send email
        if (data.theft_detected) {
          console.log('🚨 Bypass detected in Customer Dashboard!');
          const alertKey = `${pairId}_${data.timestamp}`;

          if (!processedAlerts.has(alertKey)) {
            console.log('🚨 Bypass detected! Sending email alert...', {
              pairId,
              timestamp: data.timestamp,
              clientCurrent: data.current,
              poleCurrent: poleData?.second_pzem_current,
              poleEnergy: poleData?.pole_energy
            });

            const emailResult = await sendBypassAlertEmail({
              pairId,
              meterId: data.meter_id || pairId,
              clientCurrent: data.current || 0,
              poleCurrent: poleData?.second_pzem_current || 0,
              clientEnergy: data.energy || 0,
              poleEnergy: poleData?.pole_energy || 0,
              timestamp: data.timestamp || Math.floor(Date.now() / 1000),
              customerEmail: user?.email,
              customerName: user?.displayName || user?.email,
            });

            if (emailResult.success) {
              setProcessedAlerts(prev => new Set([...prev, alertKey]));
              console.log('✅ Email sent successfully!');
            } else if (emailResult.reason === 'throttled') {
              console.log('⏱️ Email throttled (60-min window)');
            } else {
              console.error('❌ Email failed:', emailResult.error);
            }
          } else {
            console.log('⏭️ Alert already processed:', alertKey);
          }
        }
      }
    }, (error) => {
      console.error('Firebase error:', error);
    });

    return () => {
      off(liveDataRef);
    };
  }, [pairId, user, processedAlerts]);

  // 30-second timeout to detect device offline
  useEffect(() => {
    const checkTimeout = setInterval(() => {
      const timeSinceLastUpdate = Date.now() - lastUpdateTime;
      if (timeSinceLastUpdate > 30000) { // 30 seconds
        setIsDeviceActive(false);
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(checkTimeout);
  }, [lastUpdateTime]);

  // Get pole data for comparison
  const [poleData, setPoleData] = useState(null);
  const [bypassedEnergy, setBypassedEnergy] = useState(0);

  useEffect(() => {
    if (!pairId) return;
    const poleDataRef = ref(db, `meters/${pairId}/pole/live_data`);

    const unsubscribe = onValue(poleDataRef, (snapshot) => {
      if (snapshot.exists()) {
        setPoleData(snapshot.val());
      }
    });

    return () => {
      off(poleDataRef);
    };
  }, [pairId]);

  // Calculate bypassed energy: Pole Energy - Client Energy
  useEffect(() => {
    console.log('Bypass calculation triggered:', {
      clientEnergy: liveData?.energy,
      poleEnergy: poleData?.pole_energy,
      hasClientData: liveData?.energy !== undefined,
      hasPoleData: poleData?.pole_energy !== undefined
    });

    // Check if both energy values are available
    if (liveData?.energy !== undefined && poleData?.pole_energy !== undefined) {
      const clientEnergy = parseFloat(liveData.energy) || 0;
      const poleEnergy = parseFloat(poleData.pole_energy) || 0;

      // Bypassed energy = Pole computed energy - Client side computed energy
      // Only show bypassed energy when theft is actually detected
      let bypassed = 0;
      if (liveData?.theft_detected) {
        bypassed = Math.max(0, poleEnergy - clientEnergy);
      }

      console.log('Bypassed energy calculated:', bypassed, 'Pole:', poleEnergy, 'Client:', clientEnergy, 'Theft detected:', liveData?.theft_detected);
      setBypassedEnergy(bypassed);
    } else if (liveData?.energy !== undefined) {
      // If we only have client data, set bypassed energy to 0
      console.log('Only client data available, setting bypassed energy to 0');
      setBypassedEnergy(0);
    } else {
      console.log('No energy data available');
      setBypassedEnergy(0);
    }
  }, [liveData?.energy, poleData?.pole_energy, liveData?.theft_detected]);

  // Prepare display data (zero out real-time values if device is inactive)
  const displayData = isDeviceActive ? liveData : {
    ...liveData,
    voltage: 0,
    current: 0,
    power: 0,
    power_factor: 0,
    frequency: 0,
  };

  // Prepare chart data
  const chartData = historicalData.map((item, index) => ({
    time: item.time,
    energy: item.energy,
    power: item.power,
  }));

  console.log('Chart data prepared:', { historicalData, chartData });

  const currentComparisonData = historicalData.length > 0 ?
    historicalData.map((item, index) => ({
      time: item.time,
      clientCurrent: item.current,
      poleCurrent: poleData?.second_pzem_current || 0,
      theftDetected: liveData?.theft_detected ? 1 : 0,
    })) : [];

  return (
    <div className="relative flex min-h-screen w-full flex-col">
      <div className="flex h-full w-full">
        <Sidebar userRole="customer" />

        <div className="flex flex-1 flex-col">
          <Navbar user={user} setUser={setUser} userRole="customer" />

          <main className="flex-1 overflow-y-auto p-6 lg:p-10">
            <div className="flex flex-col gap-6 lg:gap-8">
              {/* Bypass Alert */}
              {liveData?.theft_detected && (
                <AlertPanel
                  theftDetected={liveData.theft_detected}
                  pairId={pairId}
                  clientCurrent={liveData.current}
                  poleCurrent={poleData?.second_pzem_current}
                />
              )}

              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <MeterCard
                  title="Current Power"
                  value={displayData?.power?.toFixed(1) || '0.0'}
                  unit="W"
                  icon="bolt"
                  className={liveData?.theft_detected ? 'glow-danger' : ''}
                />
                <MeterCard
                  title="Voltage / Current / PF"
                  value={`${displayData?.voltage?.toFixed(0) || 0}V / ${displayData?.current?.toFixed(1) || 0}A / ${displayData?.power_factor?.toFixed(2) || 0}`}
                  icon="electric_meter"
                />
                <MeterCard
                  title="Total Energy Used"
                  value={liveData?.energy?.toFixed(3) || '0.000'}
                  unit="kWh"
                  icon="battery_charging_full"
                />
                <MeterCard
                  title="Bypassed Energy"
                  value={bypassedEnergy.toFixed(3)}
                  unit="kWh"
                  icon="warning"
                  className={bypassedEnergy > 0.001 ? 'border-red-500/50 bg-red-500/10' : ''}
                />
                <MeterCard
                  title="Cost Estimate"
                  value={`₦${calculateCost(liveData?.energy || 0)}`}
                  icon="payments"
                />
              </div>



              {/* Bypassed Energy Alert */}
              {bypassedEnergy > 0.001 && (
                <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-6">
                  <div className="flex items-start gap-4">
                    <span className="material-symbols-outlined text-red-500 text-3xl">warning</span>
                    <div className="flex-1">
                      <h3 className="text-red-400 font-semibold text-lg mb-2">Energy Bypass Detected</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-slate-400">Pole Energy (Actual)</p>
                          <p className="text-white font-bold text-xl">{poleData?.pole_energy?.toFixed(3) || '0.000'} kWh</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Client Energy (Metered)</p>
                          <p className="text-white font-bold text-xl">{liveData?.energy?.toFixed(3) || '0.000'} kWh</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Bypassed Energy</p>
                          <p className="text-red-400 font-bold text-2xl">{bypassedEnergy.toFixed(3)} kWh</p>
                          <p className="text-red-300 text-xs mt-1">≈ ₦{calculateCost(bypassedEnergy)} lost</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Charts */}
              <div className="flex flex-col gap-4 rounded-xl border border-gray-200/10 dark:border-[#3b5454] p-4 bg-white dark:bg-[#1a2e2e]/50">
                <div className="flex items-center justify-between px-2 pt-2">
                  <div>
                    <p className="text-gray-900 dark:text-white text-base font-medium leading-normal">
                      Energy Usage Overview
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      Track your consumption patterns.
                    </p>
                  </div>
                  <div className="flex h-10 w-full max-w-xs items-center justify-center rounded-xl bg-gray-100 dark:bg-[#283939] p-1">
                    {['Daily', 'Weekly', 'Monthly'].map((p) => (
                      <label
                        key={p}
                        className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 text-sm font-medium transition-colors ${period === p
                            ? 'bg-white dark:bg-[#111818] shadow-sm text-gray-900 dark:text-white'
                            : 'text-gray-500 dark:text-[#9db9b9] hover:bg-gray-200 dark:hover:bg-[#3b5454]'
                          }`}
                      >
                        <span className="truncate">{p}</span>
                        <input
                          type="radio"
                          name="period"
                          value={p}
                          checked={period === p}
                          onChange={(e) => setPeriod(e.target.value)}
                          className="invisible w-0"
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <div className="px-2 py-4">
                  <EnergyChart data={chartData} period={period} />
                </div>
              </div>

              {/* Current Comparison Chart */}
              <div className="flex flex-col gap-4 rounded-xl border border-gray-200/10 dark:border-[#3b5454] p-4 bg-white dark:bg-[#1a2e2e]/50">
                <div className="px-2 pt-2">
                  <p className="text-gray-900 dark:text-white text-base font-medium leading-normal mb-1">
                    Current Comparison (Bypass Detection)
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Pole vs Client current readings.
                  </p>
                </div>
                <div className="px-2 py-4">
                  <CurrentComparisonChart data={currentComparisonData} />
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;

