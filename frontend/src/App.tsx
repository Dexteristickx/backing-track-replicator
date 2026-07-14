import { useState, useRef, useEffect } from 'react'
import './App.css'
import { TransportBar } from './components/TransportBar';
import { StatusBar } from './components/StatusBar';
import { BPMDisplay } from './components/BPMDisplay';
import { ExportPanel } from './components/ExportPanel';
import { WaveformEditor } from './components/WaveformEditor';
import WaveSurfer from 'wavesurfer.js';
import { AnalysisData, CueInfo } from './types';
import { Command } from "@tauri-apps/plugin-shell";

function App() {
  const [isBackendReady, setIsBackendReady] = useState(false);
  const [apiPort, setApiPort] = useState(8000);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState('Starting audio engine...');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [cues, setCues] = useState<CueInfo[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const wsRef = useRef<WaveSurfer | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let sidecarProcess: any = null;

    const startSidecar = async () => {
      // 1. Choose a highly random port to minimize collision risks
      const targetPort = Math.floor(Math.random() * (9000 - 8001) + 8001);
      setApiPort(targetPort);

      try {
        setStatus('Spawning audio engine process...');
        // 2. Spawn sidecar with the port argument
        const command = Command.sidecar("bin/backend", ["--port", targetPort.toString()]);
        
        command.on('error', error => {
          console.error(`Command error: "${error}"`);
          setStatus(`Sidecar Error: ${error}`);
        });

        sidecarProcess = await command.spawn();
        console.log(`Python sidecar spawned on port ${targetPort}`);
        setStatus('Audio engine spawned. Waiting for initialization (this can take up to 60 seconds on first run)...');

        // 3. Poll /health until server responds. 120 retries * 500ms = 60 seconds
        let retries = 120;
        let connected = false;
        while (retries > 0) {
          try {
            const res = await fetch(`http://127.0.0.1:${targetPort}/health`);
            if (res.ok) {
              const data = await res.json();
              if (data.status === "healthy" || data.status === "ok") {
                setIsBackendReady(true);
                setStatus('Ready to load audio...');
                connected = true;
                break;
              }
            }
          } catch (e) {
            // Wait 500ms before retrying
            await new Promise((resolve) => setTimeout(resolve, 500));
            retries--;
          }
        }

        if (!connected) {
          console.error("Failed to connect to backend sidecar. Timeout reached.");
          setStatus('Backend connection failed. Process timed out.');
        }

      } catch (err) {
        console.error("Failed to start sidecar:", err);
        setStatus(`Failed to start engine: ${err}`);
      }
    };

    startSidecar();

    // Cleanup: Kill the child sidecar when the user exits the app window
    return () => {
      if (sidecarProcess) {
        sidecarProcess.kill().catch((err: any) => console.error("Error killing sidecar:", err));
      }
    };
  }, []);


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
      
      const response = await fetch(`http://127.0.0.1:${apiPort}/analyze`, {
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
      
      const response = await fetch(`http://127.0.0.1:${apiPort}/export`, {
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

  if (!isBackendReady) {
    return (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100vh", color: "white", padding: "2rem", textAlign: "center" }}>
        <h3>Loading Backing Track Replicator Engine...</h3>
        <p style={{ marginTop: "1rem", color: "#888", fontFamily: "monospace" }}>{status}</p>
      </div>
    );
  }

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
