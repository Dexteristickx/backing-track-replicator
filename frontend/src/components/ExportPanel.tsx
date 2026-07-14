import React from 'react';
import { Download } from 'lucide-react';

interface ExportPanelProps {
  onExport: () => void;
  isExporting?: boolean;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({ onExport, isExporting }) => {
  return (
    <div className="export-panel">
      <button 
        className="btn-accent" 
        onClick={onExport} 
        disabled={isExporting}
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
      >
        <Download size={18} />
        {isExporting ? "Exporting..." : "Export Tracks"}
      </button>
    </div>
  );
};
