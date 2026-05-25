import React, { useState } from 'react';
import { Button, TextArea, Loading, InlineNotification } from '@carbon/react';
import { Analytics } from '@carbon/icons-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const RCAPage: React.FC = () => {
  const [problem, setProblem] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = async () => {
    if (!problem.trim()) return;
    
    setAnalyzing(true);
    setError(null);
    try {
      const response = await axios.post(`${API_URL}/api/rca/analyze`, {
        problemDescription: problem
      });
      setResult(response.data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="rca-page">
      <h1>Root Cause Analysis</h1>
      <p>AI-powered problem diagnosis using Mistral AI</p>
      
      <div style={{ marginTop: '2rem' }}>
        <TextArea
          labelText="Describe the problem"
          placeholder="Enter the DB2 problem you're experiencing..."
          value={problem}
          onChange={(e: any) => setProblem(e.target.value)}
          rows={6}
        />
        
        <Button
          renderIcon={Analytics}
          onClick={analyze}
          disabled={analyzing || !problem.trim()}
          style={{ marginTop: '1rem' }}
        >
          {analyzing ? 'Analyzing...' : 'Analyze Problem'}
        </Button>
      </div>

      {error && (
        <InlineNotification
          kind="error"
          title="Error"
          subtitle={error}
          onCloseButtonClick={() => setError(null)}
          style={{ marginTop: '1rem' }}
        />
      )}

      {analyzing && <Loading description="Analyzing with AI..." style={{ marginTop: '2rem' }} />}

      {result && (
        <div style={{ marginTop: '2rem' }}>
          <h2>Analysis Results</h2>
          <h3>Technical Summary</h3>
          <p>{result.aiAnalysis.technicalSummary}</p>
          <h3>Executive Summary</h3>
          <p>{result.aiAnalysis.executiveSummary}</p>
          {/* Add more detailed results here */}
        </div>
      )}
    </div>
  );
};

export default RCAPage;

// Made with Bob
