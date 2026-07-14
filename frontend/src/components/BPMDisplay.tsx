import React from 'react';

interface BPMDisplayProps {
  bpm: number | null;
}

export const BPMDisplay: React.FC<BPMDisplayProps> = ({ bpm }) => {
  return (
    <div className="bpm-display">
      {bpm ? `${Math.round(bpm)} BPM` : '--- BPM'}
    </div>
  );
};
