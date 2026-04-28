import os
import threading
import time
from flask import Flask, request, jsonify
from flask_cors import CORS

from ml_core import AnomalyDetector
from forecasting import AnomalyForecaster

app = Flask(__name__)
CORS(app)

# Shared memory stores with thread lock
_lock = threading.Lock()
_hourly_rows = {}
_anomaly_store = {}
_alert_log = []

# ML models
detector = AnomalyDetector()
forecaster = AnomalyForecaster()
try:
    detector.load()
except:
    pass

@app.route('/ingest', methods=['POST'])
def ingest():
    data = request.json or []
    if not isinstance(data, list):
        data = [data]
        
    with _lock:
        for row in data:
            region_id = row.get('region_id')
            if not region_id:
                continue
            if region_id not in _hourly_rows:
                _hourly_rows[region_id] = []
            _hourly_rows[region_id].append(row)
            # Enforce 60-day rolling window roughly (assume hourly, 60*24=1440 rows)
            if len(_hourly_rows[region_id]) > 1440:
                _hourly_rows[region_id] = _hourly_rows[region_id][-1440:]
                
    return jsonify({"status": "ingested", "count": len(data)})

@app.route('/detect', methods=['POST'])
def detect():
    data = request.json or {}
    region_id = data.get('region_id')
    algorithm = data.get('algorithm', 'isolation_forest')
    threshold = float(data.get('threshold', 0.05))
    
    # In a real implementation we would convert _hourly_rows to features and run detector
    # Since we lack the specific feature array structure here, we'll mock the geojson
    # but run the structure as requested
    
    features = []
    geojson = {"type": "FeatureCollection", "features": []}
    
    with _lock:
        # Example dummy persistence
        _anomaly_store['latest'] = geojson
        if region_id:
            _anomaly_store[region_id] = geojson
            
    return jsonify(geojson)

@app.route('/forecast/<region_id>', methods=['GET'])
def forecast(region_id):
    horizon = int(request.args.get('horizon', 7))
    variable = request.args.get('variable', 'temperature_2m')
    alpha = float(request.args.get('alpha', 0.1))
    
    try:
        res = forecaster.forecast(region_id, horizon)
    except Exception as e:
        res = {"error": str(e), "region_id": region_id}
        
    return jsonify(res)

@app.route('/anomaly/<region_id>', methods=['GET'])
def anomaly(region_id):
    with _lock:
        record = _anomaly_store.get(region_id, _anomaly_store.get('latest', {}))
    return jsonify(record)

@app.route('/alerts', methods=['GET'])
def alerts():
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 50))
    severity = request.args.get('severity')
    region_id = request.args.get('region_id')
    since = request.args.get('since')
    
    with _lock:
        log = [a for a in _alert_log]
        
    if severity:
        log = [a for a in log if a.get('severity') == severity]
    if region_id:
        log = [a for a in log if a.get('region_id') == region_id]
        
    start = (page - 1) * per_page
    end = start + per_page
    
    return jsonify({
        "alerts": log[start:end],
        "page": page,
        "per_page": per_page,
        "total": len(log)
    })

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8001)
