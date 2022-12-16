
import React from 'react'

import Connect4 from '../shared/Connect4.js';
import Messages from '../shared/Messages.js';
import * as Config from '../shared/Config.js';

import Board from './Board.js'
import Notice from './Notice.js'

export default class Game extends React.Component
{
  connect4 = null;
  ws = null;

  constructor(props)
  {
    super(props);

    this.connect4 = new Connect4();

    this.state =
    {
      squares: this.connect4.squares.slice(),
      selectedIndex: 0,
      selectedSide: "L",

      gameHasStarted: false,
      gameHasEnded: false,
      gameExists: true,

      playerColor: null,
      isOurTurn: null,

      winner: null
    };
  }

  showNotice(text, cssClass = "notice", showLoader = false, showPlayerColor = true, showNextTurn = true)
  {
    this.setState({
      notice: text ?? "",
      noticeCssClass: cssClass,
      noticeShowLoader: showLoader,
      noticeShowPlayerColor: showPlayerColor,
      noticeShowNextTurn: showNextTurn
    });
  }

  connect()
  {
    if (this.ws)
        return;

    this.ws = new WebSocket(`${Config.websocketProtocol}://${Config.websocketIP}:${Config.websocketPort}`);
    this.ws.onopen = () => { console.log('WebSocket connection successful') };
    
    this.ws.onclose = () => {
      this.setState({
        gameHasEnded: true,
        gameExists: this.state.gameHasStarted
      });

      this.showNotice("Disconnected from server (refresh to reconnect).", "error big", false, false, false);
    };

    this.ws.onmessage = (event) => {
    const [success, error] = Messages.tryParseAndExecuteMessage(this.ws, event.data);

    if (!success)
        console.log('Unable to parse message received from server', event.data, error);
    };    
  }

  #registerCommandHandlers()
  {
    Messages.registerHandler('ERROR', (ws, json) => { console.log("Server reported this error: " + json.error, json); });

    Messages.registerHandler('GAME_RESUMED', (ws, json) => {
      console.log(this.state.playerColor, json);
      const isOurTurn = json.nextTurn === this.state.playerColor;
      this.connect4.squares = json.board;

      this.setState({
          gameHasStarted: true,
          isOurTurn: isOurTurn,
          squares: this.connect4.squares.slice(),
          opponentDisconnected: false
      });
      
      this.showNotice("The game has resumed.", "notice green");

    });

    Messages.registerHandler('ERR_GAME_IN_PROGRESS', (ws, josn) => this.showNotice("You cannot play at this time, as another game is in progress.", "error big", false, false, false));

    Messages.registerHandler('WAITING_FOR_OPPONENT', (ws, json) => this.showNotice("Waiting for opponent.", "notice", true, true, false));

    Messages.registerHandler('GAME_STARTED', (ws, json) => {
        const isOurTurn = json.playerColor === 'RED';

        this.setState({
            playerColor: json.playerColor,

            gameHasStarted: true,
            isOurTurn: isOurTurn,

            opponentDisconnected: false
        });

        this.showNotice("The game has started.", "notice green");
      });

      Messages.registerHandler('PLAYER_DISCONNECTED', (ws, json) => {
        this.setState({
          opponentDisconnected: true
        });

        this.showNotice("The other player disconnected – Waiting for them to come back.", "notice error", true);
      });

      Messages.registerHandler('OPPONENT_PRESELECTION', (ws, json) => {
        this.setState({
            selectedIndex: json.index,
            selectedSide: json.side
        });
      });

      Messages.registerHandler('OPPONENT_MOVE', (ws, json) => {
        const otherPlayerColor = this.state.playerColor === "RED" ? "YELLOW" : "RED";
        const newSquares = this.connect4.playMove(otherPlayerColor, json.side, json.index);

        if (!newSquares)
            return;

        this.setState({
            squares: newSquares,
            isOurTurn: true,

            selectedIndex: 0,
            selectedSide: "L",

            opponentDisconnected: false
        });

        this.showNotice("Play your move!", "message green");

        this.checkWinCondition();
      });
    }

  componentDidMount()
  {
    this.showNotice("Connecting", "notice", true, false, false);
    this.connect();
    this.#registerCommandHandlers();
  }

  preselectMove(side, index)
  {
    if (!this.canPlayerMakeMove())
        return;

    if (index < 0)
      index = 0;
    if (index >= Config.gridSize)
      index = Config.gridSize - 1;

    if (this.state.selectedSide === side && this.state.selectedIndex === index)
      return false;

    Messages.sendMessage(this.ws, 'PRESELECT_MOVE', {side: side, index: index});
    this.setState({selectedIndex: index, selectedSide: side});
    return true;
  }

  canPlayerMakeMove()
  { 
    return this.state.gameExists && this.state.gameHasStarted && !this.state.gameHasEnded && this.state.isOurTurn && !this.state.opponentDisconnected;
  }

  handleKeyPress(event)
  {
    let preventDefault = true;
    if (!this.canPlayerMakeMove())
        return;

    switch (event.key)
    {
      case 'ArrowUp':
        this.preselectMove(this.state.selectedSide, this.state.selectedIndex - 1);
        break;
      case 'ArrowDown':
        this.preselectMove(this.state.selectedSide, this.state.selectedIndex + 1);
        break;
      case 'ArrowRight':
        this.preselectMove("R", this.state.selectedIndex);
        break;
      case 'ArrowLeft':
        this.preselectMove("L", this.state.selectedIndex);
        break;
      case 'Enter':
        this.playMove(this.state.selectedSide, this.state.selectedIndex);
        break;
      default:
        preventDefault = false;
        break;
    }

    if (preventDefault)
      event.preventDefault();
   }

   // side and index are optional; if missing it plays the pre-selected move
   playMove(side, index)
   {
    if (!this.canPlayerMakeMove())
        return;

    const newSquares = this.connect4.playMove(this.state.playerColor, side, index);

    if (!newSquares)
        return; // Fail silently; most likely the player tried to stack a piece where there is no space. Telling what's wrong will be obvious to the player, from seeing the board

    Messages.sendMessage(this.ws, "MOVE", {side: side, index: index})

    this.setState({
        squares: newSquares,
        isOurTurn: false,

        // Always reset the pre-selected index to the initial position on every turn
        selectedIndex: 0,
        selectedSide: "L"
    });

    this.showNotice("It's your opponent's turn.", "message yellow", true);

    this.checkWinCondition();
   }

   checkWinCondition()
   {
    const winner = this.connect4.checkWinCondition();
    const isThisPlayer = this.state.playerColor === winner;

    let notice = "(null)";
    if (winner === 'TIE')
      notice = "There are no spaces left on the board. It's a tie!";
    else if (isThisPlayer)
      notice = "You won!";
    else
      notice = "Your opponent has won!";

    if (winner) {
      this.setState({
        isOurTurn: false,
        gameHasEnded: true,
        winner: winner
      });
      
      this.showNotice(notice, "message winner", false, false, false);
    }
   }

   render()
  {
    const displaySelectors = this.state.gameHasStarted && !this.state.gameHasEnded;
    const selectorColor = this.state.isOurTurn ? this.state.playerColor : (this.state.playerColor === "RED" ? "YELLOW" : "RED");
    let nextTurnPlayerColor = null;

    if (this.state.isOurTurn === true)
      nextTurnPlayerColor = this.state.playerColor;
    else if (this.state.isOurTurn === false)
      nextTurnPlayerColor = this.state.playerColor === 'RED' ? 'YELLOW' : 'RED';

    return (
        <>
      <div className={"game unselectable"}>
        {this.state.gameExists && <Board
            squares={this.state.squares} isOurTurn={this.state.isOurTurn}
            displaySelectors={displaySelectors} selectedIndex={this.state.selectedIndex} selectedSide={this.state.selectedSide} selectorColor={selectorColor}
            onColumnSelectorHover={(side, index) => this.preselectMove(side, index)} onColumnSelectorClick={(side, index) => { this.preselectMove(side, index); this.playMove(side, index); }}
            onSelectorHover={(side, col) => this.preselectMove(side, col)}
            onKeyPress={(key) => { this.handleKeyPress(key); return false; }}
        />}

        <Notice
          text={this.state.notice} textCss={this.state.noticeCssClass}
          showLoader={this.state.noticeShowLoader} showPlayerColor={this.state.noticeShowPlayerColor} showNextTurn={this.state.noticeShowNextTurn}
          playerColor={this.state.playerColor} nextTurn={nextTurnPlayerColor}
          />
      </div>

      {this.state.gameExists && <aside>
            <h3>Use your Keyboard!</h3>

            <p>You can play with your keyboard; it's easier!</p>
            <p>When it's your turn, use the arrow keys to select your next move and press <i>enter</i> to finalize it.</p>
        </aside>}
      </>
    );
  }

}
