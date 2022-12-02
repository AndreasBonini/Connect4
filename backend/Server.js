import { WebSocketServer } from 'ws';
import Messages from '../shared/Messages.js';
import Game from './Game.js';
import * as Config from '../shared/Config.js';
import * as Utils from '../shared/Utils.js';
import * as Credentials from './DbCredentials.js';
import * as mysql from 'mysql';

class Server
{
  constructor()
  {
    this.wss = new WebSocketServer({ port: Config.websocketPort });
    this.clients = new Map();
    this.game = null;
    this.clientWaitingToJoinGame = null;

    this.wss.on('connection', ws => this.onConnection(ws));
    this.#registerMessageHandlers();
  }

  onConnection(ws)
  {
    const id = Utils.generateGUID();
    const metadata = {
      id: id,
      playerColor: null
    };

    this.clients.set(ws, metadata);
    ws.on('message', msg => this.onMessage(ws, msg));
    ws.on('close', () => this.onDisconnection(ws));

    if (this.game)
    {
      Messages.sendMessage(ws, 'ERR_GAME_IN_PROGRESS');
      return;
    }

    if (this.clientWaitingToJoinGame == null)
    {
      this.clientWaitingToJoinGame = ws;
      Messages.sendMessage(ws, 'WAITING_FOR_OPPONENT');
      return;
    }

    const red = this.clientWaitingToJoinGame;
    const yellow = ws;

    this.game = new Game(red, yellow, winner => { this.onGameEnd(winner); });

    const initPlayer = (ws, color) => {
      const metadata = this.clients.get(ws);
      this.clients.set(ws, {...metadata, game: this.game.id, color: color});
      Messages.sendMessage(ws, 'GAME_STARTED', { playerColor: color });
    }

    initPlayer(red, "RED");
    initPlayer(yellow, "YELLOW");
    this.clientWaitingToJoinGame = null;
  }

  onMessage(ws, jsonAsText)
  {
    const [success, error] = Messages.tryParseAndExecuteMessage(ws, jsonAsText);

    if (!success)
    {
      Messages.sendError(ws, error.toString()); // This exposes backend error information to the client, it's only for debugging purposes, should be removed in production
      return;
    }
  }

  onGameEnd(winner)
  {
    this.game.winner = winner;

    const connection = mysql.createConnection({
      host     : Credentials.Host,
      user     : Credentials.User,
      password : Credentials.Password,
    });

    const dbObject = {
      ID: this.game.id,          
      Winner: this.game.winner,
      Board: this.game.connect4.encode(),
      Timestamp: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };

    connection.connect(err => {
      if (err) {
        console.log("Couldn't connect to MySQL", err);
        return;
      }

      connection.query("USE " + Credentials.Database);
      connection.query("INSERT INTO games SET ?", dbObject, (err, result) => { if (err) console.log('INSERT Query', err, result); });
    });

    this.game = null
  }

  onDisconnection(ws)
  {
    if (ws == this.clientWaitingToJoinGame)
    {
      this.clientWaitingToJoinGame = null;
      return;
    }

    if (!this.game)
      return;

    const isRedPlayer = this.game.red == ws;
    const isYellowPlayer = this.game.yellow == ws;

    if (isRedPlayer)
      this.game.playerDisconnected("RED");
    if (isYellowPlayer)
      this.game.playerDisconnected("YELLOW");
  }

  #registerMessageHandlers()
  {
    // Same code to check if the preselection or the actual move is valid; it returns either false or a websocket of the "other player"
    const checkMoveAndGetOtherPlayer = (ws, side, index) => {
      if (!this.game.isValidPosition(side, index))
        throw new Error("Position is out of bounds");
      if (this.game.nextTurn != ws)
        throw new Error("Not their turn");

      const otherPlayer = (ws == this.game.red ? this.game.yellow : this.game.red);
      return otherPlayer;
    }

    Messages.registerHandler('PRESELECT_MOVE', (ws, obj) => {
      const otherPlayer = checkMoveAndGetOtherPlayer(ws, obj.side, obj.index);
      Messages.sendMessage(otherPlayer, 'OPPONENT_PRESELECTION', { side: obj.side, index: obj.index });
    });

    Messages.registerHandler('MOVE', (ws, obj) => {
      const metadata = this.clients.get(ws);
      const otherPlayer = checkMoveAndGetOtherPlayer(ws, obj.side, obj.index);
      const otherPlayerMetadata = this.clients.get(ws);
      const newSquares = this.game.connect4.playMove(metadata.color, obj.side, obj.index);

      if (!newSquares)
        return; // Fail silently, like the client; this happens when stacking pieces if there is no space

      Messages.sendMessage(otherPlayer, 'OPPONENT_MOVE', { side: obj.side, index: obj.index });
      this.game.nextTurn = otherPlayer;

      const winner = this.game.connect4.checkWinCondition();

      if (winner)
        this.game.endGame(winner);
    });


  }
}

new Server();

console.log('WebSocket server up');
