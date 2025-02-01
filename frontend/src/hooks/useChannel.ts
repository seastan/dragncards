import { useContext, useEffect, useState } from "react";
import { Socket } from "phoenix";
import SocketContext from "../contexts/SocketContext";

/* useChannel is used to provide access to phoenix channels.

example usage showing communication in both directions:

interface Props {}
export const TestComponent: React.FC<Props> = () => {
  const onChannelMessage = useCallback((event, payload) => {
    console.log("Got channel message from phoenix", event, payload);
  }, []);
  const broadcast = useChannel("lobby:lobby", onChannelMessage);
  return (
    <button
      onClick={() => broadcast("test_message_from_javascript", { stuff: 1 })}
    >
      Send message to phoenix
    </button>
  );
};

this is adapated from alexgriff/use-phoenix-channel with the following changes:
1. Ported to typescript
2. Does not force you to use a reducer.

Note: It does require access to a phoenix socket object, built like so:

import { Socket } from 'phoenix';
const socket = new Socket(webSocketUrl, {params: options});
socket.connect();

It looks for this in SocketContext.  See
https://medium.com/flatiron-labs/improving-ux-with-phoenix-channels-react-hooks-8e661d3a771e
for an example implementation.

*/

const useChannel = (
  channelTopic: string,
  onMessage: (event: any, payload: any) => void,
  myUserId: number | null | undefined,
) => {
  const socket = useContext(SocketContext);
  const [broadcast, setBroadcast] = useState<
    (eventName: string, payload: object) => void
  >(mustJoinChannelWarning);

  useEffect(() => {
    let doCleanup: () => void = () => null;
    console.log('socket',socket);
    if (socket != null) {
      doCleanup = joinChannel(socket, channelTopic, onMessage, setBroadcast, myUserId);
    }
    return doCleanup;
  }, [channelTopic, onMessage, socket, myUserId]);

  return broadcast;
};

const joinChannel = (
  socket: Socket,
  channelTopic: string,
  onMessage: (event: any, payload: any) => void,
  setBroadcast: React.Dispatch<
    React.SetStateAction<(eventName: string, payload: object) => void>
  >,
  myUserId: number | null | undefined,
) => {
  const channel = socket.channel(channelTopic, { client: "browser" });
  console.log('joinCh',channel);

  channel.onMessage = (event, payload) => {
    //console.log("game state payload", payload)
    const userId = payload?.response?.user_id;
    // I don't think the chan_reply_ events are needed - always duplicates of phx_reply?
    if (event != null && !event.startsWith("chan_reply_")) {
      onMessage(event, payload);
    }

    // Specific Hack for DragnCards
    // See room_channel.ex for more info
    //console.log("game state userid ",event, userId, myUserId)
    if (event != null && event === "ask_for_update") { // && userId !== myUserId) {
      console.log("requesting game state")
      channel.push("request_state", {});
    }

    // Return the payload since we're using the
    // special onMessage hook
    return payload;
  };

  channel
    .join()
    .receive(
      "ok",
      ({ messages }) => null
      //console.log("successfully joined channel", messages || "")
    )
    .receive("error", ({ reason }) =>
      console.error("failed to join channel", reason)
    );

  setBroadcast((_oldstate: any) => (eventName: string, payload: object) => 
  //channel.push(eventName, payload)
    channel.push(eventName, {...payload, timestamp: Math.floor(Date.now())})
  );

  return () => {
    channel.leave();
  };
};

const mustJoinChannelWarning = (_oldstate: any) => (
  _eventName: string,
  _payload: object
) =>
  console.error(
    `useChannel broadcast function cannot be invoked before the channel has been joined`
  );

export default useChannel;
