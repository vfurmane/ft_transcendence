import React from "react";
import { Userfront as User } from "types";
import leaderBoardStyles from "styles/leaderBoard.module.scss";
import UserEntity from "./UserEntity";

export default function LeaderboardEntity(props: {
  user: User;
  index: number;
  handleClick: (e: {
    index: number;
    openMenu: boolean;
    setOpenMenu: React.Dispatch<React.SetStateAction<boolean>>;
  }) => void;
}): JSX.Element {
  if (typeof props.user === "undefined") return <div></div>;

  let div1: JSX.Element;
  let div2: JSX.Element;

  const color = `rgb(${234 - props.user.rank * 15}, ${
    196 - (props.user.rank - 1) * 5
  }, ${53 - (props.user.rank - 1) * 2})`;

  const style = {
    backgroundColor: color,
  };

  if (Number(props.index.toString().slice(-1)) < 5) {
    div1 = (
      <div className={leaderBoardStyles.rank} style={style}>
        {props.user.rank}
      </div>
    );
    div2 = <div className={leaderBoardStyles.level}>{props.user.level}</div>;
  } else {
    div2 = (
      <div className={leaderBoardStyles.rank} style={style}>
        {props.user.rank}
      </div>
    );
    div1 = <div className={leaderBoardStyles.level}>{props.user.level}</div>;
  }

  return (
    <div className={leaderBoardStyles.leaderBoardContainer}>
      {div1}
      <UserEntity
        small={true}
        option={{ del: false, accept: true, ask: false }}
        user={props.user}
        index={props.index}
        handleClick={props.handleClick}
        delFriendClick={(): void => {
          null;
        }}
      />
      {div2}
    </div>
  );
}
