import numpy as np
from backend.analyzer import calculate_downbeats

def test_calculate_downbeats_signature_selection():
    # Arrange: Mock 16 beats
    beat_times = np.arange(0.5, 8.5, 0.5) # 16 beats spaced at 0.5s intervals (120 BPM)
    
    # Act: Run the downbeat calculator on minimal arrays
    # 22050 sr * 10 seconds = 220500 samples
    y_mock = np.zeros(220500)
    downbeats, sig = calculate_downbeats(y_mock, 22050, beat_times)
    
    # Assert: Downbeats should be structured logically (length > 0)
    assert len(downbeats) > 0
    assert len(downbeats) < len(beat_times)
    assert sig in [3, 4]
