import React, { useState } from 'react';
import { askClimateAI } from '../utils/api';
import { Send, Bot, User } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ClimateAssistant({ contextData }) {
  const [messages, setMessages] = useState([
    { role: 'ai', text: "Hello! I'm your Gemini-powered Climate Assistant. Ask me anything about the current climate data." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const SUGGESTIONS = [
    "Why is Phoenix so hot this week?",
    "Is the Mumbai rainfall unusual?",
    "What causes sudden pressure drops?"
  ];

  const handleSend = async (text) => {
    if (!text) return;
    setMessages(prev => [...prev, { role: 'user', text }]);
    setInput('');
    setLoading(true);

    try {
      const res = await askClimateAI(text, contextData);
      setMessages(prev => [...prev, { role: 'ai', text: res.answer }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', text: "I'm sorry, I couldn't reach the backend." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="assistant" className="section-container" style={{ maxWidth: '800px' }}>
      <h2 className="section-title">AI Climate Assistant</h2>
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '500px', padding: 0, overflow: 'hidden' }}>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {messages.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', gap: '15px', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
              <div style={{ background: msg.role === 'ai' ? 'var(--glass)' : 'var(--accent-purple)', padding: '10px', borderRadius: '50%', height: '40px', width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {msg.role === 'ai' ? <Bot size={20} /> : <User size={20} />}
              </div>
              <div style={{ background: msg.role === 'ai' ? 'rgba(255,255,255,0.05)' : 'var(--accent-purple)', padding: '12px 18px', borderRadius: '12px', maxWidth: '75%', lineHeight: 1.5 }}>
                {msg.text}
              </div>
            </motion.div>
          ))}
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', gap: '15px' }}>
              <div style={{ background: 'var(--glass)', padding: '10px', borderRadius: '50%', height: '40px', width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bot size={20} /></div>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px 18px', borderRadius: '12px' }}>Thinking...</div>
            </motion.div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', padding: '10px 20px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
          {SUGGESTIONS.map((s, i) => (
            <button key={i} onClick={() => handleSend(s)} style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', color: 'var(--accent-teal)', padding: '8px 15px', borderRadius: '20px', fontSize: '0.9rem', cursor: 'pointer' }} className="hover-glow">
              {s}
            </button>
          ))}
        </div>

        <div style={{ padding: '20px', borderTop: '1px solid var(--glass-border)', display: 'flex', gap: '10px', background: 'rgba(0,0,0,0.2)' }}>
          <input 
            type="text" 
            value={input} 
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend(input)}
            placeholder="Ask about the climate data..."
            style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'transparent', color: 'white', fontSize: '1rem', outline: 'none' }}
          />
          <button className="btn-primary hover-glow" onClick={() => handleSend(input)} disabled={loading}>
            <Send size={20} />
          </button>
        </div>

      </div>
    </div>
  );
}
