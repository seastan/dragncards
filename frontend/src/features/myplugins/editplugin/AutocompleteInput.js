import React from 'react';


const AutocompleteInput = ({inputValue, setInputValue, updateSuggestions}) => {
  return(
    <input
      value={inputValue}
      placeholder='Add user...'
      onChange={(e) => {
        setInputValue(e.target.value);
        updateSuggestions(e.target.value);
      }}
      style={{minWidth: '8rem'}}
      className="flex-1 h-7 bg-transparent border-none text-white text-sm placeholder-gray-400 outline-none focus:outline-none"
    />
  )
}

export default AutocompleteInput;
