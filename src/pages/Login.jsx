import { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth';

import { useTheme } from '../context/useTheme';
import { FiArrowRight, FiLoader } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import LoadingScreen from '../components/LoadingScreen';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { activePalette } = useTheme();
  const { currentUser, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setIsMounted(true);
    // Check if user is already logged in and redirect
    if (currentUser) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    
    setLoading(true);

    try {
      await login(email, password);
      setLoading(false);
      setRedirecting(true);
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      setError(err.message || 'An error occurred during login. Please try again.');
      console.error('Login error:', err);
    } finally {
      if (!redirecting) {
        setLoading(false);
      }
    }
  };

  if (!isMounted) return null;
  if (redirecting) return <LoadingScreen />;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-emerald-50 via-white to-emerald-50 dark:from-slate-950 dark:via-brand-primary-dark/20 dark:to-slate-950 overflow-auto">
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-4">
        <div 
          className="relative w-full max-w-md mb-6"
        >
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden border border-gray-200/50 dark:border-gray-700/50 w-full max-w-sm">
            {/* Header Section */}
            <div className="px-6 pt-8 pb-4">
              <div className="flex justify-center mb-4">
                <img
                  src="/pwa-512x512.png"
                  alt="EcoRoute"
                  className="w-24 h-24 object-contain"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2">Welcome Back</h1>
                <p className="text-gray-600 dark:text-gray-400 text-center text-sm">Sign in to continue to EcoRoute</p>
              </div>
            </div>

            {/* Form Container */}
            <div className="px-8 py-2 relative">
              {error && (
                <div
                  className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border-l-4 border-red-500 text-red-700 dark:text-red-400 text-sm flex items-start gap-3 rounded-r-lg"
                >
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="flex-1">{error}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-6" autoComplete="off">
                {/* Email Field */}
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 text-left">
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="off"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`block w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 ${activePalette.focusRing} focus:border-transparent transition-all duration-200 text-sm`}
                    placeholder="Enter your email"
                    required
                  />
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 text-left">
                      Password
                    </label> 
                    <button
                      type="button"
                      className={`text-xs font-medium ${activePalette.googleButtonText} ${activePalette.googleButtonHoverText} transition-colors`}
                      onClick={() => {
                        // Add forgot password functionality here
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`block w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 ${activePalette.focusRing} focus:border-transparent transition-all duration-200 text-sm`}
                    placeholder="Enter your password"
                    required
                  />
                </div>

                {/* Remember me Checkbox */}
                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 group cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                      />
                      <div className={`w-9 h-5 bg-gray-300 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-gray-900 after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-4 after:w-4 after:transition-all ${activePalette.toggleBg}`}></div>
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Remember me</span>
                  </label>
                </div>

                {/* Sign In Button */}
                <div className="space-y-4 mt-6"> 
                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-3.5 px-6 ${activePalette.gradientFrom} ${activePalette.gradientTo} text-white font-medium rounded-lg hover:shadow-lg ${activePalette.shadow} hover:${activePalette.gradientFrom} hover:${activePalette.gradientTo} transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                  >
                    {loading ? (
                      <>
                        <FiLoader className="animate-spin w-5 h-5" />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <>
                        <span>Continue</span>
                        <FiArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400">Or continue with</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <span>Sign in with Google</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Sign Up Link */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Don't have an account?{' '}
                <button
                  onClick={() => navigate('/signup')} 
                  className={`font-medium ${activePalette.googleButtonText} ${activePalette.googleButtonHoverText} transition-colors hover:underline`}
                >
                  Sign up
                </button>
              </p>
            </div>

            {/* Terms and Privacy
            <div className="px-6 py-4 border-t border-gray-700">
              <p className="text-xs text-center text-gray-400">
                By continuing, you agree to our 
                <a href="#" className="text-emerald-400 hover:text-emerald-300 ml-1">Terms of Service</a> and 
                <a href="#" className="text-emerald-400 hover:text-emerald-300 ml-1">Privacy Policy</a>
              </p>
            </div> */}
          </div>
        </div>

    
        
        {/* Trust Badge */}
        <motion.div
          className="mt-4 flex items-center justify-center gap-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <p className="text-xs text-gray-600 dark:text-gray-500">
            Your data is securely encrypted and protected
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default Login;
