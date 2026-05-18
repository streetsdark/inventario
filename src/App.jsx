import { AuthProvider } from './context/AuthContext';
import { AccountProvider } from './context/AccountContext';
import { WarehouseProvider } from './context/WarehouseContext';
import ErrorBoundary from './components/ErrorBoundary';
import CookieBanner from './components/CookieBanner';
import Router from './routes/Router';
import './css/index.css';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AccountProvider>
          <WarehouseProvider>
            <Router />
            <CookieBanner />
          </WarehouseProvider>
        </AccountProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App
