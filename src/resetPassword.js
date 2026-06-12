require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('./lib/prisma');

async function reset() {
    const hash = await bcrypt.hash('password123', 10);
    
    await prisma.users.update({
        where: { email: 'admin@bumijaya.com' },
        data:  { password: hash }
    });
    
    await prisma.users.update({
        where: { email: 'esp32@gudangsafe.com' },
        data:  { password: await bcrypt.hash('password_esp32', 10) }
    });

    console.log('Password berhasil direset!');
    process.exit(0);
}

reset();