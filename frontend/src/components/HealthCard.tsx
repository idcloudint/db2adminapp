import React from 'react';
import { Tile, Tag } from '@carbon/react';
import { CheckmarkFilled, WarningFilled, ErrorFilled, UnknownFilled } from '@carbon/icons-react';
import { HealthStatus } from '../types';
import './HealthCard.css';

interface HealthCardProps {
  title: string;
  status: HealthStatus;
  explanation: string;
  recommendation: string;
  details?: React.ReactNode;
  lastChecked: string;
}

const HealthCard: React.FC<HealthCardProps> = ({
  title,
  status,
  explanation,
  recommendation,
  details,
  lastChecked
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case HealthStatus.HEALTHY:
        return <CheckmarkFilled size={32} className="status-icon healthy" />;
      case HealthStatus.WARNING:
        return <WarningFilled size={32} className="status-icon warning" />;
      case HealthStatus.CRITICAL:
        return <ErrorFilled size={32} className="status-icon critical" />;
      default:
        return <UnknownFilled size={32} className="status-icon unknown" />;
    }
  };

  const getStatusTag = () => {
    const tagTypes: Record<HealthStatus, any> = {
      [HealthStatus.HEALTHY]: 'green',
      [HealthStatus.WARNING]: 'yellow',
      [HealthStatus.CRITICAL]: 'red',
      [HealthStatus.UNKNOWN]: 'gray'
    };

    const tagLabels: Record<HealthStatus, string> = {
      [HealthStatus.HEALTHY]: 'Healthy',
      [HealthStatus.WARNING]: 'Warning',
      [HealthStatus.CRITICAL]: 'Critical',
      [HealthStatus.UNKNOWN]: 'Unknown'
    };

    return (
      <Tag type={tagTypes[status]} size="md">
        {tagLabels[status]}
      </Tag>
    );
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString();
    } catch {
      return timestamp;
    }
  };

  return (
    <Tile className={`health-card health-card-${status}`}>
      <div className="health-card-header">
        <div className="health-card-title-row">
          {getStatusIcon()}
          <h3 className="health-card-title">{title}</h3>
        </div>
        {getStatusTag()}
      </div>

      <div className="health-card-body">
        <div className="health-card-section">
          <h4 className="health-card-section-title">What's Happening</h4>
          <p className="health-card-explanation">{explanation}</p>
        </div>

        <div className="health-card-section">
          <h4 className="health-card-section-title">What To Do</h4>
          <p className="health-card-recommendation">{recommendation}</p>
        </div>

        {details && (
          <div className="health-card-section">
            <h4 className="health-card-section-title">Details</h4>
            <div className="health-card-details">{details}</div>
          </div>
        )}
      </div>

      <div className="health-card-footer">
        <span className="health-card-timestamp">
          Last checked: {formatTimestamp(lastChecked)}
        </span>
      </div>
    </Tile>
  );
};

export default HealthCard;

// Made with Bob
