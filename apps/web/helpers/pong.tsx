import {
  GameState,
  PlayerInterface,
  Form,
  Vector,
  Point,
  Entity,
  Wall,
  Board,
  ServerCanvas,
} from "types";
import React from "react";
import { Socket } from "socket.io-client";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

class Game {
  public static isSolo = false;
  public boardType = Form.REC;
  public boardCanvasRef!: React.RefObject<HTMLCanvasElement>;
  public ballWidth!: number;
  public boardCanvas!: HTMLCanvasElement;
  public boardContext!: CanvasRenderingContext2D;
  public board!: Board;
  public static ballSpeed = 3;
  public static racketSpeed = 2;
  public countUpdate = 0;
  public static point = 0;
  public static live = 10;
  public ball!: Ball;
  public saveBall!: { ball: Ball; count: number };
  public player: Racket[] = [];
  public cible!: Target;
  public static keyPressed = { up: false, down: false };
  public start = Date.now();
  public lastUpdate = 0;
  public color: string[] = ["blue", "red", "orange", "white", "pink", "cyan"];
  public static position: number;
  public static scoreMax = 10;
  public static changeLife: (
    index: number,
    val: number,
    length: number
  ) => void;
  public static socket: Socket<DefaultEventsMap, DefaultEventsMap>;
  public static count: number;
  public await = true;

  constructor(
    number_player: number | undefined,
    position: number | undefined,
    changeLife: (index: number, val: number, length: number) => void
  ) {
    if (number_player) {
      this.boardType = number_player;
      Game.isSolo = false;
    } else {
      this.boardType = Form.REC;
      Game.isSolo = true;
    }
    if (position) {
      Game.position = position;
    } else {
      Game.position = 0;
    }
    Game.changeLife = changeLife;
  }

  setWebsocket(socket: Socket<DefaultEventsMap, DefaultEventsMap>): void {
    Game.socket = socket;
    Game.socket.emit("ready");
  }

  createRegularPolygon(point: Point, side: number, n: number): Point[] {
    const points: Point[] = [];
    const angle = -(360 - ((n - 2) * 180) / n) * (Math.PI / 180);
    points[0] = new Point(point.x, point.y);
    const vector = point.vectorTo(new Point(points[0].x, points[0].y - side));
    for (let i = 0; i < n - 1; i++) {
      points[i + 1] = new Point(points[i].x, points[i].y);
      [vector.x, vector.y] = [
        -(vector.x * Math.cos(angle) + vector.y * Math.sin(angle)),
        vector.x * Math.sin(angle) - vector.y * Math.cos(angle),
      ];
      points[i + 1].x += vector.x;
      points[i + 1].y += vector.y;
    }
    return points;
  }

  convertStateServer(state: GameState): GameState {
    const ratiox = this.boardCanvas.width / ServerCanvas.width;
    const ratioy = this.boardCanvas.height / ServerCanvas.height;
    const newState: GameState = {
      numberPlayer: state.numberPlayer,
      players: [],
      ball: {
        point: new Point(
          state.ball.point.x * ratiox,
          state.ball.point.y * ratioy
        ),
        dir: state.ball.dir,
      },
    };
    state.players.forEach((player) => {
      newState.players.push({
        point: new Point(player.point.x * ratiox, player.point.y * ratioy),
        dir: player.dir,
        hp: player.hp,
      });
    });
    return newState;
  }

  convertStateClient(state: GameState): GameState {
    const ratiox = (window.innerWidth * 0.6) / this.boardCanvas!.width;
    const ratioy =
      (window.innerWidth * 0.6 * (1 / 2)) / this.boardCanvas!.height;
    const newState: GameState = {
      numberPlayer: state.numberPlayer,
      players: [],
      ball: {
        point: new Point(
          state.ball.point.x * ratiox,
          state.ball.point.y * ratioy
        ),
        dir: state.ball.dir,
      },
    };
    state.players.forEach((player) => {
      newState.players.push({
        point: new Point(player.point.x * ratiox, player.point.y * ratioy),
        dir: player.dir,
        hp: player.hp,
      });
    });
    return newState;
  }

  refreshServer(state: GameState): void {
    if (!this.boardType) {
      return;
    }
    if (state.numberPlayer !== this.boardType) {
      this.boardType = state.numberPlayer;
      this.player = [];
      this.init(this.boardCanvasRef);
    }
    state = this.convertStateServer(state);
    if (this.boardType == Form.REC) {
      this.player = this.updatePlayer(state.players, [
        this.board.wall[0],
        this.board.wall[2],
      ]);
      this.ball = new Ball(
        this.createRect(
          state.ball.point.x,
          state.ball.point.y,
          this.ballWidth,
          this.ballWidth
        ),
        this.player,
        this.board.wall
      );
    } else {
      this.player = this.updatePlayer(state.players, this.board.wall);
      this.ball = new Ball(
        this.createRegularPolygon(
          new Point(state.ball.point.x, state.ball.point.y),
          this.ballWidth,
          this.boardType
        ),
        this.player,
        this.board.wall
      );
    }
    const exBallSpeed = new Vector(
      state.ball.dir.x,
      state.ball.dir.y
    ).normalized();
    if (this.boardType === Form.REC)
      this.ball.defaultSpeed =
        Game.ballSpeed * (this.boardCanvas.width / ServerCanvas.width);
    else {
      this.ball.defaultSpeed =
        (Game.ballSpeed / 2) * (this.boardCanvas.width / ServerCanvas.width);
    }
    this.ball.speed = new Vector(
      exBallSpeed.x * this.ball.defaultSpeed,
      exBallSpeed.y * this.ball.defaultSpeed
    );
    this.player.forEach((p) => {
      const exPlayerSpeed = p.speed.normalized();
      p.defaultSpeed =
        Game.racketSpeed * (this.boardCanvas.width / ServerCanvas.width);
      p.speed = new Vector(
        exPlayerSpeed.x * p.defaultSpeed,
        exPlayerSpeed.y * p.defaultSpeed
      );
    });
    this.ball.calcNextCollision(this.player, this.board.wall, null, null);
  }

  refreshClient(state: GameState): void {
    if (!this.boardType) {
      return;
    }
    state = this.convertStateClient(state);
    if (this.boardType == Form.REC) {
      this.player = this.updatePlayer(state.players, [
        this.board.wall[0],
        this.board.wall[2],
      ]);
      this.ball = new Ball(
        this.createRect(
          state.ball.point.x,
          state.ball.point.y,
          this.ballWidth,
          this.ballWidth
        ),
        this.player,
        this.board.wall
      );
      if (Game.isSolo) {
        this.cible = new Target(
          this.createRect(
            (this.cible.point[0].x * (window.innerWidth * 0.6)) /
              this.boardCanvas!.width,
            (this.cible.point[0].y * (window.innerWidth * 0.6 * (1 / 2))) /
              this.boardCanvas!.height,
            this.ballWidth * 5,
            this.ballWidth * 5
          )
        );
      }
    } else {
      this.player = this.updatePlayer(state.players, this.board.wall);
      this.ball = new Ball(
        this.createRegularPolygon(
          new Point(state.ball.point.x, state.ball.point.y),
          this.ballWidth,
          this.boardType
        ),
        this.player,
        this.board.wall
      );
    }
    const speed = new Vector(state.ball.dir.x, state.ball.dir.y).normalized();
    if (this.boardType === Form.REC)
      this.ball.defaultSpeed =
        Game.ballSpeed * (this.boardCanvas.width / ServerCanvas.width);
    else {
      this.ball.defaultSpeed =
        (Game.ballSpeed / 2) * (this.boardCanvas.width / ServerCanvas.width);
    }
    this.ball.speed = new Vector(
      speed.x * this.ball.defaultSpeed,
      speed.y * this.ball.defaultSpeed
    );
    this.player.forEach((p) => {
      const exPlayerSpeed = p.speed.normalized();
      p.defaultSpeed =
        Game.racketSpeed * (this.boardCanvas.width / ServerCanvas.width);
      p.speed = new Vector(
        exPlayerSpeed.x * p.defaultSpeed,
        exPlayerSpeed.y * p.defaultSpeed
      );
    });
    this.ball.calcNextCollision(this.player, this.board.wall, null, null);
  }

  updatePlayer(player: PlayerInterface[], wall: Wall[]): Racket[] {
    this.ballWidth = this.board.wallSize * 0.00625;
    if (Game.isSolo) {
      const wallDir = wall[0].point[0].vectorTo(wall[0].point[2]).normalized();
      const wallPerp = wallDir.perp().normalized();
      const racketCenter = player[0].point;
      const p3 = new Point(
        racketCenter.x - wallDir.x * (this.board.wallSize * 0.05),
        racketCenter.y - wallDir.y * (this.board.wallSize * 0.05)
      );
      const p0 = new Point(
        racketCenter.x + wallDir.x * (this.board.wallSize * 0.05),
        racketCenter.y + wallDir.y * (this.board.wallSize * 0.05)
      );
      const p1 = new Point(
        p0.x + wallPerp.x * this.ballWidth,
        p0.y + wallPerp.y * this.ballWidth
      );
      const p2 = new Point(
        p3.x + wallPerp.x * this.ballWidth,
        p3.y + wallPerp.y * this.ballWidth
      );
      return [new Racket(0, [p0, p1, p2, p3], this.color[0])];
    } else {
      const racket: Racket[] = [];
      for (let i = 0; i < wall.length; i++) {
        const wallDir = wall[i].point[0]
          .vectorTo(wall[i].point[2])
          .normalized();
        const wallPerp = wallDir.perp().normalized();
        const racketCenter = player[i].point;
        const p3 = new Point(
          racketCenter.x - wallDir.x * (this.board.wallSize * 0.05),
          racketCenter.y - wallDir.y * (this.board.wallSize * 0.05)
        );
        const p0 = new Point(
          racketCenter.x + wallDir.x * (this.board.wallSize * 0.05),
          racketCenter.y + wallDir.y * (this.board.wallSize * 0.05)
        );
        const p1 = new Point(
          p0.x + wallPerp.x * this.ballWidth,
          p0.y + wallPerp.y * this.ballWidth
        );
        const p2 = new Point(
          p3.x + wallPerp.x * this.ballWidth,
          p3.y + wallPerp.y * this.ballWidth
        );
        if (this.player[i] === undefined)
          racket.push(new Racket(i, [p0, p1, p2, p3], this.color[i]));
        else racket.push(new Racket(i, [p0, p1, p2, p3], this.player[i].color));
        Game.changeLife(i, player[i].hp, wall.length);
        racket[i].hp = player[i].hp;
      }
      return racket;
    }
  }

  createRacket(wall: Wall[]): Racket[] {
    this.ballWidth = this.board.wallSize * 0.00625;
    if (Game.isSolo) {
      const wallDir = wall[0].point[0].vectorTo(wall[0].point[2]).normalized();
      const wallPerp = wallDir.perp().normalized();
      const wallCenter = wall[0].center();
      const racketCenter = new Point(
        wallCenter.x + wallPerp.x * this.ballWidth * 3,
        wallCenter.y + wallPerp.y * this.ballWidth * 3
      );
      const p3 = new Point(
        racketCenter.x - wallDir.x * (this.board.wallSize * 0.05),
        racketCenter.y - wallDir.y * (this.board.wallSize * 0.05)
      );
      const p0 = new Point(
        racketCenter.x + wallDir.x * (this.board.wallSize * 0.05),
        racketCenter.y + wallDir.y * (this.board.wallSize * 0.05)
      );
      const p1 = new Point(
        p0.x + wallPerp.x * this.ballWidth,
        p0.y + wallPerp.y * this.ballWidth
      );
      const p2 = new Point(
        p3.x + wallPerp.x * this.ballWidth,
        p3.y + wallPerp.y * this.ballWidth
      );
      return [new Racket(0, [p0, p1, p2, p3], this.color[0])];
    } else {
      const racket: Racket[] = [];
      for (let i = 0; i < wall.length; i++) {
        const wallDir = wall[i].point[0]
          .vectorTo(wall[i].point[2])
          .normalized();
        const wallPerp = wallDir.perp().normalized();
        const wallCenter = wall[i].center();
        const racketCenter = new Point(
          wallCenter.x + wallPerp.x * this.ballWidth * 3,
          wallCenter.y + wallPerp.y * this.ballWidth * 3
        );
        const p3 = new Point(
          racketCenter.x - wallDir.x * (this.board.wallSize * 0.05),
          racketCenter.y - wallDir.y * (this.board.wallSize * 0.05)
        );
        const p0 = new Point(
          racketCenter.x + wallDir.x * (this.board.wallSize * 0.05),
          racketCenter.y + wallDir.y * (this.board.wallSize * 0.05)
        );
        const p1 = new Point(
          p0.x + wallPerp.x * this.ballWidth,
          p0.y + wallPerp.y * this.ballWidth
        );
        const p2 = new Point(
          p3.x + wallPerp.x * this.ballWidth,
          p3.y + wallPerp.y * this.ballWidth
        );
        if (this.player.length === 0)
          racket.push(new Racket(i, [p0, p1, p2, p3], this.color[i]));
        else racket.push(new Racket(i, [p0, p1, p2, p3], this.player[i].color));
      }
      return racket;
    }
  }

  createRect(x: number, y: number, w: number, h: number): Point[] {
    const point: Point[] = [];
    point[0] = new Point(x, y);
    point[1] = new Point(x + w, y);
    point[2] = new Point(x + w, y + h);
    point[3] = new Point(x, y + h);
    return point;
  }

  init(ref: React.RefObject<HTMLCanvasElement> | undefined): void {
    if (ref === undefined) return;
    this.boardCanvasRef = ref;
    if (!this.boardCanvasRef.current) {
      return;
    }
    this.boardCanvas = this.boardCanvasRef.current;
    if (!this.boardCanvas) return;

    const context = this.boardCanvas.getContext("2d");
    if (!context) return;
    this.boardContext = context;
    this.boardCanvas.width = Math.round(window.innerWidth * 0.6);
    this.boardCanvas.height = Math.round(window.innerWidth * 0.6 * (1 / 2));
    this.board = new Board(this.boardType, this.boardCanvas);
    this.ballWidth = this.board.wallSize * 0.00625;
    if (this.boardType !== Form.REC) {
      this.player = this.createRacket(this.board.wall);
      this.ball = new Ball(
        this.createRegularPolygon(
          this.board.board.center(),
          this.ballWidth,
          this.boardType
        ),
        this.player,
        this.board.wall
      );
    } else {
      this.player = this.createRacket([this.board.wall[0], this.board.wall[2]]);
      this.ball = new Ball(
        this.createRect(
          this.board.board.center().x,
          this.board.board.center().y,
          this.ballWidth,
          this.ballWidth
        ),
        this.player,
        this.board.wall
      );
    }
    if (this.boardType === Form.REC)
      this.ball.defaultSpeed =
        Game.ballSpeed * (this.boardCanvas.width / ServerCanvas.width);
    else {
      this.ball.defaultSpeed =
        (Game.ballSpeed / 2) * (this.boardCanvas.width / ServerCanvas.width);
    }
    const dir = this.ball.speed.normalized();
    this.ball.speed = new Vector(
      dir.x * this.ball.defaultSpeed,
      dir.y * this.ball.defaultSpeed
    );
    this.player.forEach((p) => {
      const exPlayerSpeed = p.speed.normalized();
      p.defaultSpeed =
        Game.racketSpeed * (this.boardCanvas.width / ServerCanvas.width);
      p.speed = new Vector(
        exPlayerSpeed.x * p.defaultSpeed,
        exPlayerSpeed.y * p.defaultSpeed
      );
    });
    if (Game.isSolo) {
      this.cible = new Target(
        this.createRect(
          this.boardCanvas.width * (2 / 3),
          this.boardCanvas.height / 2,
          this.ballWidth * 5,
          this.ballWidth * 5
        )
      );
      this.saveBall = {
        ball: new Ball(this.ball.copy(), this.player, this.board.wall),
        count: 0,
      };
    }

    window.addEventListener("keydown", function (e) {
      if (e.key === "ArrowUp") {
        if (!Game.isSolo) {
          if (Game.keyPressed.down === false) {
            Game.socket.emit("pressUp");
          } else {
            Game.socket.emit("unpressDown");
          }
        }
        Game.keyPressed.up = true;
      } else if (e.key === "ArrowDown") {
        if (!Game.isSolo) {
          if (Game.keyPressed.up === false) {
            Game.socket.emit("pressDown");
          } else {
            Game.socket.emit("unpressUp");
          }
        }
        Game.keyPressed.down = true;
      }
    });

    window.addEventListener("keyup", function (e) {
      if (e.key === "ArrowUp") {
        if (!Game.isSolo) {
          if (Game.keyPressed.down === false) {
            Game.socket.emit("unpressUp");
          } else {
            Game.socket.emit("pressDown");
          }
        }
        Game.keyPressed.up = false;
      } else if (e.key === "ArrowDown") {
        if (!Game.isSolo) {
          if (Game.keyPressed.up === false) {
            Game.socket.emit("unpressDown");
          } else {
            Game.socket.emit("pressUp");
          }
        }
        Game.keyPressed.down = false;
      }
    });

    if (!Game.isSolo) {
      Game.socket.on("refresh", (state: GameState, time: number) => {
        this.await = false;
        Game.count = 0;
        if (!this.board) {
          return;
        }
        this.refreshServer(state);
      });
      Game.socket.on("endGame", () => {
        Game.socket.off("endGame");
        Game.socket.off("refresh");
        this.boardType = 0;
      });
    } else {
      this.await = false;
    }
  }

  getState(): GameState {
    const state: GameState = {
      numberPlayer: this.boardType,
      players: [],
      ball: {
        point: this.ball.point[0],
        dir: this.ball.speed,
      },
    };
    for (const player of this.player) {
      state.players.push({
        point: player.point[0].midSegment(player.point[3]),
        dir: player.dir,
        hp: player.hp,
      });
    }
    return state;
  }

  rescale() {
    let size = 1;
    if (this.boardType == Form.HEX || this.boardType == Form.PEN) {
      size = 0.5;
    }
    this.board.wallSize = Math.min(
      window.innerWidth * 0.6 * size,
      window.innerWidth * 0.6 * (1 / 2) * size
    );
    const state = this.getState();
    this.refreshClient(state);
    this.boardCanvas!.width = window.innerWidth * 0.6;
    this.boardCanvas!.height = window.innerWidth * 0.6 * (1 / 2);
    this.board = new Board(this.boardType, this.boardCanvas);
  }

  updateGame() {
    if (this.await) return;
    if (
      this.boardCanvas!.width !== Math.round(window.innerWidth * 0.6) ||
      this.boardCanvas!.height !== Math.round(window.innerWidth * 0.6 * (1 / 2))
    ) {
      this.rescale();
    }
    this.boardCanvas!.width = Math.round(window.innerWidth * 0.6);
    this.boardCanvas!.height = Math.round(window.innerWidth * 0.6 * (1 / 2));

    if (!this.boardType) {
      return;
    }
    this.boardContext!.fillStyle = "#666666";
    this.board.board.draw(this.boardContext, "#1e1e1e");
    this.boardContext!.font = "14px sherif";
    this.boardContext!.fillStyle = "#fff";

    // Draw the net (Line in the middle)
    if (this.player.length === 2) {
      this.boardContext!.beginPath();
      this.boardContext!.setLineDash([30, 15]);
      this.boardContext!.moveTo(
        this.boardCanvas!.width / 2,
        this.boardCanvas!.height - 20
      );
      this.boardContext!.lineTo(this.boardCanvas!.width / 2, 20);
      this.boardContext!.lineWidth = 2;
      this.boardContext!.strokeStyle = "#ffffff";
      this.boardContext!.stroke();
      this.boardContext!.setLineDash([0, 0]);
      this.boardContext!.lineWidth = 1;
    }

    if (Game.isSolo) {
      if (
        this.ball.nextCollision.wall &&
        this.ball.nextCollision.wall <= 2 &&
        this.saveBall &&
        !this.saveBall.count
      ) {
        this.saveBall = {
          ball: new Ball(this.ball.copy(), this.player, this.board.wall),
          count: 1,
        };
        this.saveBall.ball.speed = new Vector(
          -this.ball.speed.x,
          -this.ball.speed.y
        );
      }
      if (this.saveBall && this.saveBall.count) {
        this.saveBall.count++;
      }
      if (this.saveBall && this.saveBall.count === 10) {
        if (
          this.ball.point[0].x < 0 ||
          this.ball.point[0].y < 0 ||
          this.ball.point[0].x > this.board.wall[2].point[0].x ||
          this.ball.point[0].y > this.board.wall[3].point[0].y
        ) {
          this.ball = this.saveBall.ball;
        }
        this.saveBall.count = 0;
      }
    }

    this.countUpdate++;
    const timeRatio = (Date.now() - this.start - this.lastUpdate) / 17;
    this.player.forEach((player) => player.update(this.board.wall, timeRatio));
    this.ball.update(this.player, this.board.wall, this.board, timeRatio);
    if (Game.isSolo)
      this.ball.calcNextCollision(this.player, this.board.wall, null, null);
    if (Game.isSolo && this.cible)
      this.cible.update(this.ball, this.boardCanvas);
    this.board.wall.forEach((wall) => {
      wall.draw(this.boardContext, undefined);
    });
    this.ball.draw(this.boardContext, "green");
    for (const p of this.player) {
      p.draw(this.boardContext, p.color);
    }
    if (Game.isSolo && this.cible) this.cible.draw(this.boardContext);
    if (Game.live === 0) {
      Game.point = 0;
      Game.live = 11;
      this.start = Date.now();
    }
    this.lastUpdate = Date.now() - this.start;
    this.boardContext.setTransform(1, 0, 0, 1, 0, 0);
  }
}

class Target extends Entity {
  constructor(points: Point[]) {
    super(points);
  }

  draw(context: CanvasRenderingContext2D): void {
    context.beginPath();
    context.moveTo(this.getx(), this.gety());
    for (const point of this.point) {
      context.lineTo(point.x, point.y);
    }
    context.closePath();
    context.strokeStyle = "red";
    context.stroke();
    context.fillStyle = "red";
    context.fill();
  }

  randomVal(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  update(ball: Ball, canvas: HTMLCanvasElement): void {
    if (this.sat(ball)) {
      Game.point++;
      this.replaceTo(
        new Point(
          this.randomVal(canvas.width / 2, canvas.width - 30),
          this.randomVal(30, canvas.height - 30)
        )
      );
    }
  }
}

class Ball extends Entity {
  public defaultSpeed = Game.ballSpeed;
  public nextCollision: {
    wall: number | null;
    wallIndex: number;
    racket: { index: number; time: number } | null;
  } = {
    wall: 0,
    wallIndex: 0,
    racket: null,
  };

  constructor(points: Point[], player: Racket[], walls: Wall[]) {
    super(points);
    if (player.length === Form.REC) this.defaultSpeed = Game.ballSpeed;
    else {
      this.defaultSpeed = Game.ballSpeed / 2;
    }
    const dir = player[0].point[1]
      .midSegment(player[0].point[2])
      .vectorTo(player[0].point[0].midSegment(player[0].point[3]))
      .normalized();
    this.speed = new Vector(
      dir.x * this.defaultSpeed,
      dir.y * this.defaultSpeed
    );
    this.calcNextCollision(player, walls, null, null);
  }

  updateRacketCollision(rackets: Racket[], ignoreRacket: number | null) {
    this.nextCollision.racket = null;
    let face: Point;
    let facePoints: Point[];
    let ballTo: Point;
    let minRatio: number | null = null;

    rackets.forEach((racket, index) => {
      if (ignoreRacket === null || ignoreRacket !== index) {
        if (rackets.length != 2) {
          face = this.getFace(index);
          facePoints = this.getFacePoints(index);
        } else {
          if (index) {
            face = this.getFace(2);
            facePoints = this.getFacePoints(2);
          } else {
            face = this.getFace(0);
            facePoints = this.getFacePoints(0);
          }
        }
        ballTo = new Point(
          this.speed.x + facePoints[0].x,
          this.speed.y + facePoints[0].y
        );
        const intersect1 = racket.point[2].intersect(
          racket.point[1],
          facePoints[0],
          ballTo
        );
        ballTo = new Point(
          this.speed.x + facePoints[1].x,
          this.speed.y + facePoints[1].y
        );
        const intersect2 = racket.point[2].intersect(
          racket.point[1],
          facePoints[1],
          ballTo
        );
        if (
          (intersect1 > 0 && intersect1 < 1) ||
          (intersect2 > 0 && intersect2 < 1)
        ) {
          ballTo = new Point(this.speed.x + face.x, this.speed.y + face.y);
          const ratio = face.intersect(
            ballTo,
            racket.point[2],
            racket.point[1]
          );
          if (ratio > 0) {
            if (minRatio === null || ratio < minRatio) {
              minRatio = ratio;
              this.nextCollision.racket = { index: index, time: minRatio };
            }
          }
        }
      }
    });
  }

  calcNextCollision(
    rackets: Racket[],
    walls: Wall[],
    ignoreWall: number | null,
    ignoreRacket: number | null
  ): void {
    let face: Point;
    let ballTo: Point;
    let minRatio: number | null = null;

    this.updateRacketCollision(rackets, ignoreRacket);
    walls.forEach((wall, index) => {
      if (ignoreWall === null || index !== ignoreWall) {
        face = this.getFace(index);
        ballTo = new Point(this.speed.x + face.x, this.speed.y + face.y);
        const ratio = face.intersect(ballTo, wall.point[2], wall.point[1]);
        if (ratio > 0) {
          minRatio ??= ratio;
          if (ratio <= minRatio) {
            minRatio = ratio;
            this.nextCollision.wallIndex = index;
          }
        }
      }
    });
    if (minRatio) this.nextCollision.wall = minRatio;
    else this.nextCollision.wall = null;
  }

  isParallel(from1: Point, to1: Point, from2: Point, to2: Point): number {
    const v1 = from1.vectorTo(to1);
    const v2 = from2.vectorTo(to2);
    return v1.crossProduct(v2);
  }

  getFace(n: number): Point {
    if (n) {
      return this.point[n - 1].midSegment(this.point[n]);
    }
    return this.point[this.point.length - 1].midSegment(this.point[0]);
  }

  getFacePoints(n: number): Point[] {
    if (n) {
      return [this.point[n - 1], this.point[n]];
    }
    return [this.point[this.point.length - 1], this.point[0]];
  }

  copy() {
    const lst = [];
    for (const point of this.point) {
      lst.push(new Point(point.x, point.y));
    }
    return lst;
  }

  goToRandomPlayer(player: Racket[]): void {
    const random = Math.floor(Math.random() * 10000) % player.length;
    const dir = player[random].point[1]
      .midSegment(player[random].point[2])
      .vectorTo(player[random].point[0].midSegment(player[random].point[3]))
      .normalized();
    this.speed = new Vector(
      dir.x * this.defaultSpeed,
      dir.y * this.defaultSpeed
    );
  }

  update(
    rackets: Racket[],
    walls: Wall[],
    board: Board,
    timeRatio: number
  ): void {
    if (this.nextCollision.wall) this.nextCollision.wall -= 1 * timeRatio;
    if (this.nextCollision.racket)
      this.nextCollision.racket.time -= 1 * timeRatio;
    if (
      this.nextCollision.racket &&
      ((this.nextCollision.wall &&
        this.nextCollision.wall > this.nextCollision.racket.time) ||
        !this.nextCollision.wall) &&
      this.nextCollision.racket.time <= 0.0
    ) {
      const racket = rackets[this.nextCollision.racket.index];
      let angle = 0;
      let face;
      const index = this.nextCollision.racket.index;
      if (rackets.length != 2) face = this.getFace(index);
      else {
        face = index === 1 ? this.getFace(2) : this.getFace(0);
      }
      let ratio = racket.point[2].intersect(
        racket.point[1],
        this.center(),
        face
      );
      if (ratio > 1) ratio = 1;
      if (ratio < 0) ratio = 0;
      angle = -(Math.PI / 4 + (Math.PI / 2) * (1 - ratio));
      const norm = racket.point[2].vectorTo(racket.point[1]).normalized();
      [norm.x, norm.y] = [
        norm.x * Math.cos(angle) + norm.y * Math.sin(angle),
        -(norm.x * Math.sin(angle)) + norm.y * Math.cos(angle),
      ];
      this.speed = new Vector(
        norm.x * this.defaultSpeed,
        norm.y * this.defaultSpeed
      );
      const currentTime = this.nextCollision.racket.time;
      this.calcNextCollision(rackets, walls, null, index);
      if (this.nextCollision.racket)
        this.nextCollision.racket.time += currentTime;
      if (this.nextCollision.wall) this.nextCollision.wall += currentTime;
      this.moveTo(this.speed, -currentTime);
      if (
        (this.nextCollision.racket && this.nextCollision.racket.time <= 0) ||
        (this.nextCollision.wall && this.nextCollision.wall <= 0)
      )
        this.update(rackets, walls, board, 0);
      return;
    }
    if (this.nextCollision.wall && this.nextCollision.wall <= 0.0) {
      const prevTime = this.nextCollision.wall;
      const wall = walls[this.nextCollision.wallIndex];
      const wallVector = wall.point[0].vectorTo(wall.point[2]).normalized();
      const tmp = new Vector(this.speed.x, this.speed.y);
      if (Math.abs(wallVector.x) >= 0.9) {
        [tmp.x, tmp.y] = [tmp.x, -tmp.y];
      } else if (Math.abs(wallVector.y) >= 0.9) {
        [tmp.x, tmp.y] = [-tmp.x, tmp.y];
      }
      this.speed = tmp;
      const index = this.nextCollision.wallIndex;
      if (Game.isSolo) {
        if (index === 0) {
          this.replaceTo(board.board.center());
          this.goToRandomPlayer(rackets);
          this.calcNextCollision(rackets, walls, null, null);
        } else {
          this.calcNextCollision(rackets, walls, index, null);
          if (this.nextCollision.racket)
            this.nextCollision.racket.time += prevTime;
          if (this.nextCollision.wall) this.nextCollision.wall += prevTime;
          this.moveTo(this.speed, -prevTime);
          if (
            (this.nextCollision.racket &&
              this.nextCollision.racket.time <= 0.0) ||
            (this.nextCollision.wall && this.nextCollision.wall <= 0.0)
          )
            this.update(rackets, walls, board, 0);
        }
        return;
      }
      if (rackets.length === 2) {
        if (index === 2) {
          rackets[1].hp--;
          this.replaceTo(board.board.center());
          this.goToRandomPlayer(rackets);
          this.calcNextCollision(rackets, walls, null, null);
        } else if (index === 0) {
          rackets[0].hp--;
          this.replaceTo(board.board.center());
          this.goToRandomPlayer(rackets);
          this.calcNextCollision(rackets, walls, null, null);
        } else {
          this.calcNextCollision(rackets, walls, index, null);
          if (this.nextCollision.racket)
            this.nextCollision.racket.time += prevTime;
          if (this.nextCollision.wall) this.nextCollision.wall += prevTime;
          this.moveTo(this.speed, -prevTime);
          if (
            (this.nextCollision.racket &&
              this.nextCollision.racket.time <= 0.0) ||
            (this.nextCollision.wall && this.nextCollision.wall <= 0.0)
          )
            this.update(rackets, walls, board, 0);
        }
      } else {
        rackets[index].hp--;
        this.replaceTo(board.board.center());
        this.goToRandomPlayer(rackets);
        this.calcNextCollision(rackets, walls, null, null);
      }
      return;
    }
    this.moveTo(this.speed, timeRatio);
  }
}

class Racket extends Entity {
  public defaultSpeed = Game.racketSpeed;
  public hp = 10;
  public dir!: Vector;

  constructor(public index: number, points: Point[], public color: string) {
    super(points);
    this.dir = this.point[2].vectorTo(this.point[1]).normalized();
    this.speed = new Vector(
      this.dir.x * this.defaultSpeed,
      this.dir.y * this.defaultSpeed
    );
  }

  update(walls: Wall[], timeRatio: number): void {
    if (this.index == Game.position) {
      if (Game.keyPressed.up && Game.keyPressed.down) {
      } else if (Game.keyPressed.up) {
        this.speed = new Vector(
          this.dir.x * this.defaultSpeed,
          this.dir.y * this.defaultSpeed
        );
        this.moveTo(this.speed, timeRatio);
      } else if (Game.keyPressed.down) {
        this.speed = new Vector(
          -this.dir.x * this.defaultSpeed,
          -this.dir.y * this.defaultSpeed
        );
        this.moveTo(this.speed, timeRatio);
      }
    }
    for (const wall of walls) {
      if (this.sat(wall)) {
        this.moveTo(new Vector(-this.speed.x, -this.speed.y), timeRatio);
      }
    }
  }
}

export default Game;
