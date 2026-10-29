const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const GATEWAY_URL = `http://localhost:${process.env.PORT_GATEWAY || 3000}`;
const CLIENT_ID = process.env.SERVICE_NILAI_CLIENT_ID || 'service-nilai';
const CLIENT_SECRET = process.env.SERVICE_NILAI_CLIENT_SECRET || 'secret-nilai-12345';

let cachedToken = null;
let tokenExpiresAt = 0;

/**
 * Obtains or reuses a valid Service Token from the Gateway
 */
async function getServiceToken() {
    const now = Date.now();
    // Reuse token if valid for more than 30 seconds
    if (cachedToken && tokenExpiresAt - now > 30000) {
        return cachedToken;
    }

    console.log('[SERVICE NILAI] Requesting new service token from Gateway via POST /auth/service...');
    const response = await fetch(`${GATEWAY_URL}/auth/service`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to obtain service token: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    cachedToken = data.access_token;
    tokenExpiresAt = Date.now() + (data.expires_in * 1000);
    console.log('[SERVICE NILAI] Service token acquired successfully.');
    return cachedToken;
}

/**
 * Calls Service Transkrip via Gateway (PEP) to synchronize finalized grades
 */
async function syncTranskripViaGateway(kelasId, items) {
    const token = await getServiceToken();

    console.log(`[SERVICE NILAI] Calling Gateway: POST /transkrip/sinkron for Kelas ID ${kelasId}...`);
    const response = await fetch(`${GATEWAY_URL}/transkrip/sinkron`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            kelas_id: kelasId,
            items: items
        })
    });

    const responseData = await response.json();
    if (!response.ok) {
        throw new Error(`Gateway returned error during transkrip sync: ${response.status} ${JSON.stringify(responseData)}`);
    }

    return responseData;
}

module.exports = {
    getServiceToken,
    syncTranskripViaGateway
};
