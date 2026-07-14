from pydantic import BaseModel, Field
from typing import List, Optional, Literal

class CueInfo(BaseModel):
    time: float = Field(..., description="Time in seconds where the cue should be placed")
    label: str = Field(..., description="Label of the cue, corresponding to the WAV file name without extension")

class AnalyzeRequest(BaseModel):
    file_path: str = Field(..., description="Absolute path to the audio file to analyze")

class AnalyzeResponse(BaseModel):
    bpm: float
    time_signature: int = 4
    beat_times: List[float]
    downbeat_times: List[float]
    duration: float
    confidence: Optional[float] = None

class GenerateClickRequest(BaseModel):
    beat_times: List[float]
    downbeat_times: List[float]
    duration: float
    output_path: Optional[str] = None

class GenerateCuesRequest(BaseModel):
    cue_list: List[CueInfo]
    duration: float
    output_path: Optional[str] = None

class ExportRequest(BaseModel):
    file_path: str
    original_bpm: float
    target_bpm: float
    beat_times: List[float]
    downbeat_times: List[float]
    cue_list: List[CueInfo]
    export_format: Literal["stereo_split", "multitrack"]
    include_click: bool = True
    include_cues: bool = True
    output_dir: str
