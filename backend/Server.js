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

    // (unused)
    this.clients = new Map();

    // Represents the current game session
    this.game = null;

    this.wss.on('connection', ws => this.onConnection(ws));
    this.#registerMessageHandlers();
  }

  onConnection(ws)
  {
    let gameSession = null;
    let playerColor = null;

    // Create a new game instance; client will be color red, and will be waiting for yellow
    if (this.game === null)
    {
      playerColor = "RED";
      gameSession = new Game(winner => { this.onGameEnd(winner); }, disconnectedPlayerColor => { this.onPlayerDisconnected(disconnectedPlayerColor); });
      gameSession.setWsByColor(playerColor, ws);
      this.game = gameSession;
      Messages.sendMessage(ws, 'WAITING_FOR_OPPONENT');
    }

    // A client reconnected
    else if (this.game.hasStarted && (this.game.redPlayerWs !== null || this.game.yellowPlayerWs !== null))
    {
      playerColor = (this.game.redPlayerWs === null ? "RED" : "YELLOW");
      gameSession = this.game;

      gameSession.setWsByColor(playerColor, ws);
      Messages.sendMessage(ws, 'GAME_STARTED', { playerColor: playerColor });
      gameSession.broadcastMessage('GAME_RESUMED', { reconnectedPlayerColor: playerColor, nextTurn: gameSession.nextTurn, board: gameSession.connect4.squares });
    }

    // A client is trying to connect while a game is in progress
    else if (this.game.hasStarted)
    {
      Messages.sendMessage(ws, 'ERR_GAME_IN_PROGRESS');
    }

    // Game has not started, and red player is waiting for yellow player
    else if (!this.game.hasStarted && this.game.yellowPlayerWs === null)
    {
      playerColor = "YELLOW";
      gameSession = this.game;
      gameSession.setWsByColor(playerColor, ws);
      gameSession.hasStarted = true;

      Messages.sendMessage(gameSession.redPlayerWs, 'GAME_STARTED', { playerColor: "RED" });
      Messages.sendMessage(gameSession.yellowPlayerWs, 'GAME_STARTED', { playerColor: "YELLOW" });
    }

    // Should never happen
    else
    {
      throw new Error("Unreachable code");
    }

    const wsMetadata = {
      id: Utils.generateGUID(),
      game: gameSession,
      color: playerColor
    };

    this.clients.set(ws, wsMetadata);
    ws.on('message', msg => this.onMessage(ws, msg));
    ws.on('close', () => this.onDisconnection(ws));
  }

  onPlayerDisconnected(disconnectedPlayerColor)
  {
    if (!this.game || this.game.isFinished || (!this.game.redPlayerWs && !this.game.yellowPlayerWs))
    {
      this.game = null;
      return;
    }

    this.game.setWsByColor(disconnectedPlayerColor, null);
    this.game.broadcastMessage('PLAYER_DISCONNECTED', { disconnectedPlayerColor: disconnectedPlayerColor });
  }

  onMessage(ws, jsonAsText)
  {
    const [success, error] = Messages.tryParseAndExecuteMessage(ws, jsonAsText);

    if (!success)
    {
      if (Config.debugMode)
        Messages.sendError(ws, error.toString());
      return;
    }
  }

  onGameEnd(winner)
  {
    this.game.winner = winner;

    const dbConnection = mysql.createConnection({
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

    dbConnection.connect(err => {
      if (err) {
        console.log("Couldn't connect to MySQL", err);
        return;
      }

      dbConnection.query("USE " + Credentials.Database);
      dbConnection.query("INSERT INTO games SET ?", dbObject, (err, result) => { if (err) console.log('INSERT Query', err, result); });
    });

    this.game = null;
  }

  onDisconnection(ws)
  {
    const metadata = this.clients.get(ws);

    if (!metadata || !metadata.game || !metadata.color)
      return;

    metadata.game.playerDisconnected(metadata.color);
  }

  #registerMessageHandlers()
  {
    // Same code to check if the preselection or the actual move is valid; it returns either false or a websocket of the "other player"
    const checkMoveAndGetOtherPlayer = (ws, side, index) => {
      const metadata = this.clients.get(ws);

      if (!metadata)
        return false;

      if (!metadata.game.isValidPosition(side, index))
        throw new Error("Position is out of bounds");
      if (metadata.game.nextTurn !== metadata.color)
        throw new Error("Not their turn");

      const otherPlayer = metadata.color == "RED" ? metadata.game.yellowPlayerWs : metadata.game.redPlayerWs;
      return otherPlayer;
    }

    Messages.registerHandler('PRESELECT_MOVE', (ws, obj) => {
      const otherPlayer = checkMoveAndGetOtherPlayer(ws, obj.side, obj.index);
      Messages.sendMessage(otherPlayer, 'OPPONENT_PRESELECTION', { side: obj.side, index: obj.index });
    });

    Messages.registerHandler('MOVE', (ws, obj) => {
      const metadata = this.clients.get(ws);

      if (!metadata)
        return;

      const otherPlayer = checkMoveAndGetOtherPlayer(ws, obj.side, obj.index);
      const newSquares = metadata.game.connect4.playMove(metadata.color, obj.side, obj.index);

      if (!newSquares)
        return; // Fail silently; the client will behave in the same way. This happens when stacking pieces if there is no space

      Messages.sendMessage(otherPlayer, 'OPPONENT_MOVE', { side: obj.side, index: obj.index });
      metadata.game.nextTurn = metadata.color == "RED" ? "YELLOW" : "RED";

      const winner = metadata.game.connect4.checkWinCondition();

      if (winner)
        metadata.game.endGame(winner);
    });


  }
}

new Server();

console.log('WebSocket server up');
