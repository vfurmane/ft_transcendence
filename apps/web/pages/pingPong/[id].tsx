import TopBar from "../../components/TopBar";
import textStyles from "styles/text.module.scss";
import React, { useState, useRef, useEffect, useCallback } from "react";
import MiniProfil from "../../components/miniProfil";
import { useRouter } from "next/router";
import Game from "../../helpers/pong";
import { Game as GameEntity, GameEntityFront, Userfront as User } from "types";
import PlayButton from "../../components/HomePage/PlayButton";
import Link from "next/link";
import playButtonStyles from "styles/playButton.module.scss";
import PlayMenu from "../../components/HomePage/PlayMenu";
import Image from "next/image";
import styles from "styles/pingPong.module.scss";
import { useSelector } from "react-redux";
import { selectUserState } from "../../store/UserSlice";
import { useWebsocketContext } from "../../components/Websocket";
import { current } from "@reduxjs/toolkit";

export default function PingPong(): JSX.Element {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const usersRef = useRef<User[]>([]);
  const canvasRef = useRef(null);
  const [intervalState, setIntervalState] = useState<NodeJS.Timer | null>(null);
  const [MiniProfilArray, setMiniProfilArray] = useState<JSX.Element[]>([]);
  const [classement, setClassement] = useState<JSX.Element[]>([]);
  const [openPlayButton, setOpenPlayButton] = useState(false);
  const openPlayMenuRef = useRef(openPlayButton);
  const [openOverlay, setOpenOverlay] = useState(false);
  const [win, setWin] = useState(false);
  const [endGame, setEndGame] = useState(false);
  const [printButton, setPrintButton] = useState(true);
  const [game, setGame] = useState<Game | null>(null);

  /*======for close topBar component when click on screen====*/
  const [openToggle, setOpenToggle] = useState(false);
  const [openProfil, setOpenProfil] = useState(false);
  const [openUserList, setOpenUserList] = useState(false);
  const [indexOfUser, setIndexOfUser] = useState(-1);
  const prevIndexOfUserRef = useRef(-1);
  const prevSetterUsermenuRef =
    useRef<React.Dispatch<React.SetStateAction<boolean>>>();
  /*===========================================================*/

  const UserState = useSelector(selectUserState);
  const websockets = useWebsocketContext();

  websockets.pong?.on("endGame", () => {
    //if (!Game.isSolo)
    setEndGame(true);
  });

  function rotate(users: User[]) {
    const lastIndex = users.length - 1;
    const i = 6;
    while (users[0].id !== UserState.id) {
      const last = users[lastIndex];
      users.unshift(last);
      users.pop();
    }
    return users;
  }

  const changeLife = useCallback((index: number, val: number) => {
    let tmp = [...MiniProfilArray];
    if (val === 0) {
      if (intervalState) clearInterval(intervalState);
      const temp = [...users];
      const newClassement = [
        createTrClassement(temp[index], classement),
        ...classement,
      ];
      if (newClassement.length <= usersRef.current.length)
        setClassement(newClassement);
      if (users.length > 2 && temp[index].id === UserState.id)
        setOpenOverlay(true);
      temp.splice(index, 1);
      tmp.splice(index, 1);
      if (temp.length === 1) {
        if (temp[0].id === UserState.id) setWin(true);
        if (newClassement.length + 1 <= usersRef.current.length)
          setClassement([
            createTrClassement(temp[0], newClassement),
            ...newClassement,
          ]);
        setPrintButton(true);
        setUsers(temp);
        return;
      }
      const tmpp: JSX.Element[] = [];
      for (let i = 0; i < tmp.length; i++)
        tmpp.push(
          <MiniProfil
            key={index}
            left={i % 2 == 0 ? true : false}
            user={{ user: temp[i], index: i }}
            life={tmp[i]?.props.life}
            score={tmp[i]?.props.score}
            game={{
              life: Game.live,
              score: Game.scoreMax,
              numOfPlayers: tmp.length,
            }}
          />
        );
      tmp = tmpp;
      setGame(
        new Game(
          temp.length,
          users.findIndex((e) => e.id === UserState.id),
          changeLife
        )
      );
      setUsers(temp);
      setMiniProfilArray(tmp);
    } else if (tmp[index]?.props.life !== val) {
      tmp[index] = (
        <MiniProfil
          key={index}
          left={index % 2 == 0 ? true : false}
          user={{ user: users[index], index: index }}
          life={val}
          score={tmp[index]?.props.score}
          game={{
            life: Game.live,
            score: Game.scoreMax,
            numOfPlayers: tmp.length,
          }}
        />
      );
      if (users.length === 2) {
        index = index ? 0 : 1;
        tmp[index] = (
          <MiniProfil
            key={index}
            left={index % 2 == 0 ? true : false}
            user={{ user: users[index], index: index }}
            life={tmp[index]?.props.life}
            score={tmp[index]?.props.score + 1}
            game={{
              life: Game.live,
              score: Game.scoreMax,
              numOfPlayers: tmp.length,
            }}
          />
        );
      }
      setMiniProfilArray(tmp);
    }
  }, []);

  useEffect(() => {
    if (websockets.pong) {
      websockets.pong.emit(
        "subscribe_game",
        { id: router.query.id },
        (game: GameEntityFront) => {
          setPrintButton(false);
          const tmp = game.opponents.map((opponent) => opponent.user);
          console.log(tmp);
          //tmp = rotate(tmp);
          setUsers(tmp);
          usersRef.current = tmp;
          setMiniProfilArray(
            tmp.map((e: User, i: number) => (
              <MiniProfil
                key={i}
                left={i % 2 == 0 ? true : false}
                user={{ user: e, index: i }}
                life={Game.live}
                score={0}
                game={{
                  life: Game.live,
                  score: Game.scoreMax,
                  numOfPlayers: tmp.length,
                }}
              />
            ))
          );
        }
      );
    }

    return () => {
      if (websockets.pong) {
        websockets.pong.emit("unsubscribe_game");
      }
    };
  }, [websockets.pong, router.query.id]);

  useEffect(() => {
    if (typeof router.query.id !== "string") setUsers([UserState]);
    window.addEventListener(
      "keydown",
      function (e) {
        if (
          ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(
            e.code
          ) > -1
        ) {
          e.preventDefault();
        }
      },
      false
    );
  }, []);

  useEffect(() => {
    if (users.length === 0) return;
    setGame(
      new Game(
        Number(users.length),
        Number(users.findIndex((user) => user.id === UserState.id)),
        changeLife
      )
    );
  }, [UserState.id, users, changeLife]);

  useEffect(() => {
    if (canvasRef && users.length > 1) {
      if (websockets.pong?.connected && users.length > 1) {
        game?.setWebsocket(websockets.pong);
        game?.init(canvasRef);
        if (game) setIntervalState(setInterval(handleResize, 17, game));
        websockets.pong.emit("ready");
      }
    }
    return (): void => {
      if (intervalState) clearInterval(intervalState);
    };
  }, [users, game]);

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
  /*==========================================================*/

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
    if (openPlayButton) setOpenPlayButton(false);

    if (openOverlay && openPlayMenuRef.current === openPlayButton)
      setOpenOverlay(false);
  }

  function handleResize(game: Game) {
    game.updateGame();
  }

  function createTrClassement(user: User, classement: JSX.Element[]) {
    if (!user) return <></>;
    return (
      <tr key={user.id}>
        <td>
          <div style={{ display: "flex" }}>
            <div className="fill small">
              <Image
                alt="avatar"
                src={`/avatar/avatar-${user.avatar_num}.png`}
                width={47}
                height={47}
              />
            </div>
            {user.name}
          </div>
        </td>
        <td>{usersRef.current.length - classement.length}</td>
      </tr>
    );
  }

  function handleClickPlayButton(): void {
    openPlayMenuRef.current = !openPlayButton;
    setOpenPlayButton(!openPlayButton);
  }

  function newPartie() {
    console.log("click");
    setUsers([UserState]);
    setEndGame(false);
    setMiniProfilArray([]);
    setPrintButton(true);
  }

  const buttons = (
    <div className={styles.buttons}>
      <Link href={"/home"} className={styles.link}>
        <PlayButton
          open={false}
          style={{
            text: openPlayButton ? "" : "HOME",
            small: true,
            color: false,
          }}
        />
      </Link>
      {openOverlay ? (
        <div>
          <PlayButton
            open={false}
            style={{
              text: openPlayButton ? "" : "continu to WATCH",
              small: true,
              color: false,
            }}
          />
        </div>
      ) : (
        <></>
      )}
      <Link href={""} className={styles.link}>
        <PlayButton
          handleClick={handleClickPlayButton}
          open={openPlayButton}
          style={{
            text: openPlayButton ? "" : "PLAY AGAIN",
            small: true,
            color: true,
          }}
        />
      </Link>
      {openPlayButton ? (
        <div
          className="col-10 offset-1 offset-xl-0 offset-lg-1 col-lg-3 offset-xl-1 "
          style={{ width: "80%" }}
        >
          <div className={`${playButtonStyles.playMenuContainer} d-block `}>
            <PlayMenu click={() => newPartie()} />
          </div>
        </div>
      ) : (
        <></>
      )}
    </div>
  );

  return (
    <div onClick={() => close()} style={{ width: "100vw", height: "100vh" }}>
      {openOverlay ? (
        <div className="overlay">
          <h1 className={textStyles.saira} style={{ color: "white" }}>
            You LOose !
          </h1>
          {buttons}
        </div>
      ) : (
        <></>
      )}
      <TopBar
        openProfil={openProfil}
        openToggle={openToggle}
        openUserList={openUserList}
        clickTopBarProfil={clickTopBarProfil}
        clickTopBarToggle={clickTopBarToggle}
        writeSearchTopBar={writeSearchTopBar}
        handleClickUserMenu={handleClickUserMenu}
      />
      {!endGame ? (
        <div>
          {MiniProfilArray}

          <div className={`containerScrollHorizon midle`}>
            <span className={`textScroll ${textStyles.pixel}`}>
              - Pong - pOnG - poNg - PONG - pOng&nbsp;
            </span>
            <span className={`textScroll ${textStyles.pixel}`}>
              - Pong - pOnG - poNg - PONG - pOng&nbsp;
            </span>
          </div>
          <div
            style={{
              marginTop:
                users.length > 2
                  ? "25vh"
                  : users.length === 1
                  ? "20vh"
                  : "35vh",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <canvas
              ref={canvasRef}
              style={{
                marginLeft: users.length > 2 ? "30vw" : "",
                border: "1px solid white",
              }}
            ></canvas>
          </div>
        </div>
      ) : (
        <div className={styles.afterGameContainer}>
          <h1 className={textStyles.saira + " " + styles.title}>
            You {win ? "Win" : "LOose"} !
          </h1>
          <div className={styles.tableContainer}>
            <table>
              <thead>
                <tr>
                  <th>name</th>
                  <th>classement</th>
                </tr>
              </thead>
              <tbody>{classement}</tbody>
            </table>
          </div>
        </div>
      )}
      {printButton ? (
        <div style={{ display: "flex", justifyContent: "center" }}>
          {buttons}
        </div>
      ) : (
        <></>
      )}
    </div>
  );
}