/**
 * Example runtime environment file.
 * During deploy, create `public/runtime.env.js` with the real values.
 *
 * Example generation (bash):
 * echo "window.__APP_ENV__ = { VITE_API_URL: 'https://api.example.com', VITE_APP_NAME: 'LAS VILLAS' };" > public/runtime.env.js
 */

window.__APP_ENV__ = {
  VITE_API_URL: "https://api-villas-production.up.railway.app",
  VITE_APP_NAME: "LAS VILLAS",
};
