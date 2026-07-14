import os
import sys
import tempfile
import multiprocessing

# 1. FIX NUMBA CACHE: Redirect cache to a safe, temp directory before any DSP imports
numba_cache = os.path.join(tempfile.gettempdir(), "numba_cache")
os.makedirs(numba_cache, exist_ok=True)
os.environ["NUMBA_CACHE_DIR"] = numba_cache

import uvicorn
import argparse
from backend.main import app

if __name__ == "__main__":
    multiprocessing.freeze_support()
    
    parser = argparse.ArgumentParser(description="Tauri Python Sidecar Backend")
    parser.add_argument("--port", type=int, default=8000, help="Port to run the backend on")
    args = parser.parse_args()

    # Run Uvicorn safely on localhost with dynamic port allocation
    uvicorn.run(app, host="127.0.0.1", port=args.port, log_level="info")
