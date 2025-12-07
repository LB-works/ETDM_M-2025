import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../utils/firebaseConfig';
import { ref, get } from 'firebase/database';
import { db } from '../utils/firebaseConfig';
import { signOut } from 'firebase/auth';

const Login = ({ setUser, setUserRole }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Simple authentication logic
    // In production, use Firebase Authentication
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }

    signInWithEmailAndPassword(auth, email, password)
      .then(async (credential) => {
        const loggedInUser = credential.user;
        const isProvider = email.includes('admin') || email.includes('provider');

        if (isProvider) {
          const userData = {
            email: loggedInUser.email,
            name: 'Admin',
            role: 'provider',
            uid: loggedInUser.uid,
            emailVerified: loggedInUser.emailVerified,
          };
          setUser(userData);
          setUserRole('provider');
          localStorage.setItem('userRole', 'provider');
          toast.success('Welcome back, Admin!');
          navigate('/fleet-overview');
          return;
        }

        const emailKey = email.replaceAll('.', ',');
        try {
          const snap = await get(ref(db, `customersByEmail/${emailKey}`));
          if (snap.exists()) {
            const userData = {
              email: loggedInUser.email,
              name: 'Customer',
              role: 'customer',
              uid: loggedInUser.uid,
              emailVerified: loggedInUser.emailVerified,
            };
            setUser(userData);
            setUserRole('customer');
            localStorage.setItem('userRole', 'customer');
            toast.success('Welcome back!');
            navigate('/dashboard');
          } else {
            await signOut(auth);
            toast.error('Wrong credentials');
          }
        } catch (e) {
          await signOut(auth);
          toast.error('Wrong credentials');
        }
      })
      .catch((err) => {
        const msg = err?.message || 'Login failed';
        toast.error(msg);
      });
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Enter your email above first');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset email sent');
    } catch (err) {
      toast.error(err?.message || 'Failed to send reset email');
    }
  };

  return (
    <div className="relative flex min-h-screen w-full">
      {/* Left Side - Branding */}
      <div className="relative hidden lg:flex lg:w-1/2 items-center justify-center p-12 bg-gray-900">
        <div 
          className="absolute inset-0 z-0 opacity-40"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1621905251189-08b45d6a269e?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1469)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        <div className="z-10 flex flex-col items-start text-white max-w-md text-left">
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20 text-primary">
              <span className="material-symbols-outlined text-4xl">bolt</span>
            </div>
          </div>
          <h1 className="text-5xl font-black leading-tight tracking-tighter">Smart Energy Meter Portal</h1>
          <p className="mt-4 text-lg font-normal text-slate-300">
            Monitor your energy usage with precision and detect anomalies in real-time.
          </p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 sm:p-8 lg:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center lg:hidden">
            <h1 className="text-3xl font-bold">Smart Energy Meter Portal</h1>
            <p className="text-slate-400">Welcome back!</p>
          </div>
          
          <div className="w-full space-y-8 rounded-xl bg-white dark:bg-card-dark p-8 sm:p-10 shadow-lg transition-all duration-300">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Login</h2>
              <p className="mt-2 text-sm text-slate-400">
                Enter your credentials to access your dashboard.
              </p>
            </div>
            
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium mb-2" htmlFor="email">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="block w-full rounded-md border-0 py-3 px-4 bg-background-light dark:bg-background-dark shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary transition duration-200"
                  placeholder="your.email@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium" htmlFor="password">
                    Password
                  </label>
                  <a href="#" onClick={handleForgotPassword} className="text-sm font-semibold text-primary hover:text-primary-600 transition-colors">
                    Forgot password?
                  </a>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="block w-full rounded-md border-0 py-3 px-4 bg-background-light dark:bg-background-dark shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary transition duration-200"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              
              <div>
                <button
                  type="submit"
                  className="flex w-full justify-center rounded-lg bg-primary px-4 py-3 text-sm font-semibold leading-6 text-gray-900 shadow-sm hover:bg-primary-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all duration-300"
                >
                  Sign in
                </button>
              </div>
            </form>
            
            <div className="text-xs text-slate-400 text-center space-y-1">
              <p>Demo: Use any email (admin@provider.com for provider role)</p>
              <p>
                New customer? <a href="/signup" className="text-primary">Create customer account</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

