import { useRouter } from "next/router";
import {
  ReactElement,
  useEffect,
  useState,
  useRef,
  useContext,
  useCallback,
} from "react";
import { useSelector } from "react-redux";
import styles from "styles/matchmaking-page.module.scss";
import { GameMode, GameStartPayload } from "types";
import { Loading } from "../components/Loading";
import { QueueReconnectionPrompt } from "../components/QueueReconnectionPrompt";
import { useWebsocketContext } from "../components/Websocket";
import { selectMatchmakingState } from "../store/MatchmakingSlice";
import { selectUserState } from "../store/UserSlice";
import TopBar from "../components/TopBar";
import { Button } from "../components/Button";

export default function Matchmaking(): ReactElement {
  const [hasLeftQueue, setHasLeftQueue] = useState(false);
  const [isFirst, setIsFirst] = useState(false);
  const [loading, setLoading] = useState(true);
  const websockets = useWebsocketContext();
  const router = useRouter();
  const UserState = useSelector(selectUserState);
  const MatchmakingState = useSelector(selectMatchmakingState);

  /*======for close topBar component when click on screen====*/
  const [openToggle, setOpenToggle] = useState(false);
  const [openProfil, setOpenProfil] = useState(false);
  const [openUserList, setOpenUserList] = useState(false);
  const [numberOfPlayerinQueue, setNumberOfPlayerInQueue] = useState(0);
  const [indexOfUser, setIndexOfUser] = useState(-1);
  const prevIndexOfUserRef = useRef(-1);
  const prevSetterUsermenuRef =
    useRef<React.Dispatch<React.SetStateAction<boolean>>>();
  /*===========================================================*/

  useEffect(() => {
    if (!MatchmakingState.isInQueue) router.replace("/");
    else setLoading(false);
  }, [MatchmakingState.isInQueue, router]);

  useEffect(() => {
    const mode = MatchmakingState.gameMode;
    if (websockets.pong) {
      websockets.pong.on("game_start", (data: GameStartPayload) => {
        if (data.users.find((user) => user.id == UserState.id)) {
          router.replace(`/pingPong/${data.id}`);
        }
      });
      websockets.pong.on("lead", (n: number) => {
        if (!isFirst) setIsFirst(true);
        if (numberOfPlayerinQueue !== n) {
          setNumberOfPlayerInQueue(n);
        }
      });
      websockets.pong.emit("join_queue", {
        game_mode: mode,
      });
    }

    return () => {
      if (websockets.pong) {
        websockets.pong.off("game_start");
        websockets.pong.emit("leave_queue");
        setHasLeftQueue(true);
      }
    };
  }, [websockets.pong, UserState.id, router]);

  /*======for close topBar component when click on screen====*/
  function clickTopBarToggle(): void {
    setOpenToggle(!openToggle);
  }

  function clickTopBarProfil(): void {
    setOpenProfil(!openProfil);
  }

  function writeSearchTopBar(e: boolean): void {
    setOpenUserList(e);
  }

  function handleClickUserMenu(e: {
    index: number;
    openMenu: boolean;
    setOpenMenu: React.Dispatch<React.SetStateAction<boolean>>;
  }): void {
    e.setOpenMenu(true);
    if (
      prevSetterUsermenuRef.current &&
      prevSetterUsermenuRef.current !== e.setOpenMenu
    )
      prevSetterUsermenuRef.current(false);
    prevSetterUsermenuRef.current = e.setOpenMenu;
    setIndexOfUser(e.index);
    prevIndexOfUserRef.current = e.index;
  }

  function close(): void {
    if (openProfil) setOpenProfil(false);
    if (openUserList && indexOfUser === prevIndexOfUserRef.current) {
      setOpenUserList(false);
      if (prevSetterUsermenuRef.current) {
        prevSetterUsermenuRef.current(false);
        setIndexOfUser(-1);
        prevIndexOfUserRef.current = -1;
      }
    }
  }

  /*==========================================================*/

  if (loading) return <Loading></Loading>;

  function launch() {
    websockets.pong?.emit("launch");
  }

  return (
    <div onClick={close}>
      <TopBar
        openProfil={openProfil}
        openToggle={openToggle}
        openUserList={openUserList}
        clickTopBarProfil={clickTopBarProfil}
        clickTopBarToggle={clickTopBarToggle}
        writeSearchTopBar={writeSearchTopBar}
        handleClickUserMenu={handleClickUserMenu}
      />
      <div className={styles.container}>
        <h1 style={{ marginBottom: "20px" }}>Waiting for an opponent...</h1>
        {MatchmakingState.gameMode === GameMode.BATTLE_ROYALE && isFirst ? (
          <Button onClick={launch} danger>{`LAUNCH : ${
            numberOfPlayerinQueue - 1
          } player${
            numberOfPlayerinQueue - 1 > 1 ? "s" : ""
          } joined this game`}</Button>
        ) : (
          <></>
        )}
        {hasLeftQueue ? (
          <QueueReconnectionPrompt
            onReconnection={(): void => {
              setHasLeftQueue(false);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
