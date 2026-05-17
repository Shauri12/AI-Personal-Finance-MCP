import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import AIChat from './pages/AIChat';
import Predictions from './pages/Predictions';
import AIReports from './pages/AIReports';

import Transactions from './pages/Transactions';

// Placeholder components for other routes
const Investments = () => <div className="p-8"><h2 className="text-2xl font-bold">Investments</h2><p className="text-gray-400 mt-4">Investment tracking coming soon...</p></div>;
const Goals = () => <div className="p-8"><h2 className="text-2xl font-bold">Goals</h2><p className="text-gray-400 mt-4">Financial goals coming soon...</p></div>;

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="investments" element={<Investments />} />
            <Route path="goals" element={<Goals />} />
            <Route path="chat" element={<AIChat />} />
            <Route path="predictions" element={<Predictions />} />
            <Route path="reports" element={<AIReports />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
