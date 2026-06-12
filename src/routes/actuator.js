const express  = require('express');
const auth     = require('../middleware/auth');
const { randomUUID } = require('crypto');
const { publishMQTT } = require('../mqtt/client');
const prisma   = require('../lib/prisma');

const router = express.Router();

// GET /api/actuator/status
router.get('/status', auth, async (req, res) => {
    try {
        const latest = await prisma.actuator_logs.findFirst({
            orderBy: { triggered_at: 'desc' },
        });
        res.json({
            actuator: 'fan_1',
            status:   latest ? latest.action : 'off',
            last_log: latest,
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/actuator/control
router.post('/control', auth, async (req, res) => {
    try {
        const { action } = req.body;

        if (!['on', 'off'].includes(action)) {
            return res.status(400).json({ message: 'Action harus on atau off' });
        }

        const log = await prisma.actuator_logs.create({
            data: {
                id:            randomUUID(),
                actuator_name: 'fan_1',
                action,
                trigger_type:  'manual',
                triggered_by:  req.user.id,
                triggered_at:  new Date(),
            }
        });

        publishMQTT('gudang/actuator/control', { action, by: req.user.email });

        res.json({ message: 'Perintah berhasil dikirim', log });

    } catch (err) {
        console.error('[Actuator] Error:', err);
        res.status(500).json({ message: err.message || 'Server error' });
    }
});

// GET /api/actuator/logs
router.get('/logs', auth, async (req, res) => {
    try {
        const { from, to } = req.query;
        const where = {};

        if (from || to) {
            where.triggered_at = {};
            if (from) where.triggered_at.gte = new Date(from);
            if (to)   where.triggered_at.lte = new Date(to);
        }

        const logs = await prisma.actuator_logs.findMany({
            where,
            orderBy: { triggered_at: 'desc' },
            take: 100,
        });
        res.json(logs);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;