import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

// Find the <div id="root"> in index.html and hand it to React.
// From this point on, React owns that div — it manages all DOM updates inside it.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
