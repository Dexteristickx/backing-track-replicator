import { useState, useRef } from 'react'
import './App.css'
import { TransportBar } from './components/TransportBar';
import { StatusBar } from './components/StatusBar';
import { BPMDisplay } from './components/BPMDisplay';
import { ExportPanel } from './components/ExportPanel';
import { WaveformEditor } from './components/WaveformEditor';
import WaveSurfer from 'wavesurfer.js';
import { AnalysisData, CueInfo } from './types';

function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState('Ready to load audio...');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [cues, setCues] = useState<CueInfo[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const wsRef = useRef<WaveSurfer | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setStatus(`Analyzing ${file.name}...`);
      setAudioFile(file);
      
      // Prevent TS unused error for setCues in this MVP step
      console.log('setCues initialized', setCues);
      
      // Load into wavesurfer immediately
      const objectUrl = URL.createObjectURL(file);
      setAudioUrl(objectUrl);
      
      // Send to FastAPI for analysis
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('Analysis failed');
      
      const data = await response.json();
      setAnalysisData(data);
      setStatus('Audio loaded and analyzed.');
    } catch (e) {
      console.error(e);
      setStatus('Error loading audio');
    }
  };

  const handleExport = async (format: 'multitrack' | 'stereo_split') => {
    if (!audioFile || !analysisData) return;
    
    setIsExporting(true);
    setStatus('Generating export package...');
    
    try {
      const formData = new FormData();
      formData.append('file', audioFile);
      formData.append('data', JSON.stringify({
        beat_times: analysisData.beats,
        downbeat_times: analysisData.downbeats,
        cues: cues,
        format: format
      }));
      
      const response = await fetch('http://localhost:8000/export', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) throw new Error('Export failed');
      
      // Trigger download
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = format === 'multitrack' ? 'export_multitrack.zip' : 'export_stereo.wav';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      
      setStatus('Export complete.');
    } catch (e) {
      console.error(e);
      setStatus('Export error.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleLoadAudio = () => {
    fileInputRef.current?.click();
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleStop = () => {
    if (wsRef.current) {
      wsRef.current.stop();
      wsRef.current.seekTo(0);
    }
    setIsPlaying(false);
  };

  const handleReady = (ws: WaveSurfer) => {
    wsRef.current = ws;
    setStatus('Audio loaded.');
  };

  return (
    <div className="app-container">
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        accept="audio/*" 
        onChange={handleFileChange} 
      />
      <header className="app-header">
        <h1>Backing Track Replicator</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <BPMDisplay bpm={analysisData?.bpm || null} />
          <button className="btn-primary" onClick={handleLoadAudio}>Load Audio</button>
        </div>
      </header>
      
      <main className="main-content">
        <section className="waveform-section" style={{ padding: '1rem' }}>
          <WaveformEditor 
            audioUrl={audioUrl}
            analysisData={analysisData}
            cues={cues}
            isPlaying={isPlaying}
            onPlayStateChange={setIsPlaying}
            onReady={handleReady}
          />
        </section>
        
        <section className="controls-section">
          <TransportBar 
            isPlaying={isPlaying}
            onPlayPause={handlePlayPause}
            onStop={handleStop}
          />
          
          <div className="section-markers">
            <button className="marker-btn">Add Cue</button>
            <button className="marker-btn">Edit Grid</button>
          </div>
        </section>
      </main>

      <footer className="app-footer">
        <StatusBar message={status} />
        <ExportPanel 
          onExport={() => handleExport('multitrack')} 
          isExporting={isExporting} 
        />
      </footer>
    </div>
  )
}

export default App
