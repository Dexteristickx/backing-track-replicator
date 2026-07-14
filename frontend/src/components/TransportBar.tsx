import React from 'react';
import { Play, Square, Pause, Rewind, FastForward } from 'lucide-react';

interface TransportBarProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onStop: () => void;
  onRewind?: () => void;
  onFastForward?: () => void;
}

export const TransportBar: React.FC<TransportBarProps> = ({
  isPlaying,
  onPlayPause,
  onStop,
  onRewind,
  onFastForward
}) => {
  return (
    <div className="transport-bar">
      <button className="btn-secondary" onClick={onRewind} title="Rewind">
        <Rewind size={20} />
      </button>
      <button className="btn-primary" onClick={onPlayPause} title={isPlaying ? "Pause" : "Play"}>
        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
      </button>
      <button className="btn-secondary" onClick={onStop} title="Stop">
        <Square size={20} />
      </button>
      <button className="btn-secondary" onClick={onFastForward} title="Fast Forward">
        <FastForward size={20} />
      </button>
    </div>
  );
};
