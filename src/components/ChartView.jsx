import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Bar } from 'recharts';

export const EnergyChart = ({ data, period }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis 
          dataKey="time" 
          stroke="#9CA3AF"
          style={{ fontSize: '12px' }}
        />
        <YAxis 
          stroke="#9CA3AF"
          style={{ fontSize: '12px' }}
          label={{ value: 'Energy (kWh)', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#1a2e2e', 
            border: '1px solid #3b5454',
            borderRadius: '8px',
            color: '#fff'
          }}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="energy" 
          stroke="#13ecec" 
          strokeWidth={2}
          dot={false}
          name="Energy (kWh)"
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export const CurrentComparisonChart = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis 
          dataKey="time" 
          stroke="#9CA3AF"
          style={{ fontSize: '12px' }}
        />
        <YAxis 
          stroke="#9CA3AF"
          style={{ fontSize: '12px' }}
          label={{ value: 'Current (A)', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#1a2e2e', 
            border: '1px solid #3b5454',
            borderRadius: '8px',
            color: '#fff'
          }}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="clientCurrent" 
          stroke="#13ecec" 
          strokeWidth={2}
          dot={false}
          name="Client Current"
        />
        <Line 
          type="monotone" 
          dataKey="poleCurrent" 
          stroke="#f59e0b" 
          strokeWidth={2}
          dot={false}
          name="Pole Current"
        />
        <Bar 
          dataKey="theftDetected" 
          fill="#ef4444" 
          name="Bypass Alert"
          opacity={0.6}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

