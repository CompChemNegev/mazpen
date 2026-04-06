import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { LangProvider } from './context/LangContext';
import { ScenarioProvider } from './context/ScenarioContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import GlobalLayout from './components/GlobalLayout';
import Login from './pages/Login';
import FieldReports from './pages/FieldReports';
import NewMeasurement from './pages/NewMeasurement';
import MyReports from './pages/MyReports';
import GISDashboard from './pages/GISDashboard';
import Missions from './pages/Missions';
import Visitors from './pages/Visitors';
import VisitorIntake from './pages/VisitorIntake';
import VisitorProfile from './pages/VisitorProfile';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';

function AuthenticatedApp() {
  const { token } = useAuth();

  if (!token) {
    return <Login />;
  }

  return (
    <ScenarioProvider>
      <BrowserRouter>
        <GlobalLayout>
          <Routes>
            <Route path="/" element={<Navigate to="/field-reports" replace />} />
            <Route path="/field-reports" element={<FieldReports />} />
            <Route path="/field-reports/new" element={<NewMeasurement />} />
            <Route path="/field-reports/my-reports" element={<MyReports />} />
            <Route path="/gis-dashboard" element={<GISDashboard />} />
            <Route path="/missions" element={<Missions />} />
            <Route path="/visitors" element={<Visitors />} />
            <Route path="/visitors/intake" element={<VisitorIntake />} />
            <Route path="/visitors/:id" element={<VisitorProfile />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </GlobalLayout>
      </BrowserRouter>
    </ScenarioProvider>
  );
}

export default function App() {
  return (
    <LangProvider>
      <ThemeProvider>
        <AuthProvider>
          <AuthenticatedApp />
        </AuthProvider>
      </ThemeProvider>
    </LangProvider>
  );
}
