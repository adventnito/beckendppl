const express  = require('express');
const bcrypt   = require('bcryptjs');
const auth     = require('../middleware/auth');
const { randomUUID } = require('crypto');
const prisma   = require('../lib/prisma');

const router = express.Router();

// GET /api/users
router.get('/', auth, async (req, res) => {
    try {
        const users = await prisma.users.findMany({
            select: { id: true, name: true, email: true, role: true }
        });
        res.json(users);
    } catch (err) {
        console.error('[User] Get error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/users
router.post('/', auth, async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Nama, email, dan password wajib diisi' });
        }

        const existing = await prisma.users.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ message: 'Email sudah terdaftar' });
        }

        const hash = await bcrypt.hash(password, 10);
        const user = await prisma.users.create({
            data: {
                id:       randomUUID(),
                name,
                email,
                password: hash,
                role:     role || 'employee',
            }
        });

        res.json({
            message: 'Karyawan berhasil ditambahkan',
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });

    } catch (err) {
        console.error('[User] Create error:', err);
        res.status(500).json({ message: err.message || 'Server error' });
    }
});

// PUT /api/users/:id
router.put('/:id', auth, async (req, res) => {
    try {
        const { name, email, role } = req.body;
        const user = await prisma.users.update({
            where: { id: req.params.id },
            data:  { name, email, role },
        });
        res.json({ message: 'Karyawan berhasil diupdate', user });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/users/:id
router.delete('/:id', auth, async (req, res) => {
    try {
        await prisma.users.delete({ where: { id: req.params.id } });
        res.json({ message: 'Karyawan berhasil dihapus' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;