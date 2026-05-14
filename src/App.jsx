import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import Router from './routes/Router';
import './css/index.css';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App
