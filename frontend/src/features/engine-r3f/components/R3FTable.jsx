/**
 * R3FTable - Table surface component for the 3D view
 */

import React from 'react';
import { useTableDimensions } from '../contexts/TableDimensionsContext';

/**
 * TableSurface - The main table surface that cards sit on
 */
export const TableSurface = () => {
  const { tableWidth, tableHeight } = useTableDimensions();
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
      <planeGeometry args={[tableWidth, tableHeight]} />
      <meshStandardMaterial color="#1a1a2e" roughness={0.9} metalness={0.1} />
    </mesh>
  );
};

export default TableSurface;
