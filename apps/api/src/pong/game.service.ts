import {
  GameState,
  Form,
  Vector,
  Point,
  Entity,
  Wall,
  Board,
  ServerCanvas,
} from 'types';

export class Game {
  public boardCanvas = ServerCanvas;
  public boardType: number = Form.REC;
  public board!: Board;
  public ballWidth!: number;
  public countUpdate = 0;
  public broadcaster: any;
  public ball!: Ball;
  public saveBall!: { ball: Ball; count: number };
  public player: Racket[] = [];
  public start = Date.now();
  public lastUpdate = 0;
  public await = true;
  public color: string[] = ['blue', 'red', 'orange', 'white', 'pink', 'black'];
  public live = 10;

  constructor(playerNumber: number, broadcaster: any) {
    this.boardType = playerNumber;
    this.broadcaster = broadcaster;
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

  movePlayer(playerPosition: number, up: boolean, keyUp: boolean): void {
    const player = this.player[playerPosition];
    player.isMoving = keyUp ? true : false;
    player.up = up;
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

  createRacket(wall: Wall[]): Racket[] {
    this.ballWidth = this.board.wallSize * 0.00625;
    const racket: Racket[] = [];
    for (let i = 0; i < wall.length; i++) {
      const wallDir = wall[i].point[0].vectorTo(wall[i].point[2]).normalized();
      const wallPerp = wallDir.perp().normalized();
      const wallCenter = wall[i].center();
      const racketCenter = new Point(
        wallCenter.x + wallPerp.x * this.ballWidth * 3,
        wallCenter.y + wallPerp.y * this.ballWidth * 3,
      );
      const p3 = new Point(
        racketCenter.x - wallDir.x * (this.board.wallSize * 0.05),
        racketCenter.y - wallDir.y * (this.board.wallSize * 0.05),
      );
      const p0 = new Point(
        racketCenter.x + wallDir.x * (this.board.wallSize * 0.05),
        racketCenter.y + wallDir.y * (this.board.wallSize * 0.05),
      );
      const p1 = new Point(
        p0.x + wallPerp.x * this.ballWidth,
        p0.y + wallPerp.y * this.ballWidth,
      );
      const p2 = new Point(
        p3.x + wallPerp.x * this.ballWidth,
        p3.y + wallPerp.y * this.ballWidth,
      );
      racket.push(new Racket(i, [p0, p1, p2, p3], this.color[i]));
    }
    return racket;
  }

  createRect(x: number, y: number, w: number, h: number): Point[] {
    const point: Point[] = [];
    point[0] = new Point(x, y);
    point[1] = new Point(x + w, y);
    point[2] = new Point(x + w, y + h);
    point[3] = new Point(x, y + h);
    return point;
  }

  init(): void {
    this.board = new Board(this.boardType, this.boardCanvas);
    if (this.boardType != Form.REC) {
      this.player = this.createRacket(this.board.wall);
      this.ball = new Ball(
        this.createRegularPolygon(
          this.board.board.center(),
          this.ballWidth,
          this.boardType,
        ),
        this.player,
        this.board.wall,
      );
    } else {
      this.player = this.createRacket([this.board.wall[0], this.board.wall[2]]);
      this.ball = new Ball(
        this.createRect(
          this.board.board.center().x,
          this.board.board.center().y,
          this.ballWidth,
          this.ballWidth,
        ),
        this.player,
        this.board.wall,
      );
      this.saveBall = {
        ball: new Ball(this.ball.copy(), this.player, this.board.wall),
        count: 0,
      };
    }
  }

  updateGame(): number {
    if (this.await) {
      return -1;
    }
    if (!this.boardType) {
      return -1;
    }
    for (const p of this.player) {
      if (p.hp == 0) {
        if (this.boardType === Form.REC) {
          this.boardType = 0;
          return -1;
        } else {
          this.player.splice(p.index, 1);
          for (let i = 0; i < this.player.length; i++) {
            if (this.player[i].index > p.index) {
              this.player[i].index--;
            }
          }
          this.boardType--;
          this.init();
          return p.index;
        }
      }
    }

    if (this.boardType === Form.REC) {
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
          -this.ball.speed.y,
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
    for (const p of this.player) {
      if (p.isMoving) {
        p.move(p.up, this.board.wall, timeRatio);
        this.broadcaster.emit('refresh', this.getState(), Date.now());
        this.ball.updateRacketCollision(this.player, null);
      }
    }
    this.ball.update(this.player, this.board.wall, this.board, timeRatio, this);
    this.lastUpdate = Date.now() - this.start;
    if (!this.saveBall?.count && !this.ball.sat(this.board.board)) {
      this.ball.replaceTo(this.board.board.center());
      this.ball.goToRandomPlayer(this.player, this);
      this.ball.calcNextCollision(this.player, this.board.wall, null, null);
    }
    return -1;
  }
}

export class Ball extends Entity {
  public defaultSpeed = 3;
  public nextCollision: {
    wall: number;
    wallIndex: number;
    racket: { index: number; time: number } | null;
  } = {
    wall: 0,
    wallIndex: 0,
    racket: null,
  };

  constructor(points: Point[], player: Racket[], walls: Wall[]) {
    super(points);
    if (player.length === Form.REC) this.defaultSpeed = 3;
    else {
      this.defaultSpeed = 1.5;
    }
    const dir = player[0].point[1]
      .midSegment(player[0].point[2])
      .vectorTo(player[0].point[0].midSegment(player[0].point[3]))
      .normalized();
    this.speed = new Vector(
      dir.x * this.defaultSpeed,
      dir.y * this.defaultSpeed,
    );
    this.calcNextCollision(player, walls, null, null);
  }

  copy() {
    const lst = [];
    for (const point of this.point) {
      lst.push(new Point(point.x, point.y));
    }
    return lst;
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
          this.speed.y + facePoints[0].y,
        );
        const intersect1 = racket.point[2].intersect(
          racket.point[1],
          facePoints[0],
          ballTo,
        );
        ballTo = new Point(
          this.speed.x + facePoints[1].x,
          this.speed.y + facePoints[1].y,
        );
        const intersect2 = racket.point[2].intersect(
          racket.point[1],
          facePoints[1],
          ballTo,
        );
        if (
          (intersect1 > 0 && intersect1 < 1) ||
          (intersect2 > 0 && intersect2 < 1)
        ) {
          ballTo = new Point(this.speed.x + face.x, this.speed.y + face.y);
          const ratio = face.intersect(
            ballTo,
            racket.point[2],
            racket.point[1],
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
    ignoreRacket: number | null,
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

  goToRandomPlayer(player: Racket[], game: Game): void {
    const random = Math.floor(Math.random() * 10000) % player.length;
    const dir = player[random].point[1]
      .midSegment(player[random].point[2])
      .vectorTo(player[random].point[0].midSegment(player[random].point[3]))
      .normalized();
    this.speed = new Vector(
      dir.x * this.defaultSpeed,
      dir.y * this.defaultSpeed,
    );
    game.broadcaster.emit('refresh', game.getState(), Date.now());
  }

  update(
    rackets: Racket[],
    walls: Wall[],
    board: Board,
    timeRatio: number,
    game: Game,
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
        face,
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
        norm.y * this.defaultSpeed,
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
        this.update(rackets, walls, board, 0, game);
      game.broadcaster.emit('refresh', game.getState(), Date.now());
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
      if (rackets.length === 2) {
        if (index === 2) {
          rackets[1].hp--;
          this.replaceTo(board.board.center());
          this.goToRandomPlayer(rackets, game);
          this.calcNextCollision(rackets, walls, null, null);
        } else if (index === 0) {
          rackets[0].hp--;
          this.replaceTo(board.board.center());
          this.goToRandomPlayer(rackets, game);
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
            this.update(rackets, walls, board, 0, game);
        }
      } else {
        rackets[index].hp--;
        this.replaceTo(board.board.center());
        this.goToRandomPlayer(rackets, game);
        this.calcNextCollision(rackets, walls, null, null);
      }
      game.broadcaster.emit('refresh', game.getState(), Date.now());
      return;
    }
    this.moveTo(this.speed, timeRatio);
  }
}

export class Racket extends Entity {
  public defaultSpeed = 2;
  public hp = 10;
  public dir!: Vector;
  public isMoving = false;
  public up = true;

  constructor(public index: number, points: Point[], public color: string) {
    super(points);
    this.dir = this.point[2].vectorTo(this.point[1]).normalized();
    this.speed = new Vector(
      this.dir.x * this.defaultSpeed,
      this.dir.y * this.defaultSpeed,
    );
  }

  move(dir: boolean, walls: Wall[], timeRatio: number): void {
    if (dir) {
      this.speed = new Vector(
        this.dir.x * this.defaultSpeed,
        this.dir.y * this.defaultSpeed,
      );
    } else {
      this.speed = new Vector(
        -this.dir.x * this.defaultSpeed,
        -this.dir.y * this.defaultSpeed,
      );
    }
    this.moveTo(this.speed, timeRatio);
    for (const wall of walls) {
      if (this.sat(wall)) {
        this.moveTo(new Vector(-this.speed.x, -this.speed.y), timeRatio);
      }
    }
  }
}
