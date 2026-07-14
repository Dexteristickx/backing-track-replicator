import React from 'react';

interface StatusBarProps {
  message: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({ message }) => {
  return <div className="status-bar">{message}</div>;
};
