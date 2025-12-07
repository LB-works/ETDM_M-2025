const MeterCard = ({ title, value, unit, icon, className = '' }) => {
  return (
    <div className={`flex min-w-[158px] flex-1 flex-col gap-2 rounded-xl p-6 border border-gray-200/10 dark:border-[#3b5454] bg-white dark:bg-[#1a2e2e]/50 ${className}`}>
      {icon && (
        <div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-primary text-2xl">{icon}</span>
          <p className="text-gray-700 dark:text-white text-base font-medium leading-normal">
            {title}
          </p>
        </div>
      )}
      {!icon && (
        <p className="text-gray-700 dark:text-white text-base font-medium leading-normal">
          {title}
        </p>
      )}
      <p className="text-gray-900 dark:text-white tracking-light text-2xl font-bold leading-tight">
        {value} {unit && <span className="text-lg text-gray-500 dark:text-[#9db9b9]">{unit}</span>}
      </p>
    </div>
  );
};

export default MeterCard;

