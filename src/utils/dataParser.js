/**
 * Parse Firebase timestamp to Date object
 */
export const parseTimestamp = (timestamp) => {
  if (!timestamp) return new Date();
  // Firebase timestamps are in seconds, convert to milliseconds
  return new Date(timestamp * 1000);
};

/**
 * Format number with units
 */
export const formatPower = (value) => {
  if (!value || isNaN(value)) return '0.0 W';
  return `${value.toFixed(1)} W`;
};

export const formatVoltage = (value) => {
  if (!value || isNaN(value)) return '0.0 V';
  return `${value.toFixed(1)} V`;
};

export const formatCurrent = (value) => {
  if (!value || isNaN(value)) return '0.000 A';
  return `${value.toFixed(3)} A`;
};

export const formatEnergy = (value) => {
  if (!value || isNaN(value)) return '0.000 kWh';
  return `${value.toFixed(3)} kWh`;
};

export const formatFrequency = (value) => {
  if (!value || isNaN(value)) return '0.0 Hz';
  return `${value.toFixed(1)} Hz`;
};

export const formatPowerFactor = (value) => {
  if (!value || isNaN(value)) return '0.00';
  return value.toFixed(2);
};

/**
 * Calculate cost estimate 
 */
export const calculateCost = (energyKwh) => {
  const rate = 51.79;
  if (!energyKwh || isNaN(energyKwh)) return 0;
  return (energyKwh * rate).toFixed(2);
};


/**
 * Get all meter pairs from Firebase data
 */
export const extractMeterPairs = (snapshot) => {
  const pairs = [];
  if (!snapshot || !snapshot.val()) return pairs;
  
  const meters = snapshot.val();
  Object.keys(meters).forEach(pairId => {
    if (meters[pairId]) {
      pairs.push({
        pairId,
        client: meters[pairId].client?.live_data || null,
        pole: meters[pairId].pole?.live_data || null,
      });
    }
  });
  
  return pairs;
};

