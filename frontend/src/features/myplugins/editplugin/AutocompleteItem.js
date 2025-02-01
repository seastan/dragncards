import React from 'react';

const AutocompleteItem = ({ children, onClick }) => {
  return (
    <div onClick={onClick} className="p-1 pl-3 bg-gray-400 hover:bg-gray-200 cursor-pointer">
      {children}
    </div>
  );
};

export default AutocompleteItem;
