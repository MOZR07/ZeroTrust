/**
 * Centralized API Service for Zero Trust Academic Portal
 * Handles authentication headers, token renewal, device ID, and policy errors.
 */

const Api = (() => {
  const BASE_URL = '';

  const getStoredUser = () => {
    try {
      return JSON.parse(localStorage.getItem('zt_user') || 'null');
    } catch {
      return null;
    }
  };

  const getAccessToken = () => localStorage.getItem('zt_access_token');
  const getRefreshToken = () => localStorage.getItem('zt_refresh_token');
  const getDeviceId = () => localStorage.getItem('zt_device_id') || '';
  const getMockHour = () => localStorage.getItem('zt_mock_hour') || '';

  const setAuthSession = (user, accessToken, refreshToken, deviceId) => {
    localStorage.setItem('zt_user', JSON.stringify(user));
    localStorage.setItem('zt_access_token', accessToken);
    if (refreshToken) localStorage.setItem('zt_refresh_token', refreshToken);
    if (deviceId) localStorage.setItem('zt_device_id', deviceId);
  };

  const clearAuthSession = () => {
    localStorage.removeItem('zt_user');
    localStorage.removeItem('zt_access_token');
    localStorage.removeItem('zt_refresh_token');
    localStorage.removeItem('zt_device_id');
    localStorage.removeItem('zt_mock_hour');
  };

  /**
   * Request wrapper with automatic header injection and refresh token support
   */
  async function request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const token = getAccessToken();
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const deviceId = getDeviceId();
    if (deviceId && !headers['X-Device-ID']) {
      headers['X-Device-ID'] = deviceId;
    }

    const mockHour = getMockHour();
    if (mockHour && !headers['X-Mock-Hour']) {
      headers['X-Mock-Hour'] = mockHour;
    }

    try {
      let res = await fetch(url, { ...options, headers });

      // Handle token expiration: attempt 1x refresh
      if (res.status === 401 && getRefreshToken() && !endpoint.startsWith('/auth/')) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          headers['Authorization'] = `Bearer ${getAccessToken()}`;
          res = await fetch(url, { ...options, headers });
        }
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const error = new Error(data.error || data.reason || `HTTP Error ${res.status}`);
        error.status = res.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      throw err;
    }
  }

  async function login(username, password, deviceId) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-ID': deviceId
      },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || data.reason || 'Login failed');
      err.status = res.status;
      err.data = data;
      throw err;
    }

    setAuthSession(data.user, data.access_token, data.refresh_token, deviceId);
    return data;
  }

  async function refreshAccessToken() {
    const rt = getRefreshToken();
    if (!rt) return false;

    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: rt })
      });

      if (!res.ok) {
        clearAuthSession();
        return false;
      }

      const data = await res.json();
      localStorage.setItem('zt_access_token', data.access_token);
      return true;
    } catch {
      clearAuthSession();
      return false;
    }
  }

  async function logout() {
    const rt = getRefreshToken();
    if (rt) {
      await fetch(`${BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: rt })
      }).catch(() => {});
    }
    clearAuthSession();
  }

  // Domain API calls
  const getNilai = () => request('/nilai');
  const updateNilai = (id, nilai_angka) => request(`/nilai/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ nilai_angka })
  });
  const finalizeKelas = (kelasId) => request(`/kelas/${kelasId}/finalisasi`, {
    method: 'POST'
  });
  const getTranskrip = (nim) => request(`/transkrip/${encodeURIComponent(nim)}`);
  const getAuditLogs = () => request('/audit-logs');
  const resetDatabase = () => request('/seed-database', { method: 'POST' });

  return {
    getStoredUser,
    getAccessToken,
    getRefreshToken,
    getDeviceId,
    getMockHour,
    setAuthSession,
    clearAuthSession,
    login,
    refreshAccessToken,
    logout,
    getNilai,
    updateNilai,
    finalizeKelas,
    getTranskrip,
    getAuditLogs,
    resetDatabase
  };
})();
