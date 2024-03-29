import { useRouter } from "next/router";
import {
  createContext,
  ReactElement,
  useContext,
  useEffect,
  useState,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { io, Socket } from "socket.io-client";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { Block } from "types";
import { setBlockedUsers } from "../store/BlockedUsersSlice";
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
  setTimeout(() => {
    socket.disconnect();
  }, 5000);
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
    withCredentials: true,
  });
  return newSocket;
};

export default function Websocket({ children }: WebsocketProps): JSX.Element {
  const router = useRouter();
  const [socketInstances, setSocketInstances] = useState<OpenedSockets>({
    general: null,
    conversations: null,
    pong: null,
  });
  const dispatch = useDispatch();
  const userState = useSelector(selectUserState);

  useEffect((): (() => void) => {
    if (userState.id) {
      const general =
        socketInstances.general?.connected !== true
          ? OpenSocket("/")
          : socketInstances.general;
      const conversations =
        socketInstances.conversations?.connected !== true
          ? OpenSocket("/conversations")
          : socketInstances.conversations;
      const pong =
        socketInstances.pong?.connected !== true
          ? OpenSocket("/pong")
          : socketInstances.pong;
      setSocketInstances({
        general: general,
        conversations: conversations,
        pong: pong,
      });

      conversations.emit("get_blocked_users", (blocks: Block[]) => {
        dispatch(
          setBlockedUsers(
            blocks.map((block) => {
              return block.target.id;
            })
          )
        );
      });

      pong.on("replace", (route: string) => {
        router.replace(route);
      });
    } else {
      closeOpenSockets(socketInstances);
      setSocketInstances({
        general: null,
        conversations: null,
        pong: null,
      });
    }
    return (): void => {
      closeOpenSockets(socketInstances);
      setSocketInstances({
        general: null,
        conversations: null,
        pong: null,
      });
    };
  }, [userState.id, dispatch]);
  return (
    <WebsocketContext.Provider value={socketInstances}>
      {children}
    </WebsocketContext.Provider>
  );
}

export const useWebsocketContext: () => OpenedSockets = () => {
  return useContext(WebsocketContext);
};
