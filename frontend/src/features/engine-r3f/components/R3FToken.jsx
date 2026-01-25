/**
 * R3FToken - Renders a token as a 3D plane with texture that lays flat on cards
 */

import React, { useState, useEffect } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Token3D - Renders a token as a 3D plane with texture
 * @param {Object} props
 * @param {[number, number, number]} props.position - Position relative to parent
 * @param {number} props.size - Size of the token
 * @param {string} props.imageUrl - URL of the token image
 * @param {string|number} props.label - Label to display on the token
 */
export const Token3D = ({ position, size, imageUrl, label }) => {
  const [texture, setTexture] = useState(null);

  useEffect(() => {
    if (!imageUrl) return;
    const loader = new THREE.TextureLoader();
    loader.load(
      imageUrl,
      (loadedTexture) => {
        loadedTexture.colorSpace = THREE.SRGBColorSpace;
        setTexture(loadedTexture);
      },
      undefined,
      (error) => console.warn('Failed to load token texture:', imageUrl, error)
    );
  }, [imageUrl]);

  return (
    <group position={position}>
      {/* Token image as a plane */}
      <mesh>
        <planeGeometry args={[size, size]} />
        {texture ? (
          <meshBasicMaterial
            map={texture}
            transparent
            alphaTest={0.1}
            side={THREE.DoubleSide}
          />
        ) : (
          <meshBasicMaterial color="#444" transparent opacity={0.5} side={THREE.DoubleSide} />
        )}
      </mesh>
      {/* Label text */}
      {label && (
        <Text
          position={[0, 0, 0.01]}
          fontSize={size * 0.4}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={size * 0.06}
          outlineColor="black"
        >
          {label}
        </Text>
      )}
    </group>
  );
};

export default Token3D;
