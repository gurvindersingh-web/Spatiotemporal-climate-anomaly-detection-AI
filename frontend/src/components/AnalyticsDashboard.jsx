import React from 'react';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

export default function AnalyticsDashboard({ data }) {
  if (!data || !data.hourly_data) {
    return (
      <div id="analytics" className="section-container">
        <h2 className="section-title">Analytics Dashboard</h2>
        <div className="glass-card" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
          Search a location above to see analytics
        </div>
      </div>
    );
  }

  const formatData = () => {
    const arr = [];
    for(let i=0; i<data.hourly_data.time.length; i++) {
      arr.push({
        time: new Date(data.hourly_data.time[i]).getHours() + ':00',
        temp: data.hourly_data.temp[i],
        precip: data.hourly_data.precip[i],
        humidity: data.hourly_data.humidity[i],
        wind: data.hourly_data.wind[i],
        pressure: data.hourly_data.pressure[i]
      });
    }
    return arr;
  };

  const chartData = formatData();

  return (
    <div id="analytics" className="section-container">
      <h2 className="section-title">Data Analytics</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
        
        {/* Temp */}
        <motion.div initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="glass-card">
          <h3 style={{ marginBottom: '20px', color: 'var(--accent-blue)' }}>Temperature Trend (24h)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="time" stroke="var(--text-secondary)" />
              <YAxis stroke="var(--text-secondary)" />
              <Tooltip contentStyle={{ background: '#0a0f1e', border: '1px solid rgba(255,255,255,0.1)' }} />
              <Line type="monotone" dataKey="temp" stroke="var(--danger)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Precip */}
        <motion.div initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="glass-card">
          <h3 style={{ marginBottom: '20px', color: 'var(--accent-teal)' }}>Precipitation</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="time" stroke="var(--text-secondary)" />
              <YAxis stroke="var(--text-secondary)" />
              <Tooltip contentStyle={{ background: '#0a0f1e', border: '1px solid rgba(255,255,255,0.1)' }} />
              <Bar dataKey="precip" fill="var(--accent-blue)" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Humidity */}
        <motion.div initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="glass-card">
          <h3 style={{ marginBottom: '20px', color: 'var(--accent-purple)' }}>Relative Humidity</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="time" stroke="var(--text-secondary)" />
              <YAxis stroke="var(--text-secondary)" />
              <Tooltip contentStyle={{ background: '#0a0f1e', border: '1px solid rgba(255,255,255,0.1)' }} />
              <Area type="monotone" dataKey="humidity" stroke="var(--accent-teal)" fill="var(--accent-teal)" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Wind + Pressure */}
        <motion.div initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 }} className="glass-card">
          <h3 style={{ marginBottom: '20px', color: 'var(--warning)' }}>Wind & Pressure Correlation</h3>
          <ResponsiveContainer width="100%" height={250}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="time" stroke="var(--text-secondary)" />
              <YAxis yAxisId="left" stroke="var(--text-secondary)" />
              <YAxis yAxisId="right" orientation="right" stroke="var(--text-secondary)" />
              <Tooltip contentStyle={{ background: '#0a0f1e', border: '1px solid rgba(255,255,255,0.1)' }} />
              <Bar yAxisId="left" dataKey="wind" fill="var(--accent-purple)" />
              <Line yAxisId="right" type="monotone" dataKey="pressure" stroke="var(--warning)" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </motion.div>

      </div>
    </div>
  );
}
