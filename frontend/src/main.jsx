import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import axios from 'axios'
import './index.css'
import './avengers-fx.css'
import './avengers-fx-2.css'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext'

// Set backend URL & enable credentials for all axios requests
if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
  axios.defaults.baseURL = "";
} else {
  axios.defaults.baseURL = "https://lokiverse.onrender.com";
}
axios.defaults.withCredentials = true;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
