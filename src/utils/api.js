/**
 * Centralized API fetch wrapper with automatic JWT token refresh.
 * Uses import.meta.env.VITE_API_URL for production and development environment compatibility.
 */

export const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

export function getApiUrl(endpoint) {
  if (!endpoint) return API_BASE_URL;
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  
  let cleanEndpoint = endpoint;
  if (cleanEndpoint.startsWith('/api/')) {
    cleanEndpoint = cleanEndpoint.substring(4);
  } else if (cleanEndpoint === '/api') {
    cleanEndpoint = '';
  }
  
  if (!cleanEndpoint.startsWith('/') && cleanEndpoint !== '') {
    cleanEndpoint = '/' + cleanEndpoint;
  }
  
  return `${API_BASE_URL}${cleanEndpoint}`;
}

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Clear local credentials and notify app of session termination
 */
export function handleSessionExpired() {
  localStorage.removeItem('pos_token');
  localStorage.removeItem('pos_refresh_token');
  localStorage.removeItem('pos_user');
  window.dispatchEvent(new CustomEvent('auth_session_expired'));
}

export async function apiFetch(url, options = {}) {
  const fullUrl = getApiUrl(url);
  const headers = options.headers || {};
  let token = localStorage.getItem('pos_token');

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const fetchOptions = {
    ...options,
    headers
  };

  let response;
  try {
    response = await fetch(fullUrl, fetchOptions);
  } catch (netErr) {
    // Automatic Network Failover to Local Gateway when internet fails
    const localFallbackUrl = fullUrl.replace(/^https?:\/\/[^\/]+/, 'http://localhost:5000');
    console.warn(`[API Network Failover] Internet connection lost. Route fallback -> ${localFallbackUrl}`);
    response = await fetch(localFallbackUrl, fetchOptions);
  }

  // Exclude auth-specific endpoints to prevent infinite refresh loops
  const isAuthEndpoint = fullUrl.includes('/api/auth/login') ||
                         fullUrl.includes('/api/auth/refresh') ||
                         fullUrl.includes('/api/auth/verify-otp');

  // Handle 401 Unauthorized (Expired or Invalid Access Token)
  if (response.status === 401 && !isAuthEndpoint) {
    const refreshToken = localStorage.getItem('pos_refresh_token');

    // If no refresh token is present, clear session and return 401 response
    if (!refreshToken) {
      handleSessionExpired();
      return response;
    }

    // Check if another concurrent request or tab already refreshed the token
    const latestToken = localStorage.getItem('pos_token');
    if (latestToken && latestToken !== token) {
      fetchOptions.headers['Authorization'] = `Bearer ${latestToken}`;
      return fetch(fullUrl, fetchOptions);
    }

    // If a refresh is already in progress in this tab, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(newToken => {
          fetchOptions.headers['Authorization'] = `Bearer ${newToken}`;
          return fetch(fullUrl, fetchOptions);
        })
        .catch(err => {
          return Promise.reject(err);
        });
    }

    isRefreshing = true;

    try {
      const refreshRes = await fetch(getApiUrl('/api/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken, token: refreshToken })
      });

      if (refreshRes.ok) {
        const data = await refreshRes.json();
        const newAccessToken = data.accessToken;
        const newRefreshToken = data.refreshToken;

        if (newAccessToken) {
          localStorage.setItem('pos_token', newAccessToken);
        }
        if (newRefreshToken) {
          localStorage.setItem('pos_refresh_token', newRefreshToken);
        }
        if (data.user) {
          localStorage.setItem('pos_user', JSON.stringify(data.user));
        }

        // Notify all queued subscribers
        processQueue(null, newAccessToken);
        isRefreshing = false;

        // Dispatch token refresh event
        window.dispatchEvent(new CustomEvent('auth_token_refreshed', { detail: { token: newAccessToken, user: data.user } }));

        // Transparently retry the original failed request
        fetchOptions.headers['Authorization'] = `Bearer ${newAccessToken}`;
        response = await fetch(fullUrl, fetchOptions);
      } else {
        // Refresh token expired or invalid
        processQueue(new Error('Refresh token expired'), null);
        isRefreshing = false;
        handleSessionExpired();
      }
    } catch (refreshErr) {
      processQueue(refreshErr, null);
      isRefreshing = false;
      handleSessionExpired();
    }
  }

  return response;
}

/**
 * Triggers an authenticated file download using apiFetch (with automatic JWT token refresh).
 */
export async function downloadFile(endpoint, defaultFilename = 'export.xlsx') {
  try {
    const response = await apiFetch(endpoint);
    if (!response.ok) {
      let errMessage = 'Failed to download file.';
      try {
        const errJson = await response.json();
        errMessage = errJson.error || errMessage;
      } catch (e) {}
      throw new Error(errMessage);
    }

    let filename = defaultFilename;
    const disposition = response.headers.get('content-disposition');
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) {
        filename = match[1];
      }
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
    return true;
  } catch (err) {
    console.error('File download error:', err);
    throw err;
  }
}
