import React, { useEffect, useMemo, ReactNode } from "react";
import { Socket } from "phoenix";

import SocketContext from "../contexts/SocketContext";

const SocketProvider = ({
  wsUrl,
  options,
  children,
}: {
  wsUrl: string;
  options: object | (() => object);
  children: ReactNode;
}) => {
  const socket = useMemo(() => new Socket(wsUrl, { params: options }), [options, wsUrl]);

  useEffect(() => {
    socket.connect();
    return () => {
      socket.disconnect();
    };
  }, [socket]);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};

export default SocketProvider;
