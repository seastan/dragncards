import { createContext, useContext } from 'react';
import { useThree } from '@react-three/fiber';
import { TABLE_WIDTH, TABLE_HEIGHT } from '../utils/cameraUtils';

export const TableDimensionsContext = createContext({ tableWidth: TABLE_WIDTH, tableHeight: TABLE_HEIGHT });

export const useTableDimensions = () => useContext(TableDimensionsContext);

/**
 * Must be rendered inside a react-three-fiber Canvas.
 * Computes tableWidth dynamically so the table fills the screen width
 * regardless of aspect ratio, while keeping tableHeight constant.
 */
export const TableDimensionsProvider = ({ children }) => {
  const { size } = useThree();
  const tableHeight = TABLE_HEIGHT;
  const tableWidth = size.height > 0 ? tableHeight * (size.width / size.height) : TABLE_WIDTH;

  return (
    <TableDimensionsContext.Provider value={{ tableWidth, tableHeight }}>
      {children}
    </TableDimensionsContext.Provider>
  );
};
