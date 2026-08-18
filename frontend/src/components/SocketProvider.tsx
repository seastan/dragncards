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
  // `options` should be a function: phoenix calls it on every (re)connect, so
  // the socket presents current credentials rather than the ones it was built
  // with. A plain object still works, but is frozen at construction.
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
