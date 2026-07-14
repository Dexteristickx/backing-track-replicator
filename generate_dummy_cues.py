import numpy as np
import soundfile as sf
import os

def synthesize_beep(freq, duration, sr=44100):
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    wave = 0.5 * np.sin(2 * np.pi * freq * t)
    # Fade in and out to avoid clicking
    fade_len = int(sr * 0.01)
    if len(wave) > fade_len * 2:
        fade_in = np.linspace(0, 1, fade_len)
        fade_out = np.linspace(1, 0, fade_len)
        wave[:fade_len] *= fade_in
        wave[-fade_len:] *= fade_out
    return wave

cues_dir = os.path.join("assets", "cues")
os.makedirs(cues_dir, exist_ok=True)

cues = [
    ("count_1", 500),
    ("count_2", 500),
    ("count_3", 500),
    ("count_4", 800),
    ("verse", 600),
    ("chorus", 700),
    ("bridge", 650),
    ("intro", 750),
    ("outro", 400),
]

sr = 44100
for name, freq in cues:
    wave = synthesize_beep(freq, 0.3, sr)
    sf.write(os.path.join(cues_dir, f"{name}.wav"), wave, sr)
    print(f"Generated {name}.wav")
