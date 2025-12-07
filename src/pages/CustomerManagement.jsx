import { useState, useEffect } from 'react';
import { ref, onValue, off, get, set, remove } from 'firebase/database';
import { db } from '../utils/firebaseConfig';
import { extractMeterPairs } from '../utils/dataParser';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';

const CustomerManagement = ({ user, setUser }) => {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({ name: '', location: '', meterId: '', email: '' });
  const [registered, setRegistered] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const metersRef = ref(db, 'meters');
    
    const unsubscribe = onValue(metersRef, (snapshot) => {
      const pairs = extractMeterPairs(snapshot);
      setCustomers(pairs);
    });

    return () => {
      off(metersRef);
    };
  }, []);

  // Subscribe to registered customers
  useEffect(() => {
    const regRef = ref(db, 'customersByEmail');
    const unsub = onValue(regRef, (snap) => {
      if (!snap.exists()) { setRegistered([]); return; }
      const data = snap.val();
      const list = Object.keys(data).map((k) => ({ key: k, ...data[k] }));
      setRegistered(list);
    });
    return () => off(regRef);
  }, []);

  const filteredCustomers = customers.filter(customer =>
    customer.pairId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.client?.meter_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const emailKey = (e) => e.replaceAll('.', ',');

  const resolvePairIdByMeter = async (meterId) => {
    try {
      const metersSnap = await get(ref(db, 'meters'));
      if (metersSnap.exists()) {
        const meters = metersSnap.val();
        for (const pid of Object.keys(meters)) {
          const live = meters[pid]?.client?.live_data;
          if (live && (live.meter_id === meterId)) {
            return pid;
          }
        }
      }
    } catch {}
    return '';
  };

  const handleViewDetails = (customer) => {
    setSelectedCustomer(customer);
    setShowModal(true);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const { name, location, meterId, email } = form;
    if (!name || !location || !meterId || !email) {
      toast.error('Please fill all fields');
      return;
    }
    try {
      const pairId = await resolvePairIdByMeter(meterId.trim());
      await set(ref(db, `customersByEmail/${emailKey(email.trim())}`), {
        name: name.trim(),
        location: location.trim(),
        meterId: meterId.trim(),
        pairId,
        createdAt: Date.now(),
      });
      toast.success(`Customer registered${pairId ? ` (pair ${pairId})` : ''}`);
      setForm({ name: '', location: '', meterId: '', email: '' });
    } catch (err) {
      toast.error(err?.message || 'Failed to register');
    }
  };

  return (
    <div className="relative flex min-h-screen w-full">
      <Sidebar userRole="provider" />
      
      <div className="flex-1 flex flex-col">
        <Navbar user={user} setUser={setUser} userRole="provider" />
        
        <main className="flex-1 p-10">
          <div className="flex flex-col max-w-7xl mx-auto gap-8">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <h1 className="text-white text-4xl font-black leading-tight">Customer Management</h1>
                <p className="text-slate-400 text-base mt-2">Manage all customer accounts and meters</p>
              </div>
            </div>

            {/* Register Customer */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-white text-lg font-semibold mb-4">Register New Customer</h2>
              <form className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end" onSubmit={handleRegister}>
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Names</label>
                  <input value={form.name} onChange={e=>setForm({...form, name:e.target.value})} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Full name" />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Location</label>
                  <input value={form.location} onChange={e=>setForm({...form, location:e.target.value})} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="e.g., Lagos" />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Meter ID</label>
                  <input value={form.meterId} onChange={e=>setForm({...form, meterId:e.target.value})} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="e.g., CLIENT_001" />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Email address</label>
                  <input type="email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="customer@email.com" />
                </div>
                <div className="md:col-span-2 lg:col-span-4">
                  <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-semibold text-gray-900 hover:bg-primary-600 transition-colors">
                    <span className="material-symbols-outlined">person_add</span>
                    Add Customer
                  </button>
                </div>
              </form>
            </div>

            {/* Search */}
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search by meter ID or pair ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Customer Table */}
            <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Pair ID</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Meter ID</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Current Power</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Total Energy</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Alerts</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                        No customers found
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <tr key={customer.pairId} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 text-white font-medium">{customer.pairId}</td>
                        <td className="px-6 py-4 text-slate-300">{customer.client?.meter_id || 'N/A'}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                              customer.client?.status === 'active'
                                ? 'bg-lime-500/20 text-lime-400'
                                : 'bg-slate-500/20 text-slate-400'
                            }`}
                          >
                            <span
                              className={`h-2 w-2 rounded-full ${
                                customer.client?.status === 'active' ? 'bg-lime-400' : 'bg-slate-500'
                              }`}
                            ></span>
                            {customer.client?.status === 'active' ? 'Active' : 'Offline'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-white">
                          {customer.client?.power?.toFixed(1) || '0.0'} W
                        </td>
                        <td className="px-6 py-4 text-white">
                          {customer.client?.energy?.toFixed(2) || '0.00'} kWh
                        </td>
                        <td className="px-6 py-4">
                          {customer.client?.theft_detected ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
                              <span className="material-symbols-outlined text-sm">warning</span>
                              Bypass
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">None</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => handleViewDetails(customer)}
                            className="text-primary hover:text-primary-600 text-sm font-medium"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Details Modal */}
            {showModal && selectedCustomer && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-[#1a2e2e] border border-white/10 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6 border-b border-white/10 flex justify-between items-center">
                    <h2 className="text-white text-xl font-bold">Customer Details</h2>
                    <button 
                      onClick={() => setShowModal(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
                  
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-slate-400 text-sm">Pair ID</p>
                        <p className="text-white font-medium">{selectedCustomer.pairId}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">Meter ID</p>
                        <p className="text-white font-medium">{selectedCustomer.client?.meter_id || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">Status</p>
                        <p className={`font-medium ${selectedCustomer.client?.status === 'active' ? 'text-lime-400' : 'text-slate-400'}`}>
                          {selectedCustomer.client?.status === 'active' ? 'Active' : 'Offline'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">Voltage</p>
                        <p className="text-white font-medium">{selectedCustomer.client?.voltage?.toFixed(1) || '0.0'} V</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">Current</p>
                        <p className="text-white font-medium">{selectedCustomer.client?.current?.toFixed(3) || '0.000'} A</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">Power</p>
                        <p className="text-white font-medium">{selectedCustomer.client?.power?.toFixed(1) || '0.0'} W</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">Client Energy</p>
                        <p className="text-white font-medium">{selectedCustomer.client?.energy?.toFixed(3) || '0.000'} kWh</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">Pole Energy</p>
                        <p className="text-white font-medium">{selectedCustomer.pole?.pole_energy?.toFixed(3) || '0.000'} kWh</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">Frequency</p>
                        <p className="text-white font-medium">{selectedCustomer.client?.frequency?.toFixed(1) || '0.0'} Hz</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">Power Factor</p>
                        <p className="text-white font-medium">{selectedCustomer.client?.power_factor?.toFixed(2) || '0.00'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">WiFi RSSI</p>
                        <p className="text-white font-medium">{selectedCustomer.client?.wifi_rssi || 'N/A'} dBm</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">Bypassed Energy</p>
                        <p className="text-red-400 font-bold">
                          {(() => {
                            const bypassed = (selectedCustomer.pole?.pole_energy || 0) - (selectedCustomer.client?.energy || 0);
                            return bypassed > 0 ? `${bypassed.toFixed(3)} kWh` : '0.000 kWh';
                          })()}
                        </p>
                      </div>
                    </div>
                    
                    {selectedCustomer.client?.theft_detected && (
                      <div className="mt-6 p-4 border border-red-500/50 bg-red-500/10 rounded-lg">
                        <p className="text-red-400 font-semibold flex items-center gap-2">
                          <span className="material-symbols-outlined">warning</span>
                          Bypass Detected
                        </p>
                        <div className="mt-2 text-sm text-red-300">
                          <p>Client Current: {selectedCustomer.client?.current?.toFixed(3) || '0.000'} A</p>
                          <p>Pole Current: {selectedCustomer.pole?.second_pzem_current?.toFixed(3) || '0.000'} A</p>
                          <p>Current Ratio: {selectedCustomer.client?.current_ratio?.toFixed(2) || 'N/A'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default CustomerManagement;

