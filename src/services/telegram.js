const https = require('https');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID   = process.env.TELEGRAM_CHAT_ID;

/**
 * Kirim pesan ke Telegram
 * @param {string} message - Pesan yang akan dikirim
 */
async function sendTelegram(message) {
    if (!BOT_TOKEN || !CHAT_ID) {
        console.warn('[Telegram] BOT_TOKEN atau CHAT_ID belum diset di .env');
        return;
    }

    const body = JSON.stringify({
        chat_id:    CHAT_ID,
        text:       message,
        parse_mode: 'HTML',
    });

    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'api.telegram.org',
            path:     `/bot${BOT_TOKEN}/sendMessage`,
            method:   'POST',
            headers: {
                'Content-Type':   'application/json',
                'Content-Length': Buffer.byteLength(body),
            },
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const result = JSON.parse(data);
                if (result.ok) {
                    console.log('[Telegram] Pesan terkirim ✅');
                    resolve(result);
                } else {
                    console.error('[Telegram] Gagal kirim:', result.description);
                    reject(new Error(result.description));
                }
            });
        });

        req.on('error', (err) => {
            console.error('[Telegram] Request error:', err.message);
            reject(err);
        });

        req.write(body);
        req.end();
    });
}

/**
 * Format pesan notifikasi sensor
 */
function formatSensorAlert({ temperature, humidity, kondisi, threshold }) {
    const waktu = new Date().toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        dateStyle: 'short',
        timeStyle: 'medium',
    });

    const emoji = kondisi === 'kritis' ? '🚨' : '⚠️';
    const statusText = kondisi === 'kritis' ? 'KRITIS' : 'WASPADA';

    return `${emoji} <b>ALERT GUDANG SAFE</b> ${emoji}

📍 <b>Toko Bumi Jaya, Jember</b>
🕐 <b>Waktu:</b> ${waktu}

📊 <b>Status: ${statusText}</b>

🌡️ <b>Suhu:</b> ${temperature}°C
   Batas normal: ${threshold?.temp_min ?? '-'}°C – ${threshold?.temp_max ?? '-'}°C

💧 <b>Kelembaban:</b> ${humidity}%
   Batas normal: ${threshold?.humidity_min ?? '-'}% – ${threshold?.humidity_max ?? '-'}%

${kondisi === 'kritis'
    ? '🔴 <b>Kipas dinyalakan otomatis!</b>\nSegera periksa kondisi gudang.'
    : '🟡 Kondisi perlu dipantau lebih lanjut.'}`;
}

module.exports = { sendTelegram, formatSensorAlert };