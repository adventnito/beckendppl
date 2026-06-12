const express  = require('express');
const auth     = require('../middleware/auth');
const { randomUUID } = require('crypto');
const prisma   = require('../lib/prisma');

const THRESHOLD_ID = '3cd257fd-6f8a-4460-a407-ef85338d3af7';

const router = express.Router();

// GET /api/threshold
router.get('/', auth, async (req, res) => {
    try {
        const threshold = await prisma.thresholds.findFirst({
            where: { id: THRESHOLD_ID }
        });
        console.log('[Threshold] Data:', threshold);
        res.json(threshold);
    } catch (err) {
        console.error('[Threshold] Get error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/threshold
router.post('/', auth, async (req, res) => {
    try {
        const { temp_min, temp_max, humidity_min, humidity_max } = req.body;

        if (!temp_min || !temp_max || !humidity_min || !humidity_max) {
            return res.status(400).json({ message: 'Semua field wajib diisi' });
        }

        const threshold = await prisma.thresholds.update({
            where: { id: THRESHOLD_ID },
            data: {
                temp_min:     Number(temp_min),
                temp_max:     Number(temp_max),
                humidity_min: Number(humidity_min),
                humidity_max: Number(humidity_max),
                updated_by:   req.user.id,
            }
        });

        res.json({ message: 'Threshold berhasil disimpan', threshold });

    } catch (err) {
        console.error('[Threshold] Save error:', err);
        res.status(500).json({ message: err.message || 'Server error' });
    }
});

module.exports = router;