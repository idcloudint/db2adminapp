import React, { useState, useEffect } from 'react';
import {
  Button,
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  Loading,
  InlineNotification
} from '@carbon/react';
import { Play, Renew } from '@carbon/icons-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const DailyTasksPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runTasks = async () => {
    setRunning(true);
    setError(null);
    try {
      const response = await axios.post(`${API_URL}/api/daily-tasks/run`);
      setResults(response.data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="daily-tasks-page">
      <h1>Daily Admin Tasks</h1>
      <p>Automated daily health checks for DB2 database</p>
      
      <div style={{ marginTop: '2rem', marginBottom: '2rem' }}>
        <Button
          renderIcon={Play}
          onClick={runTasks}
          disabled={running}
        >
          {running ? 'Running Tasks...' : 'Run All Tasks'}
        </Button>
      </div>

      {error && (
        <InlineNotification
          kind="error"
          title="Error"
          subtitle={error}
          onCloseButtonClick={() => setError(null)}
        />
      )}

      {running && <Loading description="Running daily tasks..." />}

      {results && (
        <div style={{ marginTop: '2rem' }}>
          <h2>Results</h2>
          <p>Passed: {results.passed} | Warnings: {results.warnings} | Failed: {results.failed}</p>
          {/* Add detailed results table here */}
        </div>
      )}
    </div>
  );
};

export default DailyTasksPage;

// Made with Bob
