import { useState } from 'react';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth, db } from '../utils/firebaseConfig';
import { ref, get, set, update } from 'firebase/database';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const CustomerSignup = () => {
  const [email, setEmail] = useState('');
  const [meterId, setMeterId] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const navigate = useNavigate();

  const emailKey = (e) => e.replaceAll('.', ',');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !meterId || !password || !confirm) {
      toast.error('Fill all fields');
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      // Verify admin pre-registration
      const regSnap = await get(ref(db, `customersByEmail/${emailKey(email)}`));
      if (!regSnap.exists()) {
        toast.error('This email is not registered by admin');
        return;
      }
      const reg = regSnap.val();
      if ((reg.meterId || '').trim() !== meterId.trim()) {
        toast.error('Meter ID does not match admin record');
        return;
      }

      // Create auth user
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(cred.user);

      // Persist customer profile
      const uid = cred.user.uid;
      await set(ref(db, `customers/${uid}`), {
        email: email,
        name: reg.name || '',
        location: reg.location || '',
        meterId: reg.meterId,
        pairId: reg.pairId || '',
        role: 'customer',
        createdAt: Date.now(),
      });
      // Link uid to quick lookup
      await update(ref(db, `customersByEmail/${emailKey(email)}`), { uid });

      toast.success('Account created. Please verify your email.');
      navigate('/login');
    } catch (err) {
      toast.error(err?.message || 'Signup failed');
    }
  };

  return (
    <div className="relative flex min-h-screen w-full">
      <div className="flex w-full items-center justify-center p-6 sm:p-8 lg:p-12">
        <div className="w-full max-w-md">
          <div className="w-full space-y-8 rounded-xl bg-white dark:bg-card-dark p-8 sm:p-10 shadow-lg transition-all duration-300">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Create Customer Account</h2>
              <p className="mt-2 text-sm text-slate-400">Use the email and meter ID your provider registered.</p>
            </div>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium mb-2" htmlFor="email">Email address</label>
                <input id="email" type="email" required className="block w-full rounded-md border-0 py-3 px-4 bg-background-light dark:bg-background-dark shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary transition duration-200" value={email} onChange={e=>setEmail(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" htmlFor="meter">Meter ID</label>
                <input id="meter" type="text" required className="block w-full rounded-md border-0 py-3 px-4 bg-background-light dark:bg-background-dark shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary transition duration-200" value={meterId} onChange={e=>setMeterId(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" htmlFor="password">Password</label>
                <input id="password" type="password" required className="block w-full rounded-md border-0 py-3 px-4 bg-background-light dark:bg-background-dark shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary transition duration-200" value={password} onChange={e=>setPassword(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" htmlFor="confirm">Confirm Password</label>
                <input id="confirm" type="password" required className="block w-full rounded-md border-0 py-3 px-4 bg-background-light dark:bg-background-dark shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary transition duration-200" value={confirm} onChange={e=>setConfirm(e.target.value)} />
              </div>
              <button type="submit" className="flex w-full justify-center rounded-lg bg-primary px-4 py-3 text-sm font-semibold leading-6 text-gray-900 shadow-sm hover:bg-primary-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all duration-300">Create account</button>
            </form>
            <div className="text-xs text-slate-400 text-center">
              <p>Already have an account? <Link to="/login" className="text-primary">Login</Link></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerSignup;
