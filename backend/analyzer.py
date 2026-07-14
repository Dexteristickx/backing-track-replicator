import librosa
import numpy as np

def calculate_downbeats(y: np.ndarray, sr: int, beat_times: np.ndarray) -> np.ndarray:
    """
    Computes downbeats (Beat 1) from raw beats using a custom DSP heuristic:
    Harmonic Novelty (Chroma shifts) + Low-Frequency Energy (Bass Kick).
    Dynamically supports both 3/4 and 4/4 time signatures.
    """
    if len(beat_times) < 8:
        return beat_times  # Not enough data, fallback to treating every beat as a downbeat

    # Convert beat times to frames
    beat_frames = librosa.time_to_frames(beat_times, sr=sr)

    # 1. Compute Low-Frequency Onset Envelope (Bass Energy)
    # Generate Mel spectrogram targeting kick drum frequencies (20Hz - 120Hz)
    S = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=128, fmin=20, fmax=120)
    onset_env_bass = librosa.onset.onset_strength(S=librosa.power_to_db(S, ref=np.max), sr=sr)

    # 2. Compute Chromagram for Harmonic Shift Tracking
    # CQT chromagram provides excellent pitch resolution
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=512)

    beat_scores = []
    hop_sec = 512 / sr

    # 3. Score Each Beat
    for i, beat_frame in enumerate(beat_frames):
        # Prevent boundary errors
        if beat_frame < 5 or beat_frame >= chroma.shape[1] - 5:
            beat_scores.append(0.0)
            continue

        # A. Harmonic Novelty: Cosine distance between chroma vectors before & after the beat
        # We sample with a 2-frame offset to avoid transient noise at the onset boundary
        chroma_before = chroma[:, beat_frame - 3]
        chroma_after = chroma[:, beat_frame + 3]
        
        norm_b = np.linalg.norm(chroma_before)
        norm_a = np.linalg.norm(chroma_after)
        
        if norm_b > 0 and norm_a > 0:
            cosine_similarity = np.dot(chroma_before, chroma_after) / (norm_b * norm_a)
            harmonic_novelty = 1.0 - cosine_similarity
        else:
            harmonic_novelty = 0.0

        # B. Bass Energy: Maximum onset strength in a tiny window around the beat frame
        window_slice = onset_env_bass[max(0, beat_frame - 2) : min(len(onset_env_bass), beat_frame + 3)]
        bass_energy = np.max(window_slice) if len(window_slice) > 0 else 0.0

        # Composite score
        beat_scores.append(harmonic_novelty + (0.5 * bass_energy))

    beat_scores = np.array(beat_scores)

    # 4. Phase Evaluation & Time Signature Selection (3/4 vs 4/4)
    best_signature = 4
    best_phase = 0
    max_phase_score = -1.0

    # Test both 3/4 and 4/4 time signatures
    for signature in [3, 4]:
        for phase in range(signature):
            # Pick every n-th beat starting at phase offset
            phase_indices = np.arange(phase, len(beat_scores), signature)
            phase_score = np.mean(beat_scores[phase_indices])

            if phase_score > max_phase_score:
                max_phase_score = phase_score
                best_signature = signature
                best_phase = phase

    # 5. Extract Final Downbeat Timestamps
    downbeat_indices = np.arange(best_phase, len(beat_times), best_signature)
    downbeat_times = beat_times[downbeat_indices]

    return downbeat_times, best_signature

def analyze_audio(file_path: str) -> dict:
    # 1. Load audio with librosa
    y, sr = librosa.load(file_path, sr=None)
    duration = librosa.get_duration(y=y, sr=sr)

    # 2. Extract tempo and beats using librosa
    tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
    beat_times = librosa.frames_to_time(beat_frames, sr=sr)

    # Convert tempo to a standard python float
    if isinstance(tempo, np.ndarray):
        tempo = float(tempo[0])
    else:
        tempo = float(tempo)

    # 3. Downbeat detection with custom heuristic
    downbeat_times, time_sig = calculate_downbeats(y, sr, beat_times)

    return {
        "bpm": tempo,
        "time_signature": time_sig,
        "beat_times": beat_times.tolist() if isinstance(beat_times, np.ndarray) else list(beat_times),
        "downbeat_times": downbeat_times.tolist() if isinstance(downbeat_times, np.ndarray) else list(downbeat_times),
        "duration": duration,
        "confidence": 1.0 # placeholder
    }
