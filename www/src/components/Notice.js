import Loader from 'react-dots-loader'
import 'react-dots-loader/index.css'
import * as Config from '../shared/Config.js'

export default function Notice(props)
{
  const colorToEmoji = {
    'RED': Config.redSymbol,
    'YELLOW': Config.yellowSymbol
  };

  return (
    <div className={`notice ${props.noticeCssClass ?? ""}`}>
      <p>{props.text} <Loader visible={props.showLoader ?? false} size={12}>...</Loader></p>
      
      {props.showPlayerColor && props.playerColor && <p className={"turn-info"}>Your color: {colorToEmoji[props.playerColor] ?? "?"}</p>}
      {props.showNextTurn && props.nextTurn && <p className={"turn-info"}>Next turn: {colorToEmoji[props.nextTurn] ?? "?"}</p>}

      
    </div>
  )
}