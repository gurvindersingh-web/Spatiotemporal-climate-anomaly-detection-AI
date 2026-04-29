"""
Vercel Serverless Function entrypoint.
Re-exports the FastAPI app from the project root so Vercel can discover it
at the conventional api/ path.
"""
import sys
import os

# Add the project root to sys.path so imports (ml_core, forecasting, etc.) resolve
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
