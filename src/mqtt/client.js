const mqtt = require('mqtt');

let client;

function connectMQTT(app) {
    client = mqtt.connect(process.env.MQTT_BROKER || 'mqtt://localhost', {
        port: parseInt(process.env.MQTT_PORT) || 1883,
    });

    client.on('connect', () => {
        console.log('[MQTT] Terhubung ke Mosquitto broker');
        client.subscribe('gudang/sensor', (err) => {
            if (!err) console.log('[MQTT] Subscribe: gudang/sensor');
        });
        client.subscribe('gudang/actuator/status', (err) => {
            if (!err) console.log('[MQTT] Subscribe: gudang/actuator/status');
        });
    });

    client.on('message', async (topic, message) => {
        const io = app.get('io');
        const payload = message.toString();

        console.log(`[MQTT] Topic: ${topic} | Pesan: ${payload}`);

        if (topic === 'gudang/sensor') {
            try {
                const data = JSON.parse(payload);
                io.emit('sensor:update', data);
            } catch (e) {
                console.log('[MQTT] JSON parse error:', e.message);
            }
        }

        if (topic === 'gudang/actuator/status') {
            try {
                const data = JSON.parse(payload);
                io.emit('actuator:update', data);
            } catch (e) {
                console.log('[MQTT] JSON parse error:', e.message);
            }
        }
    });

    client.on('error', (err) => {
        console.log('[MQTT] Error:', err.message);
    });

    client.on('disconnect', () => {
        console.log('[MQTT] Terputus dari broker');
    });
}

function publishMQTT(topic, payload) {
    if (client && client.connected) {
        client.publish(topic, JSON.stringify(payload));
        console.log(`[MQTT] Publish ke ${topic}:`, payload);
    } else {
        console.log('[MQTT] Client tidak terhubung');
    }
}

module.exports = { connectMQTT, publishMQTT };