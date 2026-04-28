FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir flask flask-cors gunicorn numpy pandas scikit-learn mapie xarray cfgrib cdsapi redis && \
    pip install --no-cache-dir -r requirements.txt

COPY ml_service.py ml_core.py forecasting.py explainability.py geojson_builder.py data_pipeline.py ./

EXPOSE 8001
CMD ["gunicorn", "--bind", "0.0.0.0:8001", "--workers", "2", "--threads", "4", "--timeout", "120", "ml_service:app"]
