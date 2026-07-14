import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { AnalysisData, CueInfo } from '../types';

interface WaveformEditorProps {
  audioUrl: string | null;
  analysisData: AnalysisData | null;
  cues: CueInfo[];
  isPlaying: boolean;
  onPlayStateChange: (playing: boolean) => void;
  onReady: (ws: WaveSurfer) => void;
}

export const WaveformEditor: React.FC<WaveformEditorProps> = ({
  audioUrl,
  analysisData,
  cues,
  isPlaying,
  onPlayStateChange,
  onReady
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [wavesurfer, setWavesurfer] = useState<WaveSurfer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#44445A',
      progressColor: '#6C63FF',
      cursorColor: '#FFFFFF',
      barWidth: 2,
      barGap: 1,
      height: 200,
      normalize: true,
      backend: 'WebAudio',
    });

    setWavesurfer(ws);

    ws.on('ready', () => {
      onReady(ws);
    });

    ws.on('play', () => onPlayStateChange(true));
    ws.on('pause', () => onPlayStateChange(false));

    return () => {
      ws.destroy();
    };
  }, []);

  useEffect(() => {
    if (wavesurfer && audioUrl) {
      wavesurfer.load(audioUrl);
    }
  }, [wavesurfer, audioUrl]);

  useEffect(() => {
    if (!wavesurfer) return;
    if (isPlaying && !wavesurfer.isPlaying()) {
      wavesurfer.play();
    } else if (!isPlaying && wavesurfer.isPlaying()) {
      wavesurfer.pause();
    }
  }, [isPlaying, wavesurfer]);

  useEffect(() => {
    if (cues.length > 0) console.log(cues);
  }, [cues]);

  const duration = wavesurfer?.getDuration() || 1;

  return (
    <div className="waveform-container" style={{ width: '100%', position: 'relative' }}>
      {!audioUrl && <div className="placeholder-waveform" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10 }}>Drop audio file here to begin</div>}
      
      <div ref={containerRef} style={{ width: '100%', position: 'relative', overflow: 'hidden' }}>
        {/* Render downbeats as thick lines */}
        {wavesurfer && analysisData?.downbeats.map((time, i) => (
          <div key={`downbeat-${i}`} style={{
            position: 'absolute',
            left: `${(time / duration) * 100}%`,
            top: 0,
            bottom: 0,
            width: '2px',
            backgroundColor: 'var(--accent-warning)',
            zIndex: 5,
            pointerEvents: 'none',
            opacity: 0.8
          }} />
        ))}
        
        {/* Render regular beats as thin lines */}
        {wavesurfer && analysisData?.beats.map((time, i) => {
          // Skip if it's already a downbeat (approx matching)
          if (analysisData.downbeats.some(d => Math.abs(d - time) < 0.05)) return null;
          return (
            <div key={`beat-${i}`} style={{
              position: 'absolute',
              left: `${(time / duration) * 100}%`,
              top: 0,
              bottom: 0,
              width: '1px',
              backgroundColor: 'var(--text-secondary)',
              zIndex: 4,
              pointerEvents: 'none',
              opacity: 0.5
            }} />
          );
        })}
      </div>
    </div>
  );
};
