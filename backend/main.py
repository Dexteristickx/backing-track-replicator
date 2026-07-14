from fastapi import FastAPI, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import json

from .models import AnalyzeResponse, ExportRequest, GenerateClickRequest, GenerateCuesRequest, CueInfo
from .analyzer import analyze_audio
from .generator import generate_click_track, generate_cues_track
from .export import create_export_package
import soundfile as sf
import tempfile
import shutil

app = FastAPI(title="Backing Track Replicator API")

# Allow requests from Tauri frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(file: UploadFile = File(...)):
    try:
        # Save to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name
            
        result = analyze_audio(tmp_path)
        
        # Cleanup
        os.remove(tmp_path)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate/click")
def generate_click(request: GenerateClickRequest):
    output = request.output_path or tempfile.mktemp(suffix=".wav")
    try:
        generate_click_track(request.beat_times, request.downbeat_times, request.duration, output_path=output)
        return {"status": "success", "file_path": output}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate/cues")
def generate_cues(request: GenerateCuesRequest):
    output = request.output_path or tempfile.mktemp(suffix=".wav")
    try:
        # Resolve cues dir relative to main.py
        cues_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "assets", "cues"))
        generate_cues_track(request.cue_list, request.duration, cues_dir=cues_dir, output_path=output)
        return {"status": "success", "file_path": output}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def cleanup_file(path: str):
    if os.path.exists(path):
        os.remove(path)

@app.post("/export")
async def export(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    data: str = Form(...)
):
    try:
        payload = json.loads(data)
        beat_times = payload.get("beat_times", [])
        downbeat_times = payload.get("downbeat_times", [])
        cues_data = payload.get("cues", [])
        cues = [CueInfo(**c) for c in cues_data]
        export_format = payload.get("format", "multitrack")
        
        cues_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "assets", "cues"))
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name
            
        out_file = create_export_package(
            audio_path=tmp_path,
            beat_times=beat_times,
            downbeat_times=downbeat_times,
            cues=cues,
            cues_dir=cues_dir,
            export_format=export_format
        )
        
        background_tasks.add_task(cleanup_file, tmp_path)
        background_tasks.add_task(cleanup_file, out_file)
        
        filename = "export.zip" if export_format == "multitrack" else "export.wav"
        media_type = "application/zip" if export_format == "multitrack" else "audio/wav"
        
        return FileResponse(path=out_file, filename=filename, media_type=media_type)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/progress/{job_id}")
def get_progress(job_id: str):
    # TODO: Implement progress tracking
    return {"job_id": job_id, "progress": 100, "status": "completed"}
