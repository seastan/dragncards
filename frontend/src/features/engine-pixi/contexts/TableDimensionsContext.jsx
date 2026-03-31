import { createContext, useContext } from 'react';

export const TableDimensionsContext = createContext({ tableWidth: 1920, tableHeight: 1080 });
export const useTableDimensions = () => useContext(TableDimensionsContext);

export const TableDimensionsProvider = ({ width, height, children }) => (
  <TableDimensionsContext.Provider value={{ tableWidth: width, tableHeight: height }}>
    {children}
  </TableDimensionsContext.Provider>
);
