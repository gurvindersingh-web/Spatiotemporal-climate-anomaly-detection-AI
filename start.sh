#!/bin/bash
# Quick start script for the Climate Anomaly Detection API
set -e

echo "═══════════════════════════════════════════════════"
echo "  Climate Anomaly Detection — Quick Start"
echo "═══════════════════════════════════════════════════"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    exit 1
fi

echo "✓ Python: $(python3 --version)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
pip3 install -r requirements.txt --quiet 2>&1 | tail -3

# Copy env if needed
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✓ Created .env from template (edit API keys if needed)"
fi

# Generate synthetic data
echo ""
echo "🌍 Generating synthetic ERA5 data..."
python3 data_pipeline.py

# Start the server
echo ""
echo "🚀 Starting API server on http://localhost:8000"
echo "   Swagger docs: http://localhost:8000/docs"
echo ""
python3 server.py
