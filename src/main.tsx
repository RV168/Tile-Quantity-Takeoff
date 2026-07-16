
const originalError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('failed to connect to websocket')) return;
  if (args[0] && args[0].message && args[0].message.includes('WebSocket closed without opened')) return;
  originalError.apply(console, args);
};


window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && typeof event.reason === 'object' && event.reason.message && event.reason.message.includes('WebSocket')) {
    event.preventDefault();
  }
  if (event.reason === 'WebSocket closed without opened.') {
    event.preventDefault();
  }
  if (String(event.reason).includes('WebSocket closed without opened')) {
    event.preventDefault();
  }
});
window.addEventListener('error', (event) => {
  if (event.message && event.message.includes('WebSocket closed without opened')) {
    event.preventDefault();
  }
});

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
