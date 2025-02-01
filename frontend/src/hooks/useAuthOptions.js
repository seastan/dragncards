import { useMemo } from "react";
import useAuth from "./useAuth";

export const useAuthOptions = () => {
  const { authToken, renewToken, setAuthAndRenewToken } = useAuth();
  const authOptions = useMemo(
    () => ({
      headers: {
        Authorization: authToken,
      },
    }),
    [authToken]
  );
  return authOptions;
}