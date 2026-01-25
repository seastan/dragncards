/**
 * Image proxy utilities for CORS support in WebGL textures
 */

/**
 * Convert an image URL to use the backend proxy for CORS support.
 * This is needed for WebGL textures from external domains.
 * @param {string} originalUrl - Original image URL
 * @returns {string|null} - Proxied URL or null
 */
export const getProxiedImageUrl = (originalUrl) => {
  if (!originalUrl) return null;

  // If it's already a relative URL or same origin, no need to proxy
  if (originalUrl.startsWith('/') || originalUrl.startsWith(window.location.origin)) {
    return originalUrl;
  }

  // Use the backend proxy with base64-encoded URL
  const encodedUrl = btoa(originalUrl);
  return `/be/api/image-proxy?url=${encodeURIComponent(encodedUrl)}`;
};
