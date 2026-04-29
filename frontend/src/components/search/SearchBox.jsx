/**
 * SearchBox — Always-visible search input with debounced geocoding autocomplete.
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Search, X, Loader2, MapPin, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { searchCities } from '../../utils/openMeteoApi.js';

export default function SearchBox({ onCitySelect, value, onChange }) {
  const [results, setResults] = useState([]);
  const [showDrop, setShowDrop] = useState(false);
  const [searching, setSearching] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const debounceRef = useRef(null);
  const dropRef = useRef(null);
  const inputRef = useRef(null);

  /* Debounced geocoding */
  const handleInput = useCallback((val) => {
    onChange?.(val);
    clearTimeout(debounceRef.current);
    setHighlightIdx(-1);
    if (val.trim().length < 2) {
      setResults([]);
      setShowDrop(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await searchCities(val, 6);
        setResults(r);
        setShowDrop(r.length > 0);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [onChange]);

  /* Select a city */
  const selectCity = useCallback((city) => {
    setShowDrop(false);
    setResults([]);
    onChange?.(`${city.name}, ${city.country || ''}`);
    onCitySelect?.(city);
  }, [onCitySelect, onChange]);

  /* Keyboard navigation */
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      setShowDrop(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx((p) => Math.min(p + 1, results.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx((p) => Math.max(p - 1, 0));
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIdx >= 0 && results[highlightIdx]) {
        selectCity(results[highlightIdx]);
      } else if (results.length > 0) {
        selectCity(results[0]);
      }
    }
  }, [results, highlightIdx, selectCity]);

  /* Click outside */
  useEffect(() => {
    const h = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setShowDrop(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  /* Ctrl+K to focus */
  useEffect(() => {
    const h = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);

  return (
    <div className="scad-search-wrapper" ref={dropRef}>
      <div className="scad-search-field">
        {searching ? (
          <Loader2 size={16} className="scad-search-icon spinning" />
        ) : (
          <Search size={16} className="scad-search-icon" />
        )}
        <input
          ref={inputRef}
          type="text"
          id="scad-city-search"
          role="combobox"
          aria-expanded={showDrop}
          aria-autocomplete="list"
          aria-label="Search any city worldwide"
          value={value || ''}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => results.length > 0 && setShowDrop(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search any city worldwide... (e.g. Mumbai, Paris, Tokyo)"
          className="scad-search-input"
        />
        {value && (
          <button
            className="scad-search-clear"
            onClick={() => { onChange?.(''); setResults([]); setShowDrop(false); }}
            aria-label="Clear search"
          >
            <X size={13} />
          </button>
        )}
        <kbd className="scad-search-kbd">⌘K</kbd>
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {showDrop && results.length > 0 && (
          <motion.div
            className="scad-search-dropdown"
            role="listbox"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            {results.map((r, i) => (
              <button
                key={r.id || i}
                role="option"
                aria-selected={i === highlightIdx}
                onClick={() => selectCity(r)}
                className={`scad-search-item ${i === highlightIdx ? 'highlighted' : ''}`}
              >
                <MapPin size={14} className="scad-search-item-icon" />
                <div className="scad-search-item-text">
                  <span className="scad-search-item-name">{r.name}</span>
                  <span className="scad-search-item-region">
                    {[r.admin1, r.country].filter(Boolean).join(', ')}
                  </span>
                </div>
                <span className="scad-search-item-coords">
                  {r.latitude?.toFixed(2)}°, {r.longitude?.toFixed(2)}°
                </span>
                <ChevronRight size={13} className="scad-search-item-arrow" />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
