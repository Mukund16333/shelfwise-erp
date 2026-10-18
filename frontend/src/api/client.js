// ShelfWise API Client

const BASE_URL = '/api';

export function getStoredToken() {
  return localStorage.getItem('shelfwise_token');
}

export function setStoredToken(token) {
  if (token) {
    localStorage.setItem('shelfwise_token', token);
  } else {
    localStorage.removeItem('shelfwise_token');
  }
}

export async function apiRequest(endpoint, options = {}) {
  const token = getStoredToken();
  const headers = {
    ...options.headers,
  };

  // If not FormData, default to application/json
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Session expired or unauthenticated
    setStoredToken(null);
    if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/signup')) {
      window.location.href = '/login';
    }
    throw new Error('Authentication expired. Please sign in again.');
  }

  // Handle file downloads (blobs)
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('text/csv')) {
    if (!response.ok) throw new Error('Failed to download CSV');
    return await response.blob();
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.detail || data.message || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

// Indian Rupee formatting utility (Design Brief: ₹ and Indian digit grouping)
export function formatINR(val, currencySymbol = '₹') {
  if (val === undefined || val === null || isNaN(val)) return `${currencySymbol}0`;
  const num = Math.round(Number(val));
  // Indian numbering system format (e.g., 2,84,500)
  const formatted = num.toLocaleString('en-IN');
  return `${currencySymbol}${formatted}`;
}

export function formatNumber(val) {
  if (val === undefined || val === null || isNaN(val)) return '0';
  return Number(val).toLocaleString('en-IN');
}
