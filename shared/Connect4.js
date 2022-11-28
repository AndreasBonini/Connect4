
import * as Config from './Config.js'


export default class Connect4
{
    constructor()
    {
        this.squares = Array(Config.gridSize).fill(0).map(() => new Array(Config.gridSize).fill(Config.emptySymbol));
    }

    // Returns false if a move couldn't be made, and a .sliced() copy of the new squares if it could
    playMove(playerColor, side, index)
    {
        const symbol = playerColor == "RED" ? Config.redSymbol : Config.yellowSymbol;

        const squares = this.squares.slice();
        let row = squares[index];
    
        if (side === 'R')
          row = row.reverse();
        
        let emptySlotIndex = null;
    
        for (let i = 0; i < Config.gridSize; ++i)
        {
          if (row[i] === Config.emptySymbol)
          {
            emptySlotIndex = i;
            break;
          }
        }
    
        if (emptySlotIndex === null)
          return false;
    
        row[emptySlotIndex] = symbol;
        if (side === 'R')
          row = row.reverse();
        
          this.squares = squares;
          return squares;
    }

    // Checks ONLY if it's within bounds, not if it can be played
    isValidPosition(side, index)
    {
        return (side === "L" || side === "R") && index >= 0 && index <= Config.gridSize;
    }

    checkWinCondition()
    {
      const bd = this.squares;
      let atLeastOneEmptySpace = false;

      const chkLine = (a, b, c, d) => {
        if (a == Config.emptySymbol || b == Config.emptySymbol || c == Config.emptySymbol || d == Config.emptySymbol)
          atLeastOneEmptySpace = true;


        return ((a != Config.emptySymbol) && (a === b) && (a === c) && (a === d));
      }

      const chkWin = () => {
        // Check down
        for (let r = 0; r < 3; r++)
            for (let c = 0; c < 7; c++)
                if (chkLine(bd[r][c], bd[r+1][c], bd[r+2][c], bd[r+3][c]))
                    return bd[r][c];

        // Check right
        for (let r = 0; r < 6; r++)
            for (let c = 0; c < 4; c++)
                if (chkLine(bd[r][c], bd[r][c+1], bd[r][c+2], bd[r][c+3]))
                    return bd[r][c];

        // Check down-right
        for (let r = 0; r < 3; r++)
            for (let c = 0; c < 4; c++)
                if (chkLine(bd[r][c], bd[r+1][c+1], bd[r+2][c+2], bd[r+3][c+3]))
                    return bd[r][c];

        // Check down-left
        for (let r = 3; r < 6; r++)
            for (let c = 0; c < 4; c++)
                if (chkLine(bd[r][c], bd[r-1][c+1], bd[r-2][c+2], bd[r-3][c+3]))
                    return bd[r][c];      

        return null;
        
      };

      const winningSymbol = chkWin();

      if (winningSymbol === Config.redSymbol)
        return 'RED';
      if (winningSymbol === Config.yellowSymbol)
        return 'YELLOW';
      if (!atLeastOneEmptySpace)
        return 'TIE';
      return false;
    }

    encode()
    {
      let ret = '';

      // MySQL encoding problems <.<
      const replacementTable = {};
      replacementTable[Config.redSymbol] = 'R';
      replacementTable[Config.yellowSymbol] = 'Y';
      replacementTable[Config.emptySymbol] = 'o';

      for (let row = 0; row < Config.gridSize; ++row) {
        for (let col = 0; col < Config.gridSize; ++col) {
          ret += replacementTable[this.squares[row][col]];
        }
      }

      return ret;
    }
}