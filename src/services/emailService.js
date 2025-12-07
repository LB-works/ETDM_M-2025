import emailjs from '@emailjs/browser';

// EmailJS Configuration
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'YOUR_SERVICE_ID';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'YOUR_TEMPLATE_ID';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'YOUR_PUBLIC_KEY';

// Admin email configuration
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_NAME = import.meta.env.VITE_ADMIN_NAME || 'System Admin';

// Initialize EmailJS
emailjs.init(EMAILJS_PUBLIC_KEY);

// Throttle tracking (60-minute window per meter)
const emailThrottle = {};
const THROTTLE_DURATION = 60 * 60 * 1000; // 60 minutes in milliseconds

/**
 * Check if email can be sent (60-minute throttle)
 */
const canSendEmail = (meterId) => {
  const now = Date.now();
  const lastSent = emailThrottle[meterId];
  
  if (!lastSent || (now - lastSent) >= THROTTLE_DURATION) {
    emailThrottle[meterId] = now;
    return true;
  }
  
  return false;
};

/**
 * Calculate cost from energy
 */
const calculateCost = (energyKwh) => {
  const rate = 63.5;
  if (!energyKwh || isNaN(energyKwh)) return 0;
  return (energyKwh * rate).toFixed(2);
};

/**
 * Send bypass alert email
 */
export const sendBypassAlertEmail = async (bypassData) => {
  console.log('📧 sendBypassAlertEmail called with:', bypassData);
  
  const {
    pairId,
    meterId,
    clientCurrent,
    poleCurrent,
    clientEnergy,
    poleEnergy,
    timestamp,
    customerEmail,
    customerName,
  } = bypassData;

  // Check throttle
  if (!canSendEmail(pairId)) {
    const timeRemaining = getTimeUntilNextEmail(pairId);
    console.log(`⏱️ Email throttled for ${pairId}. Wait ${formatRemainingTime(timeRemaining)}`);
    return { success: false, reason: 'throttled' };
  }

  // Calculate bypass metrics
  const currentRatio = poleCurrent > 0 ? (poleCurrent / (clientCurrent > 0 ? clientCurrent : 0.001)).toFixed(2) : 'N/A';
  const bypassedEnergy = (poleEnergy || 0) - (clientEnergy || 0);
  const estimatedLoss = calculateCost(bypassedEnergy > 0 ? bypassedEnergy : 0);
  
  // Format timestamp
  const formattedTimestamp = new Date(timestamp * 1000).toLocaleString();
  
  // Dashboard URL
  const dashboardUrl = window.location.origin;

  // Email template parameters
  const templateParams = {
    recipient_name: ADMIN_NAME,
    to_email: ADMIN_EMAIL,
    meter_id: meterId || pairId,
    pair_id: pairId,
    timestamp: formattedTimestamp,
    client_current: clientCurrent.toFixed(3),
    pole_current: poleCurrent.toFixed(3),
    current_ratio: currentRatio,
    bypassed_energy: bypassedEnergy > 0 ? bypassedEnergy.toFixed(3) : '0.000',
    estimated_loss: estimatedLoss,
    dashboard_url: dashboardUrl,
  };

  try {
    // Send email to admin
    console.log('📤 Sending email to admin:', ADMIN_EMAIL);
    console.log('📋 Template params:', templateParams);
    console.log('🔑 Service ID:', EMAILJS_SERVICE_ID);
    console.log('🔑 Template ID:', EMAILJS_TEMPLATE_ID);
    
    const adminResponse = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams
    );
    
    console.log('✅ Admin email sent successfully:', adminResponse);

    // If customer email is provided, send to customer as well
    if (customerEmail && customerName) {
      const customerParams = {
        ...templateParams,
        recipient_name: customerName,
        to_email: customerEmail,
      };
      
      const customerResponse = await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        customerParams
      );
      
      console.log('Customer email sent successfully:', customerResponse);
    }

    return { success: true, response: adminResponse };
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    console.error('Error details:', {
      message: error.message,
      text: error.text,
      status: error.status
    });
    return { success: false, error: error.message };
  }
};

/**
 * Get time until next email can be sent for a meter
 */
export const getTimeUntilNextEmail = (meterId) => {
  const lastSent = emailThrottle[meterId];
  if (!lastSent) return 0;
  
  const now = Date.now();
  const timeSinceLastEmail = now - lastSent;
  const timeRemaining = THROTTLE_DURATION - timeSinceLastEmail;
  
  return timeRemaining > 0 ? timeRemaining : 0;
};

/**
 * Format remaining time in human-readable format
 */
export const formatRemainingTime = (milliseconds) => {
  const minutes = Math.ceil(milliseconds / 60000);
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
};
