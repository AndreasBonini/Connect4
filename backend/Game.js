import Connect4 from "../shared/Connect4.js";
import Messages from "../shared/Messages.js";
import * as Utils from "../shared/Utils.js";

export default class Game
{
    constructor(redPlayerWs, yellowPlayerWs, onGameEnd)
    {
        this.id = Utils.generateGUID();
        this.red = redPlayerWs;
        this.yellow = yellowPlayerWs;
        this.connect4 = new Connect4();
        this.nextTurn = this.red;
        this.winner = null;
        this.onGameEnd = onGameEnd;
    }

    isValidPosition(side, index) { return this.connect4.isValidPosition(side, index); }

    endGame(winner)
    {
        this.winner = winner;
        this.onGameEnd(winner);
    }

    playerDisconnected(disconnectedPlayerColor)
    {
        const otherPlayerColor = disconnectedPlayerColor == 'RED' ? 'YELLOW' : 'RED';
        this.broadcastMessage("PLAYER_DISCONNECTED", {winner: otherPlayerColor});

        this.endGame(otherPlayerColor);
    }

    broadcastMessage(cmd, obj)
    {
        Messages.sendMessage(this.red, cmd, obj);
        Messages.sendMessage(this.yellow, cmd, obj);
    }

    get isFinished() { return this.winner != null; }
}
