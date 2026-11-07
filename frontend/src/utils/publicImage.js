// Keep the source URLs in one place while serving public photos via Netlify's
// same-origin image CDN on preview and production deployments.
// The development server has no /.netlify/images endpoint, so use the source URL there.
export const publicImage = (url) => {
  if (process.env.NODE_ENV !== 'production' || !url.startsWith('https://images.unsplash.com/')) {
    return url;
  }
  return `/.netlify/images?url=${encodeURIComponent(url)}`;
};
