import { Link, useLocation } from 'react-router-dom';

const Sidebar = ({ userRole }) => {
  const location = useLocation();
  
  const customerLinks = [
    { path: '/dashboard', label: 'Dashboard', icon: 'dashboard', exact: true },
    { path: '/usage', label: 'Usage History', icon: 'history', exact: false },
    { path: '/alerts', label: 'Alerts & Notifications', icon: 'notifications', exact: false },
    { path: '/account', label: 'Account Settings', icon: 'manage_accounts', exact: false },
  ];

  const providerLinks = [
    { path: '/fleet-overview', label: 'Fleet Overview', icon: 'monitoring' },
    { path: '/customers', label: 'Customer Management', icon: 'group' },
    { path: '/analytics', label: 'Reports / Analytics', icon: 'bar_chart' },
    { path: '/reports', label: 'Bypass Detection Logs', icon: 'error' },
  ];

  const links = userRole === 'provider' ? providerLinks : customerLinks;

  return (
    <aside className="flex self-stretch min-h-screen w-64 flex-col justify-between border-r border-gray-200/10 dark:border-white/10 p-4 bg-background-light dark:bg-[#111818]">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 p-2">
          <div className="size-10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-4xl">bolt</span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-gray-900 dark:text-white text-base font-medium leading-normal">
              Energy Meter
            </h1>
            <p className="text-gray-500 dark:text-[#9db9b9] text-sm font-normal leading-normal">
                eMeter System
            </p>
          </div>
        </div>
        
        <nav className="flex flex-col gap-2 mt-4">
          {links.map((link) => {
            const isActive = link.exact 
              ? location.pathname === link.path 
              : location.pathname.startsWith(link.path);
            return (
              <Link
                key={link.path + link.label}
                to={link.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary/20 dark:bg-[#283939] text-primary dark:text-white'
                    : 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-600 dark:text-white'
                }`}
              >
                <span className={`material-symbols-outlined ${isActive ? 'fill' : ''} text-xl`}>
                  {link.icon}
                </span>
                <p className="text-sm font-medium leading-normal">{link.label}</p>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;

