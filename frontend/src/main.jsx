import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AppState } from './context/AppState.jsx';
import './theme/tokens.css';
import './styles/customer.css';
import './styles/office.css';

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AppState>
      <App />
    </AppState>
  </BrowserRouter>,
);
