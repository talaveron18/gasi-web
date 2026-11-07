// The commercial Netlify deployment intentionally excludes student and
// internal-clinical authentication APIs. Do not show usable login forms until
// their authenticated backends have been separately deployed and audited.
// Enabling a frontend flag alone never makes those APIs available.
export const STUDENT_PORTAL_ENABLED = process.env.REACT_APP_STUDENT_PORTAL_ENABLED === 'true';
export const INTERNAL_PORTAL_ENABLED = process.env.REACT_APP_INTERNAL_PORTAL_ENABLED === 'true';
