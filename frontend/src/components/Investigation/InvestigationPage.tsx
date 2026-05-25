import React, { useState } from 'react';
import { Button, TextInput, Loading, InlineNotification } from '@carbon/react';
import { Search } from '@carbon/icons-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const InvestigationPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const search = async () => {
    if (!query.trim()) return;
    
    setSearching(true);
    setError(null);
    try {
      const response = await axios.post(`${API_URL}/api/investigation/search`, {
        query,
        searchScope: 'both',
        includeCommands: true
      });
      setResult(response.data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="investigation-page">
      <h1>Complex Investigation</h1>
      <p>Search IBM documentation and get AI-powered insights</p>
      
      <div style={{ marginTop: '2rem' }}>
        <TextInput
          id="search-query"
          labelText="Search Query"
          placeholder="Enter your search query..."
          value={query}
          onChange={(e: any) => setQuery(e.target.value)}
        />
        
        <Button
          renderIcon={Search}
          onClick={search}
          disabled={searching || !query.trim()}
          style={{ marginTop: '1rem' }}
        >
          {searching ? 'Searching...' : 'Search Documentation'}
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

      {searching && <Loading description="Searching documentation..." style={{ marginTop: '2rem' }} />}

      {result && (
        <div style={{ marginTop: '2rem' }}>
          <h2>Search Results</h2>
          <p>Found {result.searchResults.length} results</p>
          <h3>AI Conclusion</h3>
          <p>{result.aiConclusion.summary}</p>
          {/* Add more detailed results here */}
        </div>
      )}
    </div>
  );
};

export default InvestigationPage;

// Made with Bob
