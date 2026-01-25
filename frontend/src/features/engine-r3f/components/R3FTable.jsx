/**
 * R3FTable - Table surface component for the 3D view
 */

import React from 'react';
import { TABLE_WIDTH, TABLE_HEIGHT } from '../utils/cameraUtils';

/**
 * TableSurface - The main table surface that cards sit on
 */
export const TableSurface = () => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
    <planeGeometry args={[TABLE_WIDTH, TABLE_HEIGHT]} />
    <meshStandardMaterial color="#1a1a2e" roughness={0.9} metalness={0.1} />
  </mesh>
);

export default TableSurface;
