import 'bootstrap/dist/css/bootstrap.min.css';
import './styles.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import LmwWidgetApp from './WidgetApp';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LmwWidgetApp />
  </React.StrictMode>
);

