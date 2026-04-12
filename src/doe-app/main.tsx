import React, { useReducer, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import './styles/global.css'
import { App } from './App'
import { DOEContext, doeReducer, initialState } from './hooks/useDOEState'
import { usePersistState, loadPersistedState } from './hooks/useLocalStorage'

function Root() {
  const saved = loadPersistedState()
  const [state, dispatch] = useReducer(doeReducer, saved ?? initialState)
  usePersistState(state)
  return (
    <DOEContext.Provider value={{ state, dispatch }}>
      <App />
    </DOEContext.Provider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
