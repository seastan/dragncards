import { useMemo } from "react";
import useAuth from "./useAuth";

export const useAuthOptions = () => {
  const { authToken } = useAuth();
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