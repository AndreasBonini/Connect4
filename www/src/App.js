
import './sanitize.css'
import './fonts.scss'
import './footer.scss'

import './Globals.css'
import './Game.css'
import React from 'react'
import Game from './components/Game.js'

export default class App extends React.Component
{
  render() {
      return (
        <>
          <div className={"container"}>
            <h1>Connect Four</h1>
            <Game />

            <footer>
            <p>Connect Four</p>
            <p>Made by Andreas Bonini for Monadical</p>
          </footer>
          </div>
          </>
      )
  }
}



// 6
