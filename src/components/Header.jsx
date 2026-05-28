// src/components/Header.jsx
import { useState } from 'react';
import { Search, Moon, Sun, Menu, X, User, LogOut, Settings, Bell } from 'lucide-react'; // Removed Palette icon
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/useTheme';
import { useAuth } from '../context/AuthContext';

const Header = ({ onMenuClick, isMobileMenuOpen }) => {
  const { isDarkMode, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <HeaderContent
      onMenuClick={onMenuClick}
      isMobileMenuOpen={isMobileMenuOpen}
      isDarkMode={isDarkMode}
      toggleTheme={toggleTheme}
      user={user}
      onSignOut={handleSignOut}
    />
  );
};

// New component to encapsulate header content and use theme context
const HeaderContent = ({
  onMenuClick,
  isMobileMenuOpen,
  isDarkMode,
  toggleTheme,
  user,
  onSignOut,
}) => {
  const { activePalette } = useTheme(); // Removed setPalette and techyColorPalettes
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  return (
    <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 transition-all duration-300 sticky top-0 z-30">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left section - Mobile menu toggle */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={onMenuClick}
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              className={`menu-toggle-btn inline-flex p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 focus:outline-none focus:ring-2 ${activePalette.focusRing} focus:ring-offset-2`}
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
          {/* Center section - Search Bar */}
          <div className="flex-1 max-w-2xl mx-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="search"
                name="search"
                className="block w-full pl-10 pr-4 py-2.5 border-0 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:bg-white dark:focus:bg-gray-800 transition-all duration-200 shadow-sm"
                placeholder="Search..." 
                type="search"
              />
            </div>
          </div>

          {/* Right section - Controls */}
          <div className="flex items-center space-x-3"> 
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'} 
            >
              {isDarkMode ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>

            {/* Notifications */}
            <button className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 relative">
              <span className={`absolute top-1.5 right-1.5 h-2.5 w-2.5 ${activePalette.activeBorder} rounded-full ring-2 ring-white dark:ring-gray-900`}></span>
              <Bell className="h-5 w-5" />
            </button>

            {/* Profile dropdown */}
            <div className="relative">
              <button
                type="button"
                className="flex items-center focus:outline-none"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                <span className="sr-only">Open user menu</span>
                {user?.photoURL ? (
                  <img
                    className="h-9 w-9 rounded-xl border-2 border-white dark:border-gray-800 shadow-sm"
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                  /> 
                ) : ( // Fallback avatar with dynamic gradient
                  <div className={`h-9 w-9 rounded-xl ${activePalette.avatarFallbackGradient} flex items-center justify-center text-white font-medium`}>
                    {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
              </button>

              {/* Dropdown menu */}
              {showProfileMenu && (
                <div className="origin-top-right absolute right-0 mt-2 w-64 rounded-xl shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black/5 dark:ring-white/10 overflow-hidden z-50 transition-all duration-200 transform opacity-100 scale-100">
                  <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center space-x-3">
                      {user?.photoURL ? (
                        <img
                          className="h-10 w-10 rounded-lg"
                          src={user.photoURL}
                          alt={user.displayName || 'User'}
                        />
                      ) : (
                        <div className={`h-10 w-10 rounded-lg ${activePalette.avatarFallbackGradient} flex items-center justify-center text-white font-medium`}>
                          {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{user?.displayName || 'User'}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {user?.email || 'No email'}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="py-1">
                    <a
                      href="/profile"
                      className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50 transition-colors duration-150"
                    >
                      <User className="mr-3 h-5 w-5 text-gray-400" />
                      Your Profile
                    </a>
                    <a
                      href="/settings"
                      className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50 transition-colors duration-150"
                    >
                      <Settings className="mr-3 h-5 w-5 text-gray-400" />
                      Settings
                    </a>
                    <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                    <button
                      onClick={onSignOut}
                      className="w-full flex items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 transition-colors duration-150"
                    >
                      <LogOut className="mr-3 h-5 w-5" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
