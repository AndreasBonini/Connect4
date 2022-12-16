import React, { useEffect } from 'react'
import MoveSelector from './MoveSelector.js'
import Square from './Square.js'


export default function Board(props)
{
  useEffect(() => {
    window.addEventListener("keydown", props.onKeyPress);
    return () => window.removeEventListener("keydown", props.onKeyPress);
  });

  const createMoveSelectorBySide = side => ( // Avoids code duplication & mistakes
    <MoveSelector 
    onColumnSelectorHover={(col, i) => props.onColumnSelectorHover(col, i)} onColumnSelectorClick={(col, i) => props.onColumnSelectorClick(col, i)}
      visible={props.displaySelectors} active={props.isOurTurn} color={props.selectorColor} selectedIndex={props.selectedIndex} selectedSide={props.selectedSide}
      side={side} />
  );

  return (
    <>
    {createMoveSelectorBySide("L")}

      <div className={"main-board"}>
        {props.squares.map((row, rowIndex) => {
          // We are in a specific row, and now we will loop over it to get the columns, which are directly saved as a <Square/>

          // Display the row of squares
          const column = row.map((square, columnIndex) => <Square value={square} row={rowIndex} column={columnIndex} key={`S${rowIndex}${columnIndex}`} />);
          return column;
        })}
      </div>


      {createMoveSelectorBySide("R")}
    </>
  )
}

