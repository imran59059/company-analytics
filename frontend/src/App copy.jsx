import React from 'react'
import ChatBot from './chat/Chat'
import { Link, Outlet } from 'react-router-dom'

const App = () => {
  return (
    <div>
      <nav style={{ display: "flex", gap: "1rem" }}>
        <Link to="/">Home</Link>
        <Link to="/streaming">Streaming</Link>
        <Link to="/api">APIs</Link>
        <Link to="/not-streaming">Not Streaming</Link>
      </nav>
      <Outlet />
    </div>
  )
}

export default App