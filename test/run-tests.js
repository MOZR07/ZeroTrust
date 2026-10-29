const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const seedDatabase = require('../database/seed');
const gateway = require('../gateway/server');
const nilai = require('../services/nilai/server');
const transkrip = require('../services/transkrip/server');

const BASE_URL = `http://localhost:${process.env.PORT_GATEWAY || 3000}`;
const NILAI_URL = `http://localhost:${process.env.PORT_NILAI || 3001}`;
const TRANSKRIP_URL = `http://localhost:${process.env.PORT_TRANSKRIP || 3002}`;

let servers = [];

async function startServers() {
    return new Promise((resolve) => {
        const s1 = nilai.listen(process.env.PORT_NILAI || 3001);
        const s2 = transkrip.listen(process.env.PORT_TRANSKRIP || 3002);
        const s3 = gateway.listen(process.env.PORT_GATEWAY || 3000, () => {
            servers = [s1, s2, s3];
            resolve();
        });
    });
}

function stopServers() {
    for (const s of servers) {
        s.close();
    }
}

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
    if (condition) {
        console.log(`  \x1b[32m✔ PASS\x1b[0m : ${testName}`);
        passedTests++;
    } else {
        console.error(`  \x1b[31m✘ FAIL\x1b[0m : ${testName} ${details ? '(' + details + ')' : ''}`);
        failedTests++;
    }
}

async function runAllTests() {
    console.log('\n======================================================');
    console.log('   RUNNING ZERO TRUST SECURITY AUTOMATED TEST SUITE');
    console.log('======================================================\n');

    // Reset and seed database
    seedDatabase();

    await startServers();

    try {
        // ----------------------------------------------------
        // TEST SUITE 1: Direct Service Access (Zero Trust Boundary)
        // ----------------------------------------------------
        console.log('\n[TEST GROUP 1] Direct Service Access & Gateway Secret Enforcement');

        // 1.1 Direct access to Service Nilai without Gateway Secret
        const directNilaiRes = await fetch(`${NILAI_URL}/nilai`);
        assert(directNilaiRes.status === 403, 'Direct access to Service Nilai without X-Gateway-Secret returns 403 Forbidden');

        // 1.2 Direct access to Service Transkrip without Gateway Secret
        const directTranskripRes = await fetch(`${TRANSKRIP_URL}/transkrip/227006001`);
        assert(directTranskripRes.status === 403, 'Direct access to Service Transkrip without X-Gateway-Secret returns 403 Forbidden');

        // 1.3 Direct access with Gateway Secret but NO Bearer token (Token re-verification in Service)
        const fakeSecretRes = await fetch(`${NILAI_URL}/nilai`, {
            headers: { 'X-Gateway-Secret': process.env.GATEWAY_SECRET }
        });
        assert(fakeSecretRes.status === 401, 'Direct access with X-Gateway-Secret but missing Bearer token returns 401 Unauthorized');

        // ----------------------------------------------------
        // TEST SUITE 2: Authentication & Context Verification (Device ID)
        // ----------------------------------------------------
        console.log('\n[TEST GROUP 2] Authentication & Device Verification');

        // 2.1 Login invalid credentials
        const badLoginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Device-ID': 'DEV-MHS-ANDI' },
            body: JSON.stringify({ username: 'mhs_andi', password: 'wrongpassword' })
        });
        assert(badLoginRes.status === 401, 'Login with wrong password returns 401 Unauthorized');

        // 2.2 Login without X-Device-ID header
        const noDeviceLoginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'mhs_andi', password: 'password123' })
        });
        assert(noDeviceLoginRes.status === 403, 'Login without X-Device-ID header returns 403 Forbidden');

        // 2.3 Login with unregistered device ID
        const fakeDeviceLoginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Device-ID': 'UNREGISTERED-DEVICE-999' },
            body: JSON.stringify({ username: 'mhs_andi', password: 'password123' })
        });
        assert(fakeDeviceLoginRes.status === 403, 'Login with unregistered device ID returns 403 Forbidden');

        // 2.4 Login with valid credentials & registered device (Andi)
        const andiLoginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Device-ID': 'DEV-MHS-ANDI' },
            body: JSON.stringify({ username: 'mhs_andi', password: 'password123' })
        });
        const andiData = await andiLoginRes.json();
        assert(andiLoginRes.status === 200 && andiData.access_token, 'Login with valid credentials and registered device succeeds (200 OK)');
        const andiToken = andiData.access_token;
        const andiRefreshToken = andiData.refresh_token;

        // Login Dosen Budi
        const budiLoginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Device-ID': 'DEV-DOSEN-BUDI' },
            body: JSON.stringify({ username: 'dosen_budi', password: 'password123' })
        });
        const budiData = await budiLoginRes.json();
        const budiToken = budiData.access_token;

        // Login Dosen Siti
        const sitiLoginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Device-ID': 'DEV-DOSEN-SITI' },
            body: JSON.stringify({ username: 'dosen_siti', password: 'password123' })
        });
        const sitiData = await sitiLoginRes.json();
        const sitiToken = sitiData.access_token;

        // Login Admin
        const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Device-ID': 'DEV-ADMIN-01' },
            body: JSON.stringify({ username: 'admin1', password: 'password123' })
        });
        const adminData = await adminLoginRes.json();
        const adminToken = adminData.access_token;

        // ----------------------------------------------------
        // TEST SUITE 3: Refresh Token & Token Revocation (Logout)
        // ----------------------------------------------------
        console.log('\n[TEST GROUP 3] Refresh Token & Revocation (Logout)');

        // 3.1 Refresh token to get new access token
        const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: andiRefreshToken })
        });
        const refreshData = await refreshRes.json();
        assert(refreshRes.status === 200 && refreshData.access_token, 'POST /auth/refresh returns new access token (200 OK)');

        // 3.2 Logout revoking refresh token
        const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: andiRefreshToken })
        });
        assert(logoutRes.status === 200, 'POST /auth/logout revokes refresh token (200 OK)');

        // 3.3 Refreshing using revoked refresh token fails
        const revokedRefreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: andiRefreshToken })
        });
        assert(revokedRefreshRes.status === 401, 'Using revoked refresh token returns 401 Unauthorized');

        // ----------------------------------------------------
        // TEST SUITE 4: Role-Based & Attribute-Based Access Control (ABAC)
        // ----------------------------------------------------
        console.log('\n[TEST GROUP 4] Access Control (ABAC & RBAC)');

        // 4.1 Mahasiswa accesses GET /nilai (only sees own grades)
        const mhsNilaiRes = await fetch(`${BASE_URL}/nilai`, {
            headers: {
                'Authorization': `Bearer ${andiToken}`,
                'X-Device-ID': 'DEV-MHS-ANDI'
            }
        });
        const mhsNilaiData = await mhsNilaiRes.json();
        const onlyAndi = mhsNilaiData.data && mhsNilaiData.data.every(r => r.nim === '227006001');
        assert(mhsNilaiRes.status === 200 && onlyAndi, 'Mahasiswa sees ONLY their own grades on GET /nilai');

        // 4.2 Mahasiswa tries to update a grade (PUT /nilai/1) -> Forbidden
        const mhsPutRes = await fetch(`${BASE_URL}/nilai/1`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${andiToken}`,
                'X-Device-ID': 'DEV-MHS-ANDI'
            },
            body: JSON.stringify({ nilai_angka: 95 })
        });
        assert(mhsPutRes.status === 403, 'Mahasiswa attempting to edit grade returns 403 Forbidden');

        // 4.3 Dosen Siti tries to edit grade in Dosen Budi\'s class (ID 1) -> Forbidden
        const sitiPutRes = await fetch(`${BASE_URL}/nilai/1`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sitiToken}`,
                'X-Device-ID': 'DEV-DOSEN-SITI',
                'X-Mock-Hour': '10'
            },
            body: JSON.stringify({ nilai_angka: 95 })
        });
        assert(sitiPutRes.status === 403, 'Dosen editing a class taught by another Dosen returns 403 Forbidden');

        // ----------------------------------------------------
        // TEST SUITE 5: Access Hours Verification (07:00 - 21:00)
        // ----------------------------------------------------
        console.log('\n[TEST GROUP 5] Context Verification: Access Hours (07:00 - 21:00)');

        // 5.1 Dosen Budi tries to edit grade outside access hours (simulated hour 23)
        const outsideHoursRes = await fetch(`${BASE_URL}/nilai/1`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${budiToken}`,
                'X-Device-ID': 'DEV-DOSEN-BUDI',
                'X-Mock-Hour': '23' // Outside access hours
            },
            body: JSON.stringify({ nilai_angka: 92 })
        });
        assert(outsideHoursRes.status === 403, 'Grade update outside permitted hours (23:00) returns 403 Forbidden');

        // 5.2 Dosen Budi updates grade within access hours (simulated hour 10)
        const insideHoursRes = await fetch(`${BASE_URL}/nilai/1`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${budiToken}`,
                'X-Device-ID': 'DEV-DOSEN-BUDI',
                'X-Mock-Hour': '10' // Inside access hours
            },
            body: JSON.stringify({ nilai_angka: 92 })
        });
        const insideHoursData = await insideHoursRes.json();
        assert(insideHoursRes.status === 200 && insideHoursData.data.nilai_angka === 92, 'Grade update within permitted hours (10:00) succeeds (200 OK)');

        // ----------------------------------------------------
        // TEST SUITE 6: Finalization & Service-to-Service Sync
        // ----------------------------------------------------
        console.log('\n[TEST GROUP 6] Class Finalization & Inter-Service Sync');

        // 6.1 Dosen Budi finalizes Kelas 1
        const finalizeRes = await fetch(`${BASE_URL}/kelas/1/finalisasi`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${budiToken}`,
                'X-Device-ID': 'DEV-DOSEN-BUDI',
                'X-Mock-Hour': '14'
            }
        });
        const finalizeData = await finalizeRes.json();
        assert(finalizeRes.status === 200 && finalizeData.items_synced > 0, 'Class finalization succeeds and triggers inter-service sync (200 OK)');

        // 6.2 Attempting to modify grade after finalization -> Forbidden
        const postFinalPutRes = await fetch(`${BASE_URL}/nilai/1`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${budiToken}`,
                'X-Device-ID': 'DEV-DOSEN-BUDI',
                'X-Mock-Hour': '14'
            },
            body: JSON.stringify({ nilai_angka: 99 })
        });
        assert(postFinalPutRes.status === 403, 'Modifying finalized grade returns 403 Forbidden');

        // ----------------------------------------------------
        // TEST SUITE 7: Transcript Access Policies
        // ----------------------------------------------------
        console.log('\n[TEST GROUP 7] Transcript Access Policies');

        // 7.1 Mahasiswa Andi views his own transcript (NIM 227006001)
        const andiTranskripRes = await fetch(`${BASE_URL}/transkrip/227006001`, {
            headers: {
                'Authorization': `Bearer ${andiToken}`,
                'X-Device-ID': 'DEV-MHS-ANDI'
            }
        });
        const andiTranskripData = await andiTranskripRes.json();
        assert(andiTranskripRes.status === 200 && andiTranskripData.nim === '227006001', 'Mahasiswa viewing own transcript succeeds (200 OK)');

        // 7.2 Mahasiswa Andi attempts to view Rani\'s transcript (NIM 227006002) -> Forbidden
        const raniForbiddenRes = await fetch(`${BASE_URL}/transkrip/227006002`, {
            headers: {
                'Authorization': `Bearer ${andiToken}`,
                'X-Device-ID': 'DEV-MHS-ANDI'
            }
        });
        assert(raniForbiddenRes.status === 403, 'Mahasiswa viewing another student transcript returns 403 Forbidden');

        // 7.3 Dosen attempts to view student transcript -> Forbidden
        const dosenTranskripRes = await fetch(`${BASE_URL}/transkrip/227006001`, {
            headers: {
                'Authorization': `Bearer ${budiToken}`,
                'X-Device-ID': 'DEV-DOSEN-BUDI'
            }
        });
        assert(dosenTranskripRes.status === 403, 'Dosen viewing student transcript returns 403 Forbidden');

        // 7.4 Admin views any student transcript -> Allowed
        const adminTranskripRes = await fetch(`${BASE_URL}/transkrip/227006001`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'X-Device-ID': 'DEV-ADMIN-01'
            }
        });
        assert(adminTranskripRes.status === 200, 'Admin viewing student transcript succeeds (200 OK)');

        // ----------------------------------------------------
        // TEST SUITE 8: Inter-Service Endpoint Protection (/transkrip/sinkron)
        // ----------------------------------------------------
        console.log('\n[TEST GROUP 8] Inter-Service Endpoint Protection (/transkrip/sinkron)');

        // 8.1 User token (Admin/Dosen/Mahasiswa) attempting to call /transkrip/sinkron -> Denied
        const userSyncRes = await fetch(`${BASE_URL}/transkrip/sinkron`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`,
                'X-Device-ID': 'DEV-ADMIN-01'
            },
            body: JSON.stringify({ kelas_id: 1, items: [] })
        });
        assert(userSyncRes.status === 403, 'User token attempting to call /transkrip/sinkron returns 403 Forbidden (Service token only)');

        // ----------------------------------------------------
        // TEST SUITE 9: Audit Trail
        // ----------------------------------------------------
        console.log('\n[TEST GROUP 9] Audit Trail Inspection');

        const auditRes = await fetch(`${BASE_URL}/audit-logs`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'X-Device-ID': 'DEV-ADMIN-01'
            }
        });
        const auditData = await auditRes.json();
        const hasAllowAndDeny = auditData.logs &&
            auditData.logs.some(l => l.decision === 'ALLOW') &&
            auditData.logs.some(l => l.decision === 'DENY');
        assert(auditRes.status === 200 && hasAllowAndDeny, 'Audit trail contains logged ALLOW and DENY decisions with full context');

    } catch (err) {
        console.error('\n[TEST EXECUTION ERROR]', err);
    } finally {
        stopServers();
        console.log('\n======================================================');
        console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
        console.log('======================================================\n');
        process.exit(failedTests > 0 ? 1 : 0);
    }
}

if (require.main === module) {
    runAllTests();
}
