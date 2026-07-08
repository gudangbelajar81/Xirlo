const axios = require('axios');

const FONNTE_TOKEN = 'JD1aAS13iJgVnjUk1g28';

async function sendWhatsAppMessage(target, message) {
  try {
    const data = new URLSearchParams();
    data.append('target', target);
    data.append('message', message);
    data.append('countryCode', '62'); // Default to Indonesia

    const response = await axios.post('https://api.fonnte.com/send', data, {
      headers: {
        'Authorization': FONNTE_TOKEN,
      },
    });

    console.log(`[Fonnte] Pesan berhasil dikirim ke ${target}. Response:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`[Fonnte Error] Gagal mengirim pesan ke ${target}:`, error.message);
    // Don't throw error to prevent crashing the main app flow
    return null;
  }
}

module.exports = {
  sendWhatsAppMessage,
};
