require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const userRoutes         = require('./routes/user');
const notificationRoutes = require('./routes/notification');
const authRoutes      = require('./routes/auth');
const sensorRoutes    = require('./routes/sensor');
const actuatorRoutes  = require('./routes/actuator');
const thresholdRoutes = require('./routes/threshold');
const { connectMQTT } = require('./mqtt/client');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST']
    }
});

// ── Middleware ───────────────────────────────────────────
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// ── Routes ───────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/sensor',    sensorRoutes);
app.use('/api/actuator',  actuatorRoutes);
app.use('/api/threshold', thresholdRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/notifications', notificationRoutes);

// ── Health check ─────────────────────────────────────────
app.get('/', (req, res) => {
    res.json({ message: 'GudangSafe API running', status: 'ok' });
});

// ── Socket.io ────────────────────────────────────────────
io.on('connection', (socket) => {
    console.log(`[Socket.io] Client terhubung: ${socket.id}`);
    socket.on('disconnect', () => {
        console.log(`[Socket.io] Client disconnect: ${socket.id}`);
    });
});

// Export io agar bisa dipakai di MQTT client
app.set('io', io);

// ── Start MQTT ───────────────────────────────────────────
connectMQTT(app);

// ── Start server ─────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`[Server] GudangSafe API berjalan di http://localhost:${PORT}`);
});