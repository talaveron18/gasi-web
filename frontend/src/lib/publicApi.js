const configured = (process.env.REACT_APP_BACKEND_URL || '').trim().replace(/\/+$/, '');

export const PUBLIC_API_BASE = configured ? `${configured}/api` : '/api';

export const publicApiUrl = (path = '') => {
  const normalized = String(path || '').replace(/^\/+/, '');
  return normalized ? `${PUBLIC_API_BASE}/${normalized}` : PUBLIC_API_BASE;
};
