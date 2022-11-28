import * as Config from '../shared/Config.js';
import Square from './Square.js';

export default function MoveSelector(props)
{
    const playerColoredSymbol = props.color === 'RED' ? Config.redSymbol : Config.yellowSymbol;

    const rows = [];

    for (let i = 0; i < Config.gridSize; ++i)
        rows.push(<Square key={i} 
            value={((props.selectedIndex === i && props.selectedSide === props.side) ? playerColoredSymbol : Config.placeholderSymbol)}
            side={props.side} idx={i}
            onColumnSelectorHover={(col, i) => props.onColumnSelectorHover(col, i)} onColumnSelectorClick={(col, i) => props.onColumnSelectorClick(col, i)}
         />);

  return (<div className={`move-selector ${props.active ? "active" : ""} ${props.visible ? "show" : "hide"}`}>
    {rows}
    </div>)
}

