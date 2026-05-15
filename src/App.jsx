import { AuthProvider } from './context/AuthContext';
import { AccountProvider } from './context/AccountContext';
import { WarehouseProvider } from './context/WarehouseContext';
import ErrorBoundary from './components/ErrorBoundary';
import Router from './routes/Router';
import './css/index.css';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AccountProvider>
          <WarehouseProvider>
            <Router />
          </WarehouseProvider>
        </AccountProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App
