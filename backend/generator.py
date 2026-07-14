import numpy as np
import soundfile as sf
import os
from typing import List
from .models import CueInfo

def make_click_sound(freq=1000, duration=0.05, sr=44100):
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    click = np.sin(2 * np.pi * freq * t)
    # fade out exponentially
    fade = np.exp(-t * 50)
    return click * fade

def generate_click_track(beat_times: List[float], downbeat_times: List[float], duration: float, sr=44100, output_path=None):
    """
    Generates a click track matching the provided beats.
    Accents downbeats with a higher frequency click.
    """
    # ensure duration is at least long enough for the last beat
    if beat_times:
        duration = max(duration, beat_times[-1] + 1.0)
        
    audio_length = int(duration * sr)
    click_audio = np.zeros(audio_length)

    high_click = make_click_sound(freq=1200, duration=0.05, sr=sr)
    low_click = make_click_sound(freq=800, duration=0.05, sr=sr)
    
    # Tolerance for matching a beat to a downbeat
    tol = 0.05
    
    for beat in beat_times:
        is_downbeat = any(abs(beat - db) < tol for db in downbeat_times)
        click_sound = high_click if is_downbeat else low_click
        
        sample_pos = int(beat * sr)
        end_pos = sample_pos + len(click_sound)
        
        if end_pos < len(click_audio):
            click_audio[sample_pos:end_pos] += click_sound
            
    if output_path:
        sf.write(output_path, click_audio, sr)
        
    return click_audio

def generate_cues_track(cue_list: List[CueInfo], duration: float, sr=44100, cues_dir="assets/cues", output_path=None):
    """
    Generates an audio track with the spoken cues placed at the correct times.
    """
    # ensure duration is at least long enough for the last cue
    if cue_list:
        duration = max(duration, cue_list[-1].time + 2.0)
        
    audio_length = int(duration * sr)
    cues_audio = np.zeros(audio_length)
    
    for cue in cue_list:
        cue_time = cue.time
        label = cue.label
        
        cue_path = os.path.join(cues_dir, f"{label}.wav")
        if not os.path.exists(cue_path):
            print(f"Warning: Cue file {cue_path} not found.")
            continue
            
        cue_wave, cue_sr = sf.read(cue_path)
        
        sample_pos = int(cue_time * sr)
        
        if len(cue_wave.shape) > 1:
            cue_wave = cue_wave.mean(axis=1)
            
        end_pos = sample_pos + len(cue_wave)
        
        if end_pos < len(cues_audio):
            cues_audio[sample_pos:end_pos] += cue_wave
            
    if output_path:
        sf.write(output_path, cues_audio, sr)
        
    return cues_audio
