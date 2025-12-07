import { useState, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { db } from '../utils/firebaseConfig';
import { calculateCost } from '../utils/dataParser';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Analytics = ({ user, setUser }) => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('Monthly');
  
  // Analytics Data
  const [totalEnergy, setTotalEnergy] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalBypassedEnergy, setTotalBypassedEnergy] = useState(0);
  const [activeCustomers, setActiveCustomers] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  
  // Bypass Analytics
  const [bypassIncidents, setBypassIncidents] = useState(0);
  const [bypassTrend, setBypassTrend] = useState([]);
  const [energyLost, setEnergyLost] = useState(0);
  
  // System Performance
  const [onlineDevices, setOnlineDevices] = useState(0);
  const [systemUptime, setSystemUptime] = useState(0);
  const [dataTransmissionRate, setDataTransmissionRate] = useState(0);
  
  // Customer Insights
  const [topConsumers, setTopConsumers] = useState([]);
  const [usageDistribution, setUsageDistribution] = useState([]);
  const [highRiskCustomers, setHighRiskCustomers] = useState([]);
  
  // Energy Consumption Trend
  const [energyTrend, setEnergyTrend] = useState([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const metersSnapshot = await get(ref(db, 'meters'));
        
        if (!metersSnapshot.exists()) {
          setLoading(false);
          return;
        }

        const metersData = metersSnapshot.val();
        const meterPairs = Object.keys(metersData);
        
        let totalEnergySum = 0;
        let totalBypassSum = 0;
        let activeCount = 0;
        let onlineCount = 0;
        let bypassCount = 0;
        const consumers = [];
        const riskProfiles = [];
        const bypassEventsByDay = {};
        
        // Process each meter
        meterPairs.forEach(pairId => {
          const client = metersData[pairId]?.client?.live_data;
          const pole = metersData[pairId]?.pole?.live_data;
          const history = metersData[pairId]?.client?.history;
          
          if (client) {
            const clientEnergy = client.energy || 0;
            const poleEnergy = pole?.pole_energy || 0;
            const bypassed = poleEnergy - clientEnergy;
            
            totalEnergySum += clientEnergy;
            if (bypassed > 0) totalBypassSum += bypassed;
            
            if (client.status === 'active') {
              activeCount++;
              onlineCount++;
            }
            
            // Top consumers data
            consumers.push({
              pairId,
              meterId: client.meter_id || pairId,
              energy: clientEnergy,
              power: client.power || 0,
              bypassedEnergy: bypassed > 0 ? bypassed : 0
            });
            
            // Check history for bypass incidents
            if (history) {
              let bypassEventCount = 0;
              Object.keys(history).forEach(ts => {
                if (history[ts].theft_detected) {
                  bypassEventCount++;
                  bypassCount++;
                  
                  // Group by day for trend
                  const date = new Date(parseInt(ts) * 1000).toLocaleDateString();
                  bypassEventsByDay[date] = (bypassEventsByDay[date] || 0) + 1;
                }
              });
              
              if (bypassEventCount > 0) {
                riskProfiles.push({
                  pairId,
                  meterId: client.meter_id || pairId,
                  incidents: bypassEventCount,
                  lastIncident: Math.max(...Object.keys(history).filter(ts => history[ts].theft_detected).map(ts => parseInt(ts)))
                });
              }
            }
          }
        });
        
        // Set summary metrics
        setTotalEnergy(totalEnergySum);
        setTotalRevenue(parseFloat(calculateCost(totalEnergySum)));
        setTotalBypassedEnergy(totalBypassSum);
        setEnergyLost(parseFloat(calculateCost(totalBypassSum)));
        setActiveCustomers(activeCount);
        setTotalCustomers(meterPairs.length);
        setOnlineDevices(onlineCount);
        setBypassIncidents(bypassCount);
        setSystemUptime(onlineCount > 0 ? ((onlineCount / meterPairs.length) * 100).toFixed(1) : 0);
        setDataTransmissionRate(95.5); // Mock data - would calculate from actual transmission logs
        
        // Top 10 consumers
        const sorted = consumers.sort((a, b) => b.energy - a.energy);
        setTopConsumers(sorted.slice(0, 10));
        
        // High-risk customers (most bypass incidents)
        const sortedRisk = riskProfiles.sort((a, b) => b.incidents - a.incidents);
        setHighRiskCustomers(sortedRisk.slice(0, 5));
        
        // Usage distribution for pie chart
        const distribution = [
          { name: 'High Usage (>100 kWh)', value: sorted.filter(c => c.energy > 100).length, color: '#ef4444' },
          { name: 'Medium Usage (50-100 kWh)', value: sorted.filter(c => c.energy >= 50 && c.energy <= 100).length, color: '#f59e0b' },
          { name: 'Low Usage (<50 kWh)', value: sorted.filter(c => c.energy < 50).length, color: '#10b981' },
        ];
        setUsageDistribution(distribution);
        
        // Bypass trend (last 7 days)
        const last7Days = Object.keys(bypassEventsByDay)
          .sort()
          .slice(-7)
          .map(date => ({
            date,
            incidents: bypassEventsByDay[date]
          }));
        setBypassTrend(last7Days);
        
        // Energy consumption trend (mock data for last 30 days)
        const trend = [];
        for (let i = 29; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          trend.push({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            energy: totalEnergySum * (0.85 + Math.random() * 0.3) / 30 // Mock daily distribution
          });
        }
        setEnergyTrend(trend);
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching analytics:', error);
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [period]);
  if (loading) {
    return (
      <div className="relative flex min-h-screen w-full">
        <Sidebar userRole="provider" />
        <div className="flex-1 flex flex-col">
          <Navbar user={user} setUser={setUser} userRole="provider" />
          <main className="flex-1 p-10 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-slate-400">Loading analytics...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full">
      <Sidebar userRole="provider" />
      
      <div className="flex-1 flex flex-col">
        <Navbar user={user} setUser={setUser} userRole="provider" />
        
        <main className="flex-1 p-10 overflow-y-auto">
          <div className="flex flex-col max-w-7xl mx-auto gap-8">
            <div>
              <h1 className="text-white text-4xl font-black leading-tight">Analytics Dashboard</h1>
              <p className="text-slate-400 text-base mt-2">Energy consumption analytics and insights</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="rounded-xl p-6 bg-white/5 border border-white/10">
                <p className="text-slate-300 text-sm font-medium mb-2">Total Energy Consumed</p>
                <p className="text-white text-3xl font-bold">{totalEnergy.toFixed(2)} kWh</p>
                <p className="text-slate-400 text-xs mt-1">All customers combined</p>
              </div>
              <div className="rounded-xl p-6 bg-white/5 border border-white/10">
                <p className="text-slate-300 text-sm font-medium mb-2">Total Revenue</p>
                <p className="text-lime-400 text-3xl font-bold">₦{totalRevenue.toFixed(2)}</p>
                <p className="text-slate-400 text-xs mt-1">From metered energy</p>
              </div>
              <div className="rounded-xl p-6 bg-white/5 border border-red-500/50">
                <p className="text-slate-300 text-sm font-medium mb-2">Energy Lost to Bypass</p>
                <p className="text-red-400 text-3xl font-bold">{totalBypassedEnergy.toFixed(2)} kWh</p>
                <p className="text-red-300 text-xs mt-1">≈ ₦{energyLost.toFixed(2)} lost</p>
              </div>
              <div className="rounded-xl p-6 bg-white/5 border border-white/10">
                <p className="text-slate-300 text-sm font-medium mb-2">Active Customers</p>
                <p className="text-white text-3xl font-bold">{activeCustomers}/{totalCustomers}</p>
                <p className="text-slate-400 text-xs mt-1">Currently online</p>
              </div>
            </div>

            {/* 1. Energy Consumption Analytics */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-white text-xl font-bold">Energy Consumption Trend</h2>
                  <p className="text-slate-400 text-sm">Daily consumption over the last 30 days</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={energyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} label={{ value: 'Energy (kWh)', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1a2e2e', border: '1px solid #3b5454', borderRadius: '8px', color: '#fff' }} />
                  <Legend />
                  <Line type="monotone" dataKey="energy" stroke="#13ecec" strokeWidth={2} name="Energy (kWh)" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* 2. Bypass/Theft Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-white text-xl font-bold mb-4">Bypass Statistics</h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-white/5 rounded-lg">
                    <span className="text-slate-300">Total Bypass Incidents</span>
                    <span className="text-red-400 font-bold text-xl">{bypassIncidents}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-white/5 rounded-lg">
                    <span className="text-slate-300">Energy Stolen</span>
                    <span className="text-red-400 font-bold text-xl">{totalBypassedEnergy.toFixed(2)} kWh</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-white/5 rounded-lg">
                    <span className="text-slate-300">Financial Impact</span>
                    <span className="text-red-400 font-bold text-xl">₦{energyLost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-white/5 rounded-lg">
                    <span className="text-slate-300">High-Risk Customers</span>
                    <span className="text-yellow-400 font-bold text-xl">{highRiskCustomers.length}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-white text-xl font-bold mb-4">Bypass Incidents (Last 7 Days)</h2>
                {bypassTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={bypassTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="date" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                      <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#1a2e2e', border: '1px solid #3b5454', borderRadius: '8px', color: '#fff' }} />
                      <Bar dataKey="incidents" fill="#ef4444" name="Incidents" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-slate-400">
                    <div className="text-center">
                      <span className="material-symbols-outlined text-6xl mb-2 block">verified</span>
                      <p>No bypass incidents in the last 7 days</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 4. System Performance */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-white text-xl font-bold mb-6">System Performance</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-white/5 rounded-lg">
                  <span className="material-symbols-outlined text-5xl text-lime-400 mb-2">check_circle</span>
                  <p className="text-slate-300 text-sm mb-2">System Uptime</p>
                  <p className="text-white text-3xl font-bold">{systemUptime}%</p>
                  <p className="text-slate-400 text-xs mt-1">{onlineDevices}/{totalCustomers} devices online</p>
                </div>
                <div className="text-center p-6 bg-white/5 rounded-lg">
                  <span className="material-symbols-outlined text-5xl text-blue-400 mb-2">wifi</span>
                  <p className="text-slate-300 text-sm mb-2">Data Transmission</p>
                  <p className="text-white text-3xl font-bold">{dataTransmissionRate}%</p>
                  <p className="text-slate-400 text-xs mt-1">Success rate</p>
                </div>
                <div className="text-center p-6 bg-white/5 rounded-lg">
                  <span className="material-symbols-outlined text-5xl text-cyan-400 mb-2">devices</span>
                  <p className="text-slate-300 text-sm mb-2">Active Devices</p>
                  <p className="text-white text-3xl font-bold">{onlineDevices}</p>
                  <p className="text-slate-400 text-xs mt-1">Currently transmitting</p>
                </div>
              </div>
            </div>

            {/* 5. Customer Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Consumers */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-white text-xl font-bold mb-4">Top 10 Energy Consumers</h2>
                <div className="space-y-2">
                  {topConsumers.map((consumer, index) => (
                    <div key={consumer.pairId} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition">
                      <div className="flex items-center gap-3">
                        <span className="text-primary font-bold text-lg w-6">#{index + 1}</span>
                        <div>
                          <p className="text-white font-medium">{consumer.meterId}</p>
                          <p className="text-slate-400 text-xs">{consumer.pairId}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold">{consumer.energy.toFixed(2)} kWh</p>
                        {consumer.bypassedEnergy > 0 && (
                          <p className="text-red-400 text-xs">⚠️ {consumer.bypassedEnergy.toFixed(2)} bypassed</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Usage Distribution */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-white text-xl font-bold mb-4">Usage Distribution</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={usageDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {usageDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1a2e2e', 
                        border: '1px solid #3b5454', 
                        borderRadius: '8px', 
                        color: '#fff' 
                      }} 
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value, entry) => (
                        <span style={{ color: '#9CA3AF', fontSize: '12px' }}>
                          {value} ({entry.payload.value})
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* High-Risk Customers */}
            {highRiskCustomers.length > 0 && (
              <div className="rounded-xl border border-red-500/50 bg-red-950/20 p-6">
                <h2 className="text-red-400 text-xl font-bold mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined">warning</span>
                  High-Risk Customers (Frequent Bypass)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {highRiskCustomers.map((customer) => (
                    <div key={customer.pairId} className="p-4 bg-white/5 border border-red-500/50 rounded-lg">
                      <p className="text-white font-bold">{customer.meterId}</p>
                      <p className="text-slate-400 text-xs mb-2">{customer.pairId}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-red-400 text-sm font-semibold">{customer.incidents} incidents</span>
                        <span className="text-slate-400 text-xs">
                          Last: {new Date(customer.lastIncident * 1000).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Analytics;

