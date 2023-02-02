import {
  createContext,
  ReactElement,
  useContext,
  useEffect,
  useState,
} from "react";
import { useSelector } from "react-redux";
import { io, Socket } from "socket.io-client";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { selectUserState } from "../store/UserSlice";

interface WebsocketProps {
  children: ReactElement;
}

interface OpenedSockets {
  general: Socket<DefaultEventsMap, DefaultEventsMap> | null;
  conversations: Socket<DefaultEventsMap, DefaultEventsMap> | null;
  pong: Socket<DefaultEventsMap, DefaultEventsMap> | null;
}

const WebsocketContext = createContext<OpenedSockets>({
  general: null,
  conversations: null,
  pong: null,
});

const deregisterSocket = (
  socket: Socket<DefaultEventsMap, DefaultEventsMap>
): void => {
  socket.close();
  socket.off("connect");
  socket.off("connect_error");
  socket.off("disconnect");
};

const closeOpenSockets = (sockets: OpenedSockets): void => {
  if (sockets.general) deregisterSocket(sockets.general);
  if (sockets.conversations) deregisterSocket(sockets.conversations);
  if (sockets.pong) deregisterSocket(sockets.pong);
};
const OpenSocket = (
  namespace: string
): Socket<DefaultEventsMap, DefaultEventsMap> => {
  const newSocket = io(namespace, {
    auth: {
      token: localStorage.getItem("access_token"),
    },
  });
  newSocket.on("connect_error", () => {
    console.error(`Error while trying to connect ot socket ${namespace}`);
  });
  return newSocket;
};

export default function Websocket({ children }: WebsocketProps): JSX.Element {
  const [socketInstances, setSocketInstances] = useState<OpenedSockets>({
    general: null,
    conversations: null,
    pong: null,
  });
  const userState = useSelector(selectUserState);

  useEffect((): (() => void) => {
    if (userState.id) {
      const general = OpenSocket("/");
      const conversations = OpenSocket("/conversations");
      // const pong = OpenSocket("/pong");
      const pong = null;
      setSocketInstances({
        general: general,
        conversations: conversations,
        pong: pong,
      });
    } else {
      closeOpenSockets(socketInstances);
      setSocketInstances({ general: null, conversations: null, pong: null });
    }
    return (): void => {
      if (socketInstances) {
        closeOpenSockets(socketInstances);
        setSocketInstances({ general: null, conversations: null, pong: null });
      }
    };
  }, [userState.id]);
  return (
    <WebsocketContext.Provider value={socketInstances}>
      {children}
    </WebsocketContext.Provider>
  );
}

export const useWebsocketContext: () => OpenedSockets = () => {
  return useContext(WebsocketContext);
};