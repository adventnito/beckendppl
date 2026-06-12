const express = require('express');
const auth    = require('../middleware/auth');
const prisma  = require('../lib/prisma');

const router = express.Router();

// GET /api/notifications
router.get('/', auth, async (req, res) => {
    try {
        const notifs = await prisma.notifications.findMany({
            where:   { user_id: req.user.id },
            orderBy: { created_at: 'desc' },
            take: 50,
        });
        res.json(notifs);
    } catch (err) {
        console.error('[Notification] Get error:', err);
        res.status(500).json({ message: err.message || 'Server error' });
    }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', auth, async (req, res) => {
    try {
        await prisma.notifications.update({
            where: { id: req.params.id },
            data:  { is_read: true }
        });
        res.json({ message: 'Notifikasi ditandai sudah dibaca' });
    } catch (err) {
        console.error('[Notification] Read error:', err);
        res.status(500).json({ message: err.message || 'Server error' });
    }
});

// DELETE /api/notifications/:id
router.delete('/:id', auth, async (req, res) => {
    try {
        await prisma.notifications.delete({ where: { id: req.params.id } });
        res.json({ message: 'Notifikasi dihapus' });
    } catch (err) {
        console.error('[Notification] Delete error:', err);
        res.status(500).json({ message: err.message || 'Server error' });
    }
});

module.exports = router;