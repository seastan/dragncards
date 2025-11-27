import { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import useAuth from "./useAuth";

const useAuthDataApi = (
  initialUrl: string,
  initialData: null,
  onError?: () => void
) => {
  const [data, setData] = useState<any>(initialData);
  const [url, setUrl] = useState(initialUrl); // Mechanism to refetch by changing url
  const [hash, setHash] = useState<any>(null); // Mechanism to refetch same url, by changing hash
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  console.log("useAuthDataApi")
  console.log("useAuthDataApi data", data)
  console.log("useAuthDataApi url", url)
  console.log("useAuthDataApi hash", hash)
  console.log("useAuthDataApi isLoading", isLoading)
  console.log("useAuthDataApi isError", isError)

  const { authToken, renewToken, setAuthAndRenewToken } = useAuth();
  console.log("debug1 authtoken", authToken)
  const authOptions = useMemo(
    () => ({
      headers: {
        Authorization: authToken,
      },
    }),
    [authToken]
  );
  const renewOptions = useMemo(
    () => ({
      headers: {
        Authorization: renewToken,
      },
    }),
    [renewToken]
  );

  const intercept_error = useCallback(
    (error: any) => {
      const originalRequest = error.config;
      const renewUrl = "/be/api/v1/session/renew";

      // Log the error details for debugging
      console.error('userTrace Interceptor caught an error:', error);
      console.log('userTrace Error response:', error.response);
      console.log('userTrace Original request:', originalRequest);
      if (
        originalRequest._retry ||
        (error.response != null &&
          error.response.status != null &&
          error.response.status !== 401) ||
        originalRequest.url === renewUrl ||
        renewOptions.headers.Authorization == null
      ) {
        return Promise.reject(error);
      }

      // Interceptor doing work (Trying to renew)

      originalRequest._retry = true;
      return axios
        .post(renewUrl, null, renewOptions)
        .then((res) => {
          if (res.status === 200) {
            setAuthAndRenewToken(
              res.data.data.token,
              res.data.data.renew_token
            );

            // Modify the original request if possible
            if (
              originalRequest.headers != null &&
              originalRequest.headers.Authorization != null
            ) {
              originalRequest.headers.Authorization = res.data.data.token;
            }
            return axios(originalRequest);
          }
        })
        .catch((e) => {
          if (onError != null) {
            onError();
          }
          // Interceptor error after renew
        });
    },
    [onError, renewOptions, setAuthAndRenewToken]
  );

  useEffect(() => {
    console.log("debug1 initial 1", authOptions)
    const fetchData = async () => {
      // // DEVELOPMENT MODE: Use hardcoded data to avoid login issues during hot reload
      // if (process.env.NODE_ENV === 'development' && url === '/be/api/v1/profile') {
      //   const devData = {
      //     data: {
      //       user_profile: {
      //         admin: true,
      //         alias: "dev_user",
      //         email: "dev_user@example.com",
      //         email_confirmed_at: "2023-09-20T18:29:31Z",
      //         id: 1,
      //         inserted_at: "2023-06-06T04:32:12Z",
      //         language: "English",
      //         plugin_settings: {},
      //         supporter_level: 3
      //       }
      //     }
      //   };
      //   console.log("debug1 using hardcoded dev data", devData);
      //   setData(devData);
      //   setIsLoading(false);
      //   return;
      // }

      // Do not request if we don't have auth tokens loaded
      // Also, clear data (Unsure about this, but needed for the logout
      // button to clear the ProfileProvider context)
      if (authOptions.headers.Authorization == null) {
        console.log("debug1 initial 2a", authOptions)
        console.log("debug1 initial 2b", initialData)
        setData(initialData); // FIXME: Could this be causing the login persistence problems?
        return;
      }
      console.log("debug1 tokenexists", authOptions)
      const id = (response: any) => response;
      setIsError(false);
      setIsLoading(true);

      const an_axios = axios.create({
        timeout: 2000,
      });
      console.log("debug1 create", an_axios)
      an_axios.interceptors.response.use(id, intercept_error);
      try {
        console.log("debug1 result 1", url, authOptions)
        const result = await an_axios(url, authOptions); // FIXME: When profile hangs on refresh this is usually the culprit
        console.log("debug1 result 2", result)
        if (result != null) {
          console.log("debug1 fetchtry", result.data?.user_profile?.language)
          console.log("debug1 fetchtry data", result.data)
          setData(result.data);
        }
      } catch (error) {
        console.log("debug1 error", error)
        console.log("useAuthDataApi error", error)
        setIsError(true);
      }
      setIsLoading(false);
    };
    fetchData();
  }, [url, hash, authOptions, intercept_error, initialData]);
  return {
    data,
    isLoading,
    isError,
    doFetchUrl: setUrl,
    doFetchHash: setHash,
    setData, // Override what was fetched by the API (For example, websocket updates)
  };
};

export default useAuthDataApi;
