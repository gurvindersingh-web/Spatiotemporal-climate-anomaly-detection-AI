import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HeroPageV2 from './components/HeroPageV2';
import Dashboard from './components/Dashboard';
import GlobalAnomalyDetector from './components/GlobalAnomalyDetector';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  const [view, setView] = useState('hero'); // 'hero' | 'dashboard' | 'detector'

  return (
    <QueryClientProvider client={queryClient}>
      {view === 'hero' ? (
        <HeroPageV2
          onEnterDashboard={() => setView('dashboard')}
          onEnterDetector={() => setView('detector')}
        />
      ) : view === 'detector' ? (
        <GlobalAnomalyDetector onBack={() => setView('hero')} />
      ) : (
        <Dashboard onBackToHero={() => setView('hero')} />
      )}
    </QueryClientProvider>
  );
}

