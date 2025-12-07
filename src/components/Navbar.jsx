import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth, db } from '../utils/firebaseConfig';
import { ref, get } from 'firebase/database';

const Navbar = ({ user, setUser, userRole }) => {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(user?.name || 'User');

  // Resolve customer name from DB for personalized greeting
  useEffect(() => {
    const load = async () => {
      if (!user?.email || userRole !== 'customer') {
        setDisplayName(user?.name || 'User');
        return;
      }
      try {
        const emailKey = user.email.replaceAll('.', ',');
        const snap = await get(ref(db, `customersByEmail/${emailKey}`));
        if (snap.exists()) {
          const fullName = snap.val().name || 'User';
          const first = (fullName || '').split(' ')[0] || fullName;
          setDisplayName(first);
        } else {
          setDisplayName('User');
        }
      } catch {
        setDisplayName('User');
      }
    };
    load();
  }, [user?.email, userRole]);

  const handleLogout = () => {
    // Sign out from Firebase (if signed in) and clear local state
    signOut(auth).finally(() => {
      if (setUser) setUser(null);
      localStorage.removeItem('energyMeterUser');
      localStorage.removeItem('userRole');
      navigate('/login');
    });
  };

  return (
    <header className="flex items-center justify-between whitespace-nowrap border-b border-gray-200/10 dark:border-solid dark:border-b-[#283939] px-10 py-3 bg-background-light dark:bg-[#111818]">
      <div className="flex items-center gap-4 text-gray-900 dark:text-white">
        <h2 className="text-lg font-bold leading-tight tracking-[-0.015em]">
          Welcome back, {displayName}
        </h2>
      </div>
      
      <div className="flex flex-1 justify-end gap-4 items-center">
        <button 
          className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 bg-white dark:bg-[#283939] text-gray-900 dark:text-white gap-2 text-sm font-bold leading-normal tracking-[0.015em] min-w-0 px-2.5 border border-gray-200/10 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-[#3b5454] transition-colors"
          onClick={() => {
            document.documentElement.classList.toggle('dark');
          }}
        >
          <span className="material-symbols-outlined">dark_mode</span>
        </button>
        <button 
          onClick={handleLogout}
          className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 px-4 bg-primary text-[#111818] text-sm font-bold leading-normal tracking-[0.015em] hover:bg-primary-600 transition-colors"
        >
          <span className="truncate">Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;

