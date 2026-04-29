import React, { useEffect, useState } from 'react';
import { techyColorPalettes, defaultPaletteKey } from '../theme'; // Import palettes
import { ThemeContext } from './ThemeContextBase'; // Import from Base

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark'; // Check for dark mode preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const activePaletteKey = (() => {
    const savedPalette = localStorage.getItem('colorPalette');
    return savedPalette && techyColorPalettes[savedPalette] ? savedPalette : defaultPaletteKey;
  })();
  const activePalette = techyColorPalettes[activePaletteKey];

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]); // Re-run when dark mode changes

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, activePalette, techyColorPalettes }}>
      {children}
    </ThemeContext.Provider>
  );
};