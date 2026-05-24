import React from 'react';
import { InlineNotification } from '@carbon/react';
import { WarningAltFilled } from '@carbon/icons-react';
import './CriticalAlert.css';

interface CriticalAlertProps {
  title: string;
  subtitle: string;
  onClose?: () => void;
}

const CriticalAlert: React.FC<CriticalAlertProps> = ({ title, subtitle, onClose }) => {
  return (
    <div className="critical-alert-overlay">
      <div className="critical-alert-container">
        <div className="critical-alert-icon">
          <WarningAltFilled size={120} />
        </div>
        <div className="critical-alert-content">
          <h1 className="critical-alert-title">CRITICAL ALERT</h1>
          <h2 className="critical-alert-subtitle">{title}</h2>
          <p className="critical-alert-message">{subtitle}</p>
          <InlineNotification
            kind="error"
            title="Immediate Action Required"
            subtitle="This is a critical system issue that needs your attention right now."
            hideCloseButton={false}
            onClose={onClose}
            className="critical-alert-notification"
          />
        </div>
      </div>
    </div>
  );
};

export default CriticalAlert;

// Made with Bob
