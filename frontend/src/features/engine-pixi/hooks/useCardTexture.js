/**
 * PixiJS texture loading with caching.
 *
 * Loads images via HTMLImageElement (same approach as R3F's TextureLoader)
 * then wraps in PIXI.Texture. This avoids PIXI.Assets quirks and gives
 * full control over crossOrigin handling.
 */
import { useState, useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';

// Global texture cache keyed by URL
const textureCache = new Map();

export const getProxiedTextureUrl = (src) => {
  if (!src) return null;
  // For external URLs that need CORS proxying, match R3F imageProxy logic
  if (src.startsWith('http') && !src.includes(window.location.hostname)) {
    const encoded = btoa(unescape(encodeURIComponent(src)));
    return `/be/api/image-proxy?url=${encoded}`;
  }
  return src;
};

/**
 * Returns { texture, loading, error } for a given image URL.
 * Re-uses cached PIXI.Texture instances across component instances.
 */
export const useCardTexture = (src) => {
  const url = getProxiedTextureUrl(src);

  const [texture, setTexture] = useState(() => {
    if (!url) return PIXI.Texture.WHITE;
    return textureCache.get(url) ?? PIXI.Texture.WHITE;
  });

  const urlRef = useRef(url);

  useEffect(() => {
    urlRef.current = url;

    if (!url) {
      setTexture(PIXI.Texture.WHITE);
      return;
    }

    if (textureCache.has(url)) {
      setTexture(textureCache.get(url));
      return;
    }

    let cancelled = false;

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      if (cancelled || urlRef.current !== url) return;
      // Build PIXI texture from the loaded HTMLImageElement
      const baseTexture = new PIXI.BaseTexture(img);
      const tex = new PIXI.Texture(baseTexture);
      textureCache.set(url, tex);
      setTexture(tex);
    };

    img.onerror = () => {
      if (cancelled || urlRef.current !== url) return;
      console.warn('[PixiJS] Failed to load card texture:', url);
      setTexture(PIXI.Texture.WHITE);
    };

    img.src = url;

    return () => {
      cancelled = true;
    };
  }, [url]);

  return { texture, loading: false, error: null };
};
