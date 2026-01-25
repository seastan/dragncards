/**
 * Hook for loading card textures with CORS support
 */

import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';

// Texture cache to avoid reloading
const textureCache = new Map();
const textureLoader = new THREE.TextureLoader();

/**
 * Load card texture with CORS support
 *
 * NOTE: Card images must be served with CORS headers for 3D textures to work.
 * If images fail to load, cards will display with fallback colors.
 *
 * To enable textures, the image server needs to return:
 *   Access-Control-Allow-Origin: *
 *
 * @param {string} imageSrc - Image URL to load
 * @returns {{texture: THREE.Texture|null, loading: boolean, error: boolean}}
 */
export const useCardTexture = (imageSrc) => {
  // Initialize from cache immediately to prevent flicker when component mounts
  const [texture, setTexture] = useState(() => {
    if (imageSrc && textureCache.has(imageSrc)) {
      const cached = textureCache.get(imageSrc);
      return cached === 'error' ? null : cached;
    }
    return null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(() => {
    if (imageSrc && textureCache.has(imageSrc)) {
      return textureCache.get(imageSrc) === 'error';
    }
    return false;
  });
  const lastValidSrcRef = useRef(imageSrc);

  useEffect(() => {
    if (!imageSrc) {
      // Don't clear texture when imageSrc is temporarily null (prevents flicker during state transitions)
      // Only clear if we never had a valid source
      if (!lastValidSrcRef.current) {
        setTexture(null);
      }
      return;
    }

    // Track the last valid source
    lastValidSrcRef.current = imageSrc;

    // Check cache first - texture might already be set from initialization
    if (textureCache.has(imageSrc)) {
      const cached = textureCache.get(imageSrc);
      if (cached === 'error') {
        setError(true);
        setTexture(null);
      } else {
        setTexture(cached);
        setError(false);
      }
      return;
    }

    setLoading(true);
    setError(false);

    // Try loading with CORS - required for WebGL textures
    textureLoader.setCrossOrigin('anonymous');
    textureLoader.load(
      imageSrc,
      (loadedTexture) => {
        loadedTexture.minFilter = THREE.LinearFilter;
        loadedTexture.magFilter = THREE.LinearFilter;
        loadedTexture.colorSpace = THREE.SRGBColorSpace;
        textureCache.set(imageSrc, loadedTexture);
        setTexture(loadedTexture);
        setLoading(false);
      },
      undefined,
      (err) => {
        // CORS error - cache the failure to avoid repeated attempts
        console.warn('3D texture loading failed (CORS). Card will use fallback color:', imageSrc);
        textureCache.set(imageSrc, 'error');
        setError(true);
        setLoading(false);
      }
    );
  }, [imageSrc]);

  return { texture, loading, error };
};

export default useCardTexture;
