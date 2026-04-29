import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Smartphone, Loader2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../supabase';

const CollectorLogin = () => {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  React.useEffect(() => {
    // Check if collector is already logged in
    const existingAuth = localStorage.getItem('collector_auth');
    if (existingAuth) {
      navigate('/app');
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (pin.length !== 4) {
        throw new Error('PIN must be exactly 4 digits.');
      }
      
      // Normalize phone number before querying
      let rawPhone = phone.replace(/\s+/g, '').replace(/-/g, '');
      let normalizedPhone = rawPhone;
      
      if (rawPhone.startsWith('0')) {
        normalizedPhone = '+254' + rawPhone.substring(1);
      } else if (rawPhone.startsWith('254')) {
        normalizedPhone = '+' + rawPhone;
      } else if (!rawPhone.startsWith('+')) {
        normalizedPhone = '+' + rawPhone;
      }

      // Verify against Supabase 'collectors' table
      const { data: collectors, error: dbError } = await supabase
        .from('collectors')
        .select('*')
        .eq('phone', normalizedPhone)
        .eq('pin', pin)
        .single();

      if (dbError || !collectors) {
        throw new Error('Invalid phone number or PIN.');
      }

      // Update status to Active Now if it was Pending
      if (collectors.status === 'Pending First Login' || collectors.status === 'Offline') {
        await supabase
          .from('collectors')
          .update({ status: 'Active Now' })
          .eq('id', collectors.id);
      }

      // Store auth session
      const collectorSession = {
        id: collectors.id,
        name: collectors.name,
        phone: collectors.phone,
        role: 'collector',
        assigned_estates: [collectors.assigned_estate] 
      };

      localStorage.setItem('collector_auth', JSON.stringify(collectorSession));
      
      // Navigate to the standalone mobile app grid
      navigate('/app');
    } catch (err) {
      setError(err.message || 'An error occurred during login.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col justify-center px-6 py-12 lg:px-8 font-sans selection:bg-blue-500 selection:text-white">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sm:mx-auto sm:w-full sm:max-w-sm"
      >
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center border border-blue-500/30 shadow-[0_0_30px_rgba(37,99,235,0.2)]">
            <Smartphone className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <h2 className="text-center text-3xl font-black tracking-tight text-white">
          Field Access
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400 font-medium">
          Enter your mobile number and the 4-digit PIN provided by your Admin.
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm"
      >
        <form className="space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-4 rounded-xl text-sm font-bold flex items-center gap-2">
              <Shield className="w-4 h-4" />
              {error}
            </div>
          )}

          <div>
            <label htmlFor="phone" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Phone Number
            </label>
            <div className="mt-2">
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="block w-full rounded-xl border-0 bg-[#131B2C] px-4 py-3.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6 transition-all"
                placeholder="e.g. +254 712 345 678"
              />
            </div>
          </div>

          <div>
            <label htmlFor="pin" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              4-Digit PIN
            </label>
            <div className="mt-2">
              <input
                id="pin"
                name="pin"
                type="password"
                maxLength="4"
                pattern="\d{4}"
                required
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="block w-full rounded-xl border-0 bg-[#131B2C] px-4 py-3.5 text-center tracking-[1em] text-2xl font-black text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-all"
                placeholder="••••"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full justify-center items-center gap-2 rounded-xl bg-blue-600 px-3 py-4 text-sm font-bold leading-6 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Access Field App
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default CollectorLogin;