import { useState, useEffect } from "react";
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { set } from "date-fns";

async function axiosRetry(
  url: string,
  options: AxiosRequestConfig,
  retries: number,
  delay: number,
  setProgressEvent: any
): Promise<AxiosResponse> {
  try {
    console.log("pluginTrace axiosRetry try 1", url)
    const an_axios = axios.create({
      //timeout: delay, 
      onDownloadProgress: progressEvent => {console.log("progressEvent", progressEvent); setProgressEvent(progressEvent)}
    });
    const result = await an_axios(url, options);

    console.log("pluginTrace axiosRetry try 2", url, result)
    
    // Calculate the size of the received data
    const dataSize = new TextEncoder().encode(JSON.stringify(result.data)).length;
    console.log(`Received data size: ${dataSize} bytes`);
    // const dataSize = new TextEncoder().encode(JSON.stringify(result.data.compressed_data)).length;
    // console.log(`Received data size: ${dataSize} bytes`);
    // const dataSize2 = new TextEncoder().encode(JSON.stringify(result.data.original_data)).length;
    // console.log(`Received data size: ${dataSize2} bytes`);
    
    return result;
  } catch (error) {
    console.log("pluginTrace axiosRetry catch 1", url, error)
    if (retries > 0) {
      // Wait for the specified delay before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
      console.log("pluginTrace axiosRetry catch 2", url)
      // Retry with an increased delay
      return axiosRetry(url, options, retries - 1, delay * 2, setProgressEvent);
    } else {
      // If retries are exhausted, throw the error
      throw error;
    }
  }
}

const useDataApi = <T extends any>(
  initialUrl: string,
  initialData: T,
  initialFetch: boolean = true // Added this line
) => {
  const [data, setData] = useState(initialData);
  const [url, setUrl] = useState(initialUrl);
  const [hash, setHash] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [progressEvent, setProgressEvent] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!initialized && !initialFetch) {
        setInitialized(true);
        return; // Skip fetch if initialFetch is false
      }

      setIsError(false);
      setIsLoading(true);

      try {
        const retries = 4;
        const initialDelay = 1000;
        console.log("pluginTrace useDataApi 1", url)
        const result = await axiosRetry(url, {}, retries, initialDelay, setProgressEvent);
        console.log("pluginTrace useDataApi 2", result)
        setData(result.data);
      } catch (error) {
        setIsError(true);
      }
      
      setIsLoading(false);
      setInitialized(true);
    };

    fetchData();
  }, [url, hash, initialFetch]); // Added initialFetch dependency

  return {
    data,
    isLoading,
    isError,
    doFetchUrl: setUrl,
    doFetchHash: setHash,
    setData,
    progressEvent
  };
};

export default useDataApi;
