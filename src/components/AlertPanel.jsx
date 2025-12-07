import { useEffect } from 'react';
import toast from 'react-hot-toast';

const AlertPanel = ({ theftDetected, pairId, clientCurrent, poleCurrent }) => {
  useEffect(() => {
    if (theftDetected) {
      toast.error(
        `⚠️ Bypass detected on ${pairId || 'meter'}! Main: ${clientCurrent?.toFixed(3) || 0}A, Pole: ${poleCurrent?.toFixed(3) || 0}A`,
        {
          duration: 6000,
          style: {
            background: '#7f1d1d',
            color: '#fff',
            border: '2px solid #ef4444',
          },
        }
      );
    }
  }, [theftDetected, pairId, clientCurrent, poleCurrent]);

  if (!theftDetected) return null;

  return (
    <div className="rounded-xl border-2 border-red-500 p-6 bg-red-950/20 glow-danger">
      <div className="flex items-center gap-3 mb-4">
        <span className="material-symbols-outlined text-red-500 text-3xl">warning</span>
        <div>
          <h3 className="text-xl font-bold text-red-400">BYPASS DETECTED!</h3>
          <p className="text-red-300 text-sm">Unauthorized energy bypass detected on this meter</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mt-4">
        <div>
          <p className="text-red-300 text-sm">Client Current</p>
          <p className="text-red-100 text-lg font-bold">{clientCurrent?.toFixed(3) || 0} A</p>
        </div>
        <div>
          <p className="text-red-300 text-sm">Pole Current</p>
          <p className="text-red-100 text-lg font-bold">{poleCurrent?.toFixed(3) || 0} A</p>
        </div>
      </div>
    </div>
  );
};

export default AlertPanel;

