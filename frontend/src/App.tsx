import React from 'react';
import { Theme } from '@carbon/react';
import Dashboard from './components/Dashboard';
import './App.scss';

function App() {
  return (
    <Theme theme="white">
      <div className="App">
        <Dashboard />
      </div>
    </Theme>
  );
}

export default App;

// Made with Bob
