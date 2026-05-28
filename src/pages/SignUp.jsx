import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
 
import { useTheme } from '../context/useTheme';
import { FiMail, FiLock, FiUser, FiArrowRight, FiLoader } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import LoadingScreen from '../components/LoadingScreen';

function SignUp() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const { activePalette } = useTheme();
  const { user } = useAuth();

  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSignUp = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password should be at least 6 characters')
      return
    }

    if (!agreeToTerms) {
      setError('You must agree to the terms and conditions')
      return
    }

    setLoading(true)

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName }
        }
      });
      if (signUpError) throw signUpError;

      setLoading(false);
      setRedirecting(true);
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      setError(err.message || 'An error occurred during sign up. Please try again.');
      console.error('Signup error:', err);
    } finally {
      if (!redirecting) {
        setLoading(false);
      }
    }
  }

  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) return null
  if (redirecting) return <LoadingScreen />

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-auto">
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
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2">Create Account</h1>
              <p className="text-gray-600 dark:text-gray-400 text-center text-sm">Join EcoRoute and start your journey</p>
            </div>
          </div>

          {/* Form Container */}
          <div className="px-6 py-2 relative">
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

            <form onSubmit={handleSignUp} className="space-y-5">
              {/* Full Name Field */}
              <div className="space-y-1.5">
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 text-left">
                  Full Name
                </label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={`block w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 ${activePalette.focusRing} focus:border-transparent transition-all duration-200 text-sm`}
                    placeholder="John Doe"
                    required
                  />
                </div>

                {/* Email Field */}
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 text-left">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`block w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 ${activePalette.focusRing} focus:border-transparent transition-all duration-200 text-sm`}
                    placeholder="Enter your email"
                    required
                  />
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 text-left">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`block w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 ${activePalette.focusRing} focus:border-transparent transition-all duration-200 text-sm`}
                    placeholder="Create a password"
                    required
                  />
                </div>

                {/* Confirm Password Field */}
                <div className="space-y-1.5">
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 text-left">
                    Confirm Password
                  </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`block w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 ${activePalette.focusRing} focus:border-transparent transition-all duration-200 text-sm`}
                  placeholder="Confirm your password"
                  required
                />
              </div>

              {/* Terms Checkbox */}
              <div className="pt-2">
                <div className="flex items-start gap-3 pt-2">
                  <div className="flex items-center h-5 mt-0.5">
                    <input
                      id="terms"
                      type="checkbox"
                      checked={agreeToTerms}
                      onChange={(e) => setAgreeToTerms(e.target.checked)}
                      className={`w-4 h-4 ${activePalette.activeText} bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded ${activePalette.focusRing} focus:ring-2`}
                      required
                    />
                  </div>
                  <label htmlFor="terms" className="text-sm text-gray-700 dark:text-gray-300">
                    I agree to the <a href="#" className={`font-medium ${activePalette.googleButtonText} ${activePalette.googleButtonHoverText} hover:underline`}>Terms of Service</a> and <a href="#" className={`font-medium ${activePalette.googleButtonText} ${activePalette.googleButtonHoverText} hover:underline`}>Privacy Policy</a>
                  </label>
                </div>
                {error && error.includes('terms and conditions') && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">You must agree to the terms and conditions</p>
                )}
              </div>

              {/* Create Account Button */}
              <div className="space-y-4 mt-6">
                {error && !error.includes('terms and conditions') && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3.5 px-6 ${activePalette.gradientFrom} ${activePalette.gradientTo} text-white font-medium rounded-lg hover:shadow-lg ${activePalette.shadow} hover:${activePalette.gradientFrom} hover:${activePalette.gradientTo} transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                >
                  {loading ? (
                    <>
                      <FiLoader className="animate-spin w-5 h-5" />
                      <span>Creating account...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Account</span>
                      <FiArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400">Or sign up with</span>
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
                  <span>Continue with Google</span>
                </button>
              </div>
            </form>
          </div>

          {/* Terms and Privacy */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-center text-gray-600 dark:text-gray-400">
              By creating an account, you agree to our
              <a href="#" className={`${activePalette.googleButtonText} ${activePalette.googleButtonHoverText} ml-1`}>Terms of Service</a> and
              <a href="#" className={`${activePalette.googleButtonText} ${activePalette.googleButtonHoverText} ml-1`}>Privacy Policy</a>
            </p>
          </div>
        </div>
        {/* Sign In Link */}
        <div className="w-full max-w-sm text-center pt-4 mb-6">
          <p className="text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <button
              onClick={() => navigate('/login')}
              className={`ml-1 px-2 py-1 text-sm font-medium ${activePalette.googleButtonText} ${activePalette.googleButtonHoverText} transition-colors hover:underline ${activePalette.googleButtonBg} rounded-md border ${activePalette.googleButtonBorder}`}
            >
              Sign in
            </button>
          </p>
        </div>

      {/* Trust Badge */}
      <div
        className="mt-8 flex items-center justify-center gap-2"
      >
        <p className="text-xs text-gray-600 dark:text-gray-500">
          Your data is securely encrypted and protected
        </p>
      </div>
        </div>
      </div>
    </div>
  )
}

export default SignUp
