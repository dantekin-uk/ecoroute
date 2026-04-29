import { useContext } from 'react';
import { ThemeContext } from './ThemeContextBase';

export const useTheme = () => useContext(ThemeContext);
