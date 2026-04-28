# ClimateGuard AI

## Setup (2 minutes)
1. `cd frontend && npm install && npm run dev`
2. `npx n8n` → open http://localhost:5678
3. Import all 3 JSONs from `/n8n-workflows`
4. Add your Gemini API key in n8n workflow headers or HTTP request configurations
5. Open http://localhost:5173

## How it works
- React frontend polls n8n webhooks
- n8n fetches real climate data from Open-Meteo
- Gemini AI analyzes anomalies and generates insights
- Zero backend code, zero ML libraries
