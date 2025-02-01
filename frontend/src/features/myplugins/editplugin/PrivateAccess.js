import React, { useEffect, useState } from 'react';
import AutocompleteItem from './AutocompleteItem';
import UserTag from './UserTag';
import useDataApi from '../../../hooks/useDataApi';
import AutocompleteInput from './AutocompleteInput';
import { useAuthOptions } from '../../../hooks/useAuthOptions';
import axios from "axios";

const PrivateAccess = ({pluginId}) => {
  const [inputValue, setInputValue] = useState('');
  const [selectedUsers, setSelectedUsers] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const [allUserPermissionData, setAllUserPermissionData] = useState({});
  const authOptions = useAuthOptions();

  const { data, isLoading, isError, doFetchUrl, doFetchHash, setData } = useDataApi(
    '/be/api/v1/users/plugin_permission/' + pluginId,
    null
  );

  console.log('Rendering AutocompleteInput', pluginId, data, isLoading, isError, doFetchUrl, doFetchHash, setData)


  // User alias list (keys from data object)
  const allUsers = data?.data; // ? Object.keys(data?.data) : [];


  // After isLoaded, set selectedUsers to the list of users with permission
  useEffect(() => {
    if (!data?.data) return;
    if (isLoading) return;
    setAllUserPermissionData(data?.data);
  }, [isLoading]);

  if (data?.data === null || isLoading) return <div>Loading...</div>;

  const updateSuggestions = (value) => {
    if (value) {
      // const newSuggestions = allUsers.filter((user) =>
      //   user.toLowerCase().startsWith(value.toLowerCase())
      // );
      const newSuggestions = Object.keys(allUserPermissionData).filter((user) =>
        user.toLowerCase().startsWith(value.toLowerCase()) && allUserPermissionData[user]["private_access"] === false
      );
      // // Remove suggestions that are already selected
      // const filteredSuggestions = newSuggestions.filter(
      //     (suggestion) => !selectedUsers.includes(suggestion)
      // );
      setSuggestions(newSuggestions);
    } else {
      setSuggestions([]);
    }
  };

  const addUser = async(user) => {
    //setSelectedUsers([...selectedUsers, user]);
    setInputValue('');
    setSuggestions([]);
    const userId = allUserPermissionData[user].user_id;
    const res = await axios.post(`/be/api/v1/users/plugin_permission/${pluginId}/${userId}`, {}, authOptions);
    if (res.status === 200) {
      setAllUserPermissionData({...allUserPermissionData, [user]: {...allUserPermissionData[user], "private_access": true}});
    }
  };

  const removeUser = async(user) => {
    //setSelectedUsers(selectedUsers.filter((u) => u !== user));
    const userId = allUserPermissionData[user].user_id;
    const res = await axios.delete(`/be/api/v1/users/plugin_permission/${pluginId}/${userId}`, {}, authOptions);
    if (res.status === 200) {
      setAllUserPermissionData({...allUserPermissionData, [user]: {...allUserPermissionData[user], "private_access": false}});
    }
  };

  return (
    <div>
      <div className="flex flex-wrap">
        {Object.keys(allUserPermissionData).map((user, index) => (
          allUserPermissionData[user]["private_access"] === true && <UserTag key={index} onRemove={() => removeUser(user)}>
            {user}
          </UserTag>
        ))}
        {/* {selectedUsers.map((user, index) => (
          <UserTag key={index} onRemove={() => removeUser(user)}>
            {user}
          </UserTag>
        ))} */}
        
        <AutocompleteInput inputValue={inputValue} setInputValue={setInputValue} updateSuggestions={updateSuggestions}/>
      </div>
      <div className='mt-1'>
        {suggestions.map((suggestion, index) => (
          <AutocompleteItem key={index} onClick={() => addUser(suggestion)}>
            {suggestion}
          </AutocompleteItem>
        ))}
      </div>
    </div>
  );
};

export default PrivateAccess;
