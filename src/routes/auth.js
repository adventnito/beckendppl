const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email dan password wajib diisi' });
        }

        const user = await prisma.users.findUnique({ where: { email } });

        if (!user) {
            return res.status(401).json({ message: 'Email atau password salah' });
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.status(401).json({ message: 'Email atau password salah' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.json({
            message: 'Login berhasil',
            token,
            user: {
                id:    user.id,
                name:  user.name,
                email: user.email,
                role:  user.role,
            }
        });

    } catch (err) {
        console.error('[Auth] Login error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth'), async (req, res) => {
    try {
        const user = await prisma.users.findUnique({
            where: { id: req.user.id },
            select: { id: true, name: true, email: true, role: true }
        });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
}); 


// PUT /api/auth/profile
router.put('/profile', require('../middleware/auth'), async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const data = { name, email };
        if (password) {
            data.password = await bcrypt.hash(password, 10);
        }
        const user = await prisma.users.update({
            where:  { id: req.user.id },
            data,
            select: { id: true, name: true, email: true, role: true }
        });
        res.json({ message: 'Profile berhasil diupdate', user });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;