import React, { useCallback, useEffect } from "react";
import ProfileContext from "../contexts/ProfileContext";
import useAuthDataApi from "../hooks/useAuthDataApi";
import useAuth from "../hooks/useAuth";
import useInterval from "../hooks/useInterval";

export const ProfileProvider = ({ children }) => {
  const { setAuthAndRenewToken, authToken } = useAuth();
  const onError = useCallback(() => {
    // If we can't load the profile data, we have stale tokens
    // (remember the useAuthDataApi tries to renew automatically)
    // Forget them and log the user out
    console.log("can't load profile data")
    setAuthAndRenewToken(null, null);
  }, [setAuthAndRenewToken]);
  const { data, doFetchUrl, doFetchHash, setData } = useAuthDataApi(
    "/be/api/v1/profile",
    null,
    onError
  );
  console.log("Rendering ProfileProvider", data)

  // Check if a valid authToken exists (user is authenticated)
  const isAuthenticated = authToken !== null;

  // Fetch data when the page is refreshed and the user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      // Fetch data using the auth token
      doFetchUrl("/be/api/v1/profile");
    }
  }, [isAuthenticated, authToken, doFetchUrl]);

  // Every 10 minutes, re-check our profile. This is what keeps the session
  // alive: the auth token lives for 30 minutes in Pow's CredentialsCache, and
  // the only thing that renews it is a 401 from an authenticated request (see
  // the interceptor in useAuthDataApi). Without this poll an idle tab quietly
  // ends up holding a dead token - the nav bar still looks logged in, but the
  // websocket reconnects with an expired token and every room join is rejected
  // as "room unavailable".
  const refetchProfile = useCallback(() => {
    if (!isAuthenticated) return;
    doFetchHash(Date.now());
  }, [isAuthenticated, doFetchHash]);
  useInterval(refetchProfile, 600 * 1000);

  const user =
    data != null && data.user_profile != null ? data.user_profile : null;
  if (user) {
    user.setData = setData;
    user.doFetchHash = doFetchHash;
  }
  console.log("data prov ",data)

  return (
    <ProfileContext.Provider value={user}>{children}</ProfileContext.Provider>
  );
};
export default ProfileProvider;
