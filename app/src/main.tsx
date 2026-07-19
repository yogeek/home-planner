import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './theme.css';
import App from './App';
import { initToken } from './api';

initToken();

// Vue confortable (gros texte) mémorisée sur l'appareil
if (localStorage.getItem('village.comfort') === '1') {
  document.documentElement.classList.add('comfort');
}

if ('serviceWorker' in navigator && !import.meta.env.DEV) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js');
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
