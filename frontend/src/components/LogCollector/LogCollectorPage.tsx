import React, { useState } from 'react';
import { Button, Checkbox, Loading, InlineNotification } from '@carbon/react';
import { DocumentDownload } from '@carbon/icons-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const LogCollectorPage: React.FC = () => {
  const [selectedComponents, setSelectedComponents] = useState<string[]>([]);
  const [collecting, setCollecting] = useState(false);
  const [job, setJob] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const components = [
    { id: 'db2diag', label: 'DB2 Diagnostic Log' },
    { id: 'db2support', label: 'DB2 Support Output' },
    { id: 'db_config', label: 'Database Configuration' },
    { id: 'instance_config', label: 'Instance Configuration' },
    { id: 'backup_history', label: 'Backup History' },
    { id: 'hadr_status', label: 'HADR Status' },
    { id: 'package_cache', label: 'Package Cache Statistics' },
    { id: 'lock_waits', label: 'Lock Wait Information' },
    { id: 'sql_errors', label: 'Recent SQL Errors' }
  ];

  const toggleComponent = (id: string) => {
    setSelectedComponents(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const collect = async () => {
    if (selectedComponents.length === 0) return;
    
    setCollecting(true);
    setError(null);
    try {
      const response = await axios.post(`${API_URL}/api/logs/collect`, {
        includeComponents: selectedComponents
      });
      setJob(response.data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCollecting(false);
    }
  };

  return (
    <div className="log-collector-page">
      <h1>IBM Support Log Collector</h1>
      <p>Collect logs for IBM Support cases</p>
      
      <div style={{ marginTop: '2rem' }}>
        <h3>Select Components to Collect</h3>
        {components.map(component => (
          <Checkbox
            key={component.id}
            id={component.id}
            labelText={component.label}
            checked={selectedComponents.includes(component.id)}
            onChange={() => toggleComponent(component.id)}
          />
        ))}
        
        <Button
          renderIcon={DocumentDownload}
          onClick={collect}
          disabled={collecting || selectedComponents.length === 0}
          style={{ marginTop: '1rem' }}
        >
          {collecting ? 'Collecting...' : 'Start Collection'}
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

      {collecting && <Loading description="Collecting logs..." style={{ marginTop: '2rem' }} />}

      {job && (
        <div style={{ marginTop: '2rem' }}>
          <h2>Collection Job</h2>
          <p>Job ID: {job.jobId}</p>
          <p>Status: {job.status}</p>
          <p>Progress: {job.progress}%</p>
          {/* Add more job details here */}
        </div>
      )}
    </div>
  );
};

export default LogCollectorPage;

// Made with Bob
