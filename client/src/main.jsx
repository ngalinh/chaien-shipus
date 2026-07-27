import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter as BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { ToastProvider } from './components/Toast.jsx';
import './index.css';

// Khởi tạo theme từ localStorage (dark là mặc định)
const savedTheme = localStorage.getItem('shipus_theme') || 'dark';
document.body.setAttribute('data-theme', savedTheme);
if (savedTheme === 'light') {
  document.body.style.backgroundColor = '#e9ecee';
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <App />
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);
