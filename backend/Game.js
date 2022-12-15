import Connect4 from "../shared/Connect4.js";
import Messages from "../shared/Messages.js";
import * as Utils from "../shared/Utils.js";

export default class Game
{
    constructor(onGameEnd, onPlayerDisconnected)
    {
        this.id = Utils.generateGUID();
        this.connect4 = new Connect4();

        this.redPlayerWs = null;
        this.yellowPlayerWs = null;

        this.onGameEnd = onGameEnd;
        this.onPlayerDisconnected = onPlayerDisconnected;

        // Both are strings; either RED, YELLOW, or (only for winner) null
        this.nextTurn = "RED";
        this.winner = null;

        this.hasStarted = false;
    }

    // Returns the WebSocket instance of the specified player's color
	getWsByColor(color)
	{
		switch (color)
		{
			case 'RED':
				return this.redPlayerWs;
			case 'YELLOW':
				return this.yellowPlayerWs;
			default:
				throw new Error(`Invalid color ${color}`);
		}
	}

    // Sets the WebSocket instance to the specified player's color
	setWsByColor(color, ws)
	{
		switch (color)
		{
			case 'RED':
				this.redPlayerWs = ws;
                break;
			case 'YELLOW':
				this.yellowPlayerWs = ws;
                break;
			default:
				throw new Error(`Invalid color ${color}`);
		}
	}

    isValidPosition(side, index) { return this.connect4.isValidPosition(side, index); }

    endGame(winner)
    {
        this.winner = winner;
        this.onGameEnd(winner);
    }

    playerDisconnected(disconnectedPlayerColor)
    {
        this.setWsByColor(disconnectedPlayerColor, null);

        if (!this.isFinished)
            this.broadcastMessage("PLAYER_DISCONNECTED", {color: disconnectedPlayerColor});

        this.onPlayerDisconnected(disconnectedPlayerColor);
    }

    broadcastMessage(cmd, obj)
    {
        if (this.redPlayerWs)
            Messages.sendMessage(this.redPlayerWs, cmd, obj);
        if (this.yellowPlayerWs)
            Messages.sendMessage(this.yellowPlayerWs, cmd, obj);
    }

    get isFinished() { return this.winner != null; }
}
