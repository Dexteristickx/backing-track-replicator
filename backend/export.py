import os
import zipfile
import tempfile
import numpy as np
import soundfile as sf
import shutil
from typing import List
from .models import CueInfo
from .generator import generate_click_track, generate_cues_track

def create_export_package(
    audio_path: str,
    beat_times: List[float],
    downbeat_times: List[float],
    cues: List[CueInfo],
    cues_dir: str,
    export_format: str = "multitrack"
) -> str:
    """
    Creates an export package and returns the path to the result file (a .zip or .wav).
    The caller is responsible for cleaning up the returned file when done.
    """
    temp_dir = tempfile.mkdtemp()
    
    # 1. Load original audio to get duration
    audio_data, sr = sf.read(audio_path)
    duration = len(audio_data) / sr

    # 2. Generate click track
    click_path = os.path.join(temp_dir, "click.wav")
    generate_click_track(beat_times, downbeat_times, duration, output_path=click_path)

    # 3. Generate cues track
    cues_path = os.path.join(temp_dir, "cues.wav")
    generate_cues_track(cues, duration, cues_dir=cues_dir, output_path=cues_path)

    if export_format == "stereo_split":
        # Left channel: original audio (mixed to mono)
        # Right channel: click + cues (mixed to mono)
        if len(audio_data.shape) > 1:
            left_chan = np.mean(audio_data, axis=1)
        else:
            left_chan = audio_data

        click_data, _ = sf.read(click_path)
        cues_data, _ = sf.read(cues_path)
        
        # Ensure same length
        max_len = max(len(left_chan), len(click_data), len(cues_data))
        
        left_padded = np.zeros(max_len)
        left_padded[:len(left_chan)] = left_chan
        
        right_padded = np.zeros(max_len)
        right_padded[:len(click_data)] += click_data
        right_padded[:len(cues_data)] += cues_data
        
        # Normalize right channel to avoid clipping
        if np.max(np.abs(right_padded)) > 1.0:
            right_padded = right_padded / np.max(np.abs(right_padded))

        stereo_mix = np.column_stack((left_padded, right_padded))
        
        out_file = tempfile.mktemp(suffix="_stereo_split.wav")
        sf.write(out_file, stereo_mix, sr)
        
        shutil.rmtree(temp_dir)
        return out_file

    else:
        # Multitrack: zip them all
        out_zip = tempfile.mktemp(suffix="_multitrack.zip")
        with zipfile.ZipFile(out_zip, 'w') as zf:
            zf.write(audio_path, arcname="original.wav")
            zf.write(click_path, arcname="click.wav")
            zf.write(cues_path, arcname="cues.wav")
            
        shutil.rmtree(temp_dir)
        return out_zip
