import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import './index.css';
import App from './App.jsx';
import { store } from './store';
import { AuthProvider } from './features/auth/AuthContext';
import { RecommendationsProvider } from './context/RecommendationsContext';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <AuthProvider>
        <RecommendationsProvider>
          <App />
        </RecommendationsProvider>
      </AuthProvider>
    </Provider>
  </StrictMode>,
);
