import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Theme } from '@carbon/react';
import Navigation from './components/Navigation/Navigation';
import Dashboard from './components/Dashboard';
import DailyTasksPage from './components/DailyTasks/DailyTasksPage';
import RCAPage from './components/RCA/RCAPage';
import InvestigationPage from './components/Investigation/InvestigationPage';
import LogCollectorPage from './components/LogCollector/LogCollectorPage';
import './App.scss';

function App() {
  return (
    <Theme theme="white">
      <Router>
        <div className="App">
          <Navigation />
          <div className="app-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/daily-tasks" element={<DailyTasksPage />} />
              <Route path="/rca" element={<RCAPage />} />
              <Route path="/investigation" element={<InvestigationPage />} />
              <Route path="/log-collector" element={<LogCollectorPage />} />
            </Routes>
          </div>
        </div>
      </Router>
    </Theme>
  );
}

export default App;

// Made with Bob
