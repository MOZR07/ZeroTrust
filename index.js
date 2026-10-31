const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const gateway = require('./gateway/server');
const nilai = require('./services/nilai/server');
const transkrip = require('./services/transkrip/server');

const PORT_GATEWAY = process.env.PORT_GATEWAY || 3000;
const PORT_NILAI = process.env.PORT_NILAI || 3001;
const PORT_TRANSKRIP = process.env.PORT_TRANSKRIP || 3002;

console.log('====================================================');
console.log('   SISTEM NILAI ZERO TRUST (NIST SP 800-207)');
console.log('   Keamanan Informasi - Universitas Siliwangi');
console.log('====================================================');

const sNilai = nilai.listen(PORT_NILAI, () => {
    console.log(`[RESOURCE 1] Service Nilai running on port ${PORT_NILAI}`);
});

const sTranskrip = transkrip.listen(PORT_TRANSKRIP, () => {
    console.log(`[RESOURCE 2] Service Transkrip running on port ${PORT_TRANSKRIP}`);
});

const sGateway = gateway.listen(PORT_GATEWAY, () => {
    console.log(`[PEP GATEWAY] API Gateway & Policy Engine running on port ${PORT_GATEWAY}`);
    console.log('====================================================');
    console.log(`Ready for requests via http://localhost:${PORT_GATEWAY}`);
    console.log('====================================================');
});

function gracefulShutdown() {
    console.log('\nShutting down all services...');
    sNilai.close();
    sTranskrip.close();
    sGateway.close();
    process.exit(0);
}

// Keep process alive indefinitely
setInterval(() => {}, 1000 * 60 * 60);

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
