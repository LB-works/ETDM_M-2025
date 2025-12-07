import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { db } from '../utils/firebaseConfig';
import { ref, get, update } from 'firebase/database';
import toast from 'react-hot-toast';

const AccountSettings = ({ user }) => {
  const [profile, setProfile] = useState({ name: '', location: '', meterId: '', pairId: '' });
  const [loading, setLoading] = useState(true);

  const emailKey = (e) => e.replaceAll('.', ',');

  useEffect(() => {
    const load = async () => {
      if (!user?.email) return;
      try {
        const snap = await get(ref(db, `customersByEmail/${emailKey(user.email)}`));
        if (snap.exists()) {
          const val = snap.val();
          setProfile({
            name: val.name || '',
            location: val.location || '',
            meterId: val.meterId || '',
            pairId: val.pairId || '',
          });
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, [user?.email]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await update(ref(db, `customersByEmail/${emailKey(user.email)}`), {
        name: profile.name,
        location: profile.location,
      });
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err?.message || 'Update failed');
    }
  };

  return (
    <div className="relative flex min-h-screen w-full">
      <Sidebar userRole="customer" />
      <div className="flex-1 flex flex-col">
        <Navbar user={user} userRole="customer" />
        <main className="flex-1 overflow-y-auto p-6 lg:p-10">
          <div className="max-w-xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold">Account Settings</h1>
            {loading ? (
              <div className="text-slate-400">Loading...</div>
            ) : (
              <form onSubmit={handleSave} className="space-y-4 rounded-xl border border-gray-200/10 dark:border-[#3b5454] p-6 bg-white dark:bg-[#1a2e2e]/50">
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Name</label>
                  <input className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary" value={profile.name} onChange={(e)=>setProfile({...profile, name:e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Location</label>
                  <input className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary" value={profile.location} onChange={(e)=>setProfile({...profile, location:e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-300 mb-2">Meter ID</label>
                    <input disabled className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-400" value={profile.meterId} />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-2">Pair ID</label>
                    <input disabled className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-400" value={profile.pairId} />
                  </div>
                </div>
                <div>
                  <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-semibold text-gray-900 hover:bg-primary-600 transition-colors">
                    Save Changes
                  </button>
                </div>
              </form>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AccountSettings;
