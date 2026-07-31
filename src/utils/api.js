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

  let response = await fetch(fullUrl, fetchOptions);

  // Handle 401 Unauthorized (Expired Access Token)
  if (response.status === 401) {
    const refreshToken = localStorage.getItem('pos_refresh_token');

    // If no refresh token is present, we cannot refresh automatically
    if (!refreshToken) {
      return response;
    }

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
        body: JSON.stringify({ token: refreshToken })
      });

      if (refreshRes.ok) {
        const data = await refreshRes.json();
        const newAccessToken = data.accessToken;

        localStorage.setItem('pos_token', newAccessToken);
        fetchOptions.headers['Authorization'] = `Bearer ${newAccessToken}`;

        // Notify subscribers in queue
        processQueue(null, newAccessToken);
        isRefreshing = false;

        // Transparently retry the original request with new token
        response = await fetch(fullUrl, fetchOptions);
      } else {
        // Refresh token expired or revoked - clear storage
        processQueue(new Error('Refresh token expired'), null);
        isRefreshing = false;
        
        localStorage.removeItem('pos_token');
        localStorage.removeItem('pos_refresh_token');
        localStorage.removeItem('pos_user');

        // Reload window to return cleanly to Login screen
        window.location.reload();
      }
    } catch (refreshErr) {
      processQueue(refreshErr, null);
      isRefreshing = false;
    }
  }

  return response;
}
