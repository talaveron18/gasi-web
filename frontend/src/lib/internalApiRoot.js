const configured = process.env.NODE_ENV === 'development'
  ? String(process.env.REACT_APP_BACKEND_URL || '').trim().replace(/\/+$/, '')
  : '';

export const INTERNAL_API_ROOT = configured
  ? `${configured}/api/internal-clinical`
  : '/api/internal-clinical';

export const internalApiRoot = (baseUrl = null) => {
  const explicit = baseUrl == null ? '' : String(baseUrl).trim().replace(/\/+$/, '');
  return explicit ? `${explicit}/api/internal-clinical` : INTERNAL_API_ROOT;
};
