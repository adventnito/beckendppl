const express = require('express');
const auth    = require('../middleware/auth');
const { randomUUID } = require('crypto');
const prisma  = require('../lib/prisma');
const { sendTelegram, formatSensorAlert } = require('../services/telegram');

const router = express.Router();

// Cooldown notifikasi — hindari spam (dalam ms)
const NOTIF_COOLDOWN = 5 * 60 * 1000; // 5 menit
let lastNotifTime = 0;

// GET /api/sensor
router.get('/', auth, async (req, res) => {
    try {
        const { from, to } = req.query;
        const where = {};

        if (from || to) {
            where.created_at = {};
            if (from) where.created_at.gte = new Date(from);
            if (to)   where.created_at.lte = new Date(to);
        }

        const data = await prisma.sensor_readings.findMany({
            where,
            orderBy: { created_at: 'desc' },
            take: 100,
        });
        res.json(data);
    } catch (err) {
        console.error('[Sensor] Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/sensor/latest
router.get('/latest', auth, async (req, res) => {
    try {
        const data = await prisma.sensor_readings.findFirst({
            orderBy: { created_at: 'desc' },
        });
        res.json(data);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/sensor — terima data dari ESP32
router.post('/', async (req, res) => {
    try {
        const { temperature, humidity, read_at } = req.body;

        if (!temperature || !humidity) {
            return res.status(400).json({ message: 'temperature dan humidity wajib diisi' });
        }

        // Ambil threshold terbaru
        const threshold = await prisma.thresholds.findFirst({
            where: { id: '3cd257fd-6f8a-4460-a407-ef85338d3af7' }
        });

        let status  = 'safe';
        let kondisi = 'aman';

        if (threshold) {
            const tempMelebihi  = Number(temperature) > threshold.temp_max;
            const tempKurang    = Number(temperature) < threshold.temp_min;
            const humidMelebihi = Number(humidity) > threshold.humidity_max;
            const humidKurang   = Number(humidity) < threshold.humidity_min;

            const selisihSuhu = Math.max(
                Number(temperature) - threshold.temp_max,
                threshold.temp_min - Number(temperature),
                0
            );

            if (tempMelebihi || tempKurang || humidMelebihi || humidKurang) {
                if (selisihSuhu >= 3) {
                    status  = 'warning';
                    kondisi = 'kritis';
                } else {
                    status  = 'warning';
                    kondisi = 'waspada';
                }
            }
        }

        // Simpan data sensor
        const now = new Date();
        const reading = await prisma.sensor_readings.create({
            data: {
                id:          randomUUID(),
                temperature: Number(temperature),
                humidity:    Number(humidity),
                status,
                synced:      true,
                read_at:     read_at ? new Date(read_at) : now,
                created_at:  now,
                updated_at:  now,
            }
        });

        // ── AUTO CONTROL KIPAS ────────────────────────────────
        const latestActuator = await prisma.actuator_logs.findFirst({
            orderBy: { triggered_at: 'desc' }
        });
        const kipasSekarang = latestActuator?.action || 'off';

        if (kondisi === 'kritis' && kipasSekarang !== 'on') {
            await prisma.actuator_logs.create({
                data: {
                    id:            randomUUID(),
                    actuator_name: 'fan_1',
                    action:        'on',
                    trigger_type:  'auto',
                    triggered_by:  null,
                    triggered_at:  now,
                }
            });
            console.log('[AUTO] Kipas dinyalakan otomatis — kondisi KRITIS');

        } else if (kondisi === 'aman' && kipasSekarang !== 'off') {
            await prisma.actuator_logs.create({
                data: {
                    id:            randomUUID(),
                    actuator_name: 'fan_1',
                    action:        'off',
                    trigger_type:  'auto',
                    triggered_by:  null,
                    triggered_at:  now,
                }
            });
            console.log('[AUTO] Kipas dimatikan otomatis — kondisi AMAN');
        }

        // ── NOTIFIKASI TELEGRAM ───────────────────────────────
        if (kondisi !== 'aman') {
            const now_ms = Date.now();
            const cooldownSelesai = (now_ms - lastNotifTime) > NOTIF_COOLDOWN;

            if (cooldownSelesai) {
                lastNotifTime = now_ms;

                const pesan = formatSensorAlert({
                    temperature: Number(temperature),
                    humidity:    Number(humidity),
                    kondisi,
                    threshold,
                });

                // Kirim async, tidak blokir response ke ESP32
                sendTelegram(pesan).catch(err => {
                    console.error('[Telegram] Gagal kirim notifikasi:', err.message);
                });

                console.log(`[Telegram] Notifikasi dikirim — kondisi: ${kondisi}`);
            } else {
                const sisaCooldown = Math.ceil((NOTIF_COOLDOWN - (now_ms - lastNotifTime)) / 1000);
                console.log(`[Telegram] Cooldown aktif — sisa ${sisaCooldown} detik`);
            }
        }

        console.log(`[SENSOR] Suhu: ${temperature}°C | Kelembaban: ${humidity}% | Status: ${kondisi}`);

        res.json({
            message: 'Data sensor tersimpan',
            reading,
            kondisi,
        });

    } catch (err) {
        console.error('[Sensor] POST error:', err);
        res.status(500).json({ message: err.message || 'Server error' });
    }
});

module.exports = router;