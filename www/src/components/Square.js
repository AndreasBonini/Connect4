
export default function Square(props)
{
  return (
    <div className={"square"} 
    onMouseEnter={() => { if (props.onColumnSelectorHover) props.onColumnSelectorHover(props.side, props.idx); }}
    onClick={() => { if (props.onColumnSelectorClick) props.onColumnSelectorClick(props.side, props.idx); }}
    >
      {props.value}
    </div>
  );
}

