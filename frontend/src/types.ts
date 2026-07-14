export interface CueInfo {
  time: number;
  name: string;
  type: "spoken" | "musical";
}

export interface AnalysisData {
  bpm: number;
  beats: number[];
  downbeats: number[];
}
