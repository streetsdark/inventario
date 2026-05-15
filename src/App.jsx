import { AuthProvider } from './context/AuthContext';
import { WarehouseProvider } from './context/WarehouseContext';
import ErrorBoundary from './components/ErrorBoundary';
import Router from './routes/Router';
import './css/index.css';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <WarehouseProvider>
          <Router />
        </WarehouseProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App
