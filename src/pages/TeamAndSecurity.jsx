import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Users, Activity, CheckCircle2, Phone, Map, X, Plus, MessageSquare, Key, RefreshCcw, Trash2, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/useTheme';
import { supabase } from '../supabase';
import PageHeader from '../components/layout/PageHeader';
import PageStatGrid from '../components/layout/PageStatGrid';
import PageStatCard from '../components/layout/PageStatCard';

const TeamAndSecurity = () => {
  const { activePalette } = useTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCollector, setNewCollector] = useState({ name: '', phone: '', estate: '' });
  const [generatedPin, setGeneratedPin] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [collectors, setCollectors] = useState([]);
  const [estates, setEstates] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [smsStatus, setSmsStatus] = useState({ id: null, loading: false, success: false, error: null });

  useEffect(() => {
    fetchIncidents();
    fetchCollectorsAndEstates();

    const incidentSub = supabase
      .channel('incidents-channel')
      .on('postgres_changes', { event: '*', table: 'transactions', schema: 'public' }, () => {
        fetchIncidents();
      })
      .subscribe();

    const collectorsSub = supabase
      .channel('collectors-channel')
      .on('postgres_changes', { event: '*', table: 'collectors', schema: 'public' }, () => {
        fetchCollectorsAndEstates();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(incidentSub);
      supabase.removeChannel(collectorsSub);
    };
  }, []);

  const fetchCollectorsAndEstates = async () => {
    try {
      // 1. Fetch Estates for the dropdown
      const { data: estatesData } = await supabase.from('estates').select('*');
      if (estatesData) setEstates(estatesData);

      // 2. Fetch Collectors and calculate their live cash
      const { data: collectorsData, error: collectorsError } = await supabase.from('collectors').select('*').order('created_at', { ascending: false });
      if (collectorsError && collectorsError.code !== '42P01') throw collectorsError; // Ignore if table doesn't exist yet
      
      if (collectorsData) {
        // Fetch all transactions to calculate cash
        const { data: txData } = await supabase.from('transactions').select('*').like('payment_method', 'Cash%');
        
        const enhancedCollectors = collectorsData.map(c => {
          const collectorCash = (txData || [])
            .filter(
              (tx) =>
                tx.collector_name === c.name && tx.payment_method?.includes('(Pending)')
            )
            .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

          return {
            ...c,
            cash: collectorCash,
            route: estatesData?.find(e => e.id === c.assigned_estate)?.name || c.assigned_estate || 'Unknown Route'
          };
        });
        setCollectors(enhancedCollectors);
      }
    } catch (err) {
      console.error('Error fetching collectors:', err);
    }
  };

  const fetchIncidents = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .like('payment_method', 'Incident:%')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIncidents(data || []);
    } catch (err) {
      console.error('Error fetching incidents:', err);
    }
  };

  const handleBlastSMS = async (incident) => {
    setSmsStatus({ id: incident.id, loading: true, success: false, error: null });
    
    try {
      // 1. Find the estate ID first
      const { data: estateData } = await supabase.from('estates').select('id').eq('name', incident.estate_name).single();
      
      if (!estateData) throw new Error('Estate not found');

      // 2. Find the tenant and their phone number
      const { data: tenants } = await supabase.from('tenants').select('*').eq('estate_id', estateData.id);
      
      const tenant = tenants?.find(t => {
        const hId = t.door_number ? `${t.block_number}-${t.door_number}` : t.block_number;
        return hId === incident.house_number;
      });

      if (!tenant || !tenant.phone_number) {
        throw new Error('Tenant phone number not found in database');
      }

      // Mocking the SMS API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log(`SMS Sent to ${tenant.phone_number}: Alert regarding Door ${incident.house_number}`);
      setSmsStatus({ id: incident.id, loading: false, success: true, error: null });
      
      // Clear success message after 3 seconds
      setTimeout(() => setSmsStatus({ id: null, loading: false, success: false, error: null }), 3000);

    } catch (err) {
      console.error('SMS Error:', err);
      setSmsStatus({ id: incident.id, loading: false, success: false, error: err.message });
      // Clear error after 4 seconds
      setTimeout(() => setSmsStatus({ id: null, loading: false, success: false, error: null }), 4000);
    }
  };

  const handleResolveIncident = async (id) => {
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      fetchIncidents();
    } catch (err) {
      alert(`Error resolving incident: ${err.message}`);
    }
  };

  const handleClearAllIncidents = async () => {
    if (!window.confirm('Are you sure you want to clear ALL live incidents? This cannot be undone.')) return;
    try {
      const ids = incidents.map(i => i.id);
      const { error } = await supabase.from('transactions').delete().in('id', ids);
      if (error) throw error;
      fetchIncidents();
    } catch (err) {
      alert(`Error clearing incidents: ${err.message}`);
    }
  };

  // Calculate stats from real data
  const activeStaff = collectors.filter(c => c.status === 'Active Now').length;
  const totalStaff = collectors.length;
  const cashAtRisk = collectors.reduce((sum, c) => sum + (c.cash || 0), 0);

  const stats = {
    cashAtRisk: cashAtRisk,
    activeStaff: `${activeStaff}/${totalStaff}`,
    openIncidents: incidents.length
  };

  const handleGeneratePin = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Normalize phone number to +254 format
    let rawPhone = newCollector.phone.replace(/\s+/g, '').replace(/-/g, '');
    let normalizedPhone = rawPhone;
    
    if (rawPhone.startsWith('0')) {
      normalizedPhone = '+254' + rawPhone.substring(1);
    } else if (rawPhone.startsWith('254')) {
      normalizedPhone = '+' + rawPhone;
    } else if (!rawPhone.startsWith('+')) {
      normalizedPhone = '+' + rawPhone;
    }
    
    // Basic validation for Kenyan numbers (either 07xx, 01xx, +2547xx, +2541xx)
    if (!/^\+254[17]\d{8}$/.test(normalizedPhone)) {
      alert('Please enter a valid Kenyan phone number (e.g., 0712345678 or +254712345678)');
      setIsSubmitting(false);
      return;
    }
    
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    
    try {
      // Check if table exists by attempting to insert
      const { error } = await supabase
        .from('collectors')
        .insert([{
          name: newCollector.name,
          phone: normalizedPhone,
          assigned_estate: newCollector.estate,
          pin: pin,
          status: 'Pending First Login'
        }]);

      if (error) {
        if (error.code === '42P01') {
          console.error("The 'collectors' table does not exist in Supabase yet. Please create it with columns: id, created_at, name, phone, assigned_estate, pin, status.");
          alert("Database configuration missing: Please create the 'collectors' table in Supabase.");
          setIsSubmitting(false);
          return;
        }
        throw error;
      }

      setGeneratedPin(pin);
      fetchCollectorsAndEstates(); // Refresh list
    } catch (err) {
      console.error('Error adding collector:', err);
      alert(`Error creating collector: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPin = async (collector) => {
    const newPin = Math.floor(1000 + Math.random() * 9000).toString();
    if (window.confirm(`Are you sure you want to reset the PIN for ${collector.name}? A new 4-digit PIN will be generated.`)) {
      try {
        const { error } = await supabase
          .from('collectors')
          .update({ 
            pin: newPin,
            status: 'Pending First Login' // Reset status so they have to login again
          })
          .eq('id', collector.id);

        if (error) throw error;
        alert(`New PIN for ${collector.name} is: ${newPin}. Please share this with them.`);
        fetchCollectorsAndEstates();
      } catch (err) {
        alert(`Error resetting PIN: ${err.message}`);
      }
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setGeneratedPin(null);
    setNewCollector({ name: '', phone: '', estate: '' });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1920px] mx-auto min-h-screen space-y-6 font-sans">
      <PageHeader
        icon={Shield}
        iconClassName="text-blue-600 dark:text-blue-500"
        iconBgClassName="bg-blue-100 dark:bg-blue-500/20"
        title="Team & Security"
        subtitle="Collectors, cash risk, and incidents — live from Supabase"
        actions={
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex-shrink-0 flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl shadow-lg hover:bg-blue-700 font-semibold text-sm"
          >
            <Plus className="h-4 w-4" />
            Add Collector
          </button>
        }
      />

      <PageStatGrid columns={3}>
        <PageStatCard
          label="Cash at Risk"
          value={`KES ${stats.cashAtRisk.toLocaleString()}`}
          subtitle="Pending cash in field"
          icon={AlertTriangle}
          valueClassName="text-rose-600 dark:text-rose-500"
          iconClassName="text-rose-600 dark:text-rose-400"
          iconBgClassName="bg-rose-100 dark:bg-rose-500/20"
        />
        <PageStatCard
          label="Active Staff"
          value={stats.activeStaff}
          icon={Users}
          iconClassName="text-blue-600 dark:text-blue-400"
          iconBgClassName="bg-blue-100 dark:bg-blue-500/20"
        />
        <PageStatCard
          label="Open Incidents"
          value={`${incidents.length}`}
          subtitle="From collector portal"
          icon={Activity}
          valueClassName="text-amber-600 dark:text-amber-500"
          iconClassName="text-amber-600 dark:text-amber-400"
          iconBgClassName="bg-amber-100 dark:bg-amber-500/20"
        />
      </PageStatGrid>

      {/* Live Incident Feed */}
      <div className="bg-white/80 dark:bg-[#1E293B]/30 backdrop-blur-xl border border-gray-200/60 dark:border-slate-700/50 rounded-2xl shadow-xl overflow-hidden flex flex-col">
        <div className="p-5 border-b border-gray-200/60 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-white">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Live Incident Feed
            </h2>
            <span className="bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-500/20">
              {incidents.length} Open
            </span>
          </div>
          {incidents.length > 0 && (
            <button 
              onClick={handleClearAllIncidents}
              className="flex items-center gap-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-transparent hover:border-rose-200 dark:hover:border-rose-500/30"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          )}
        </div>
        <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-2">
          {incidents.length > 0 ? (
            <div className="space-y-3 p-3">
              {incidents.map((incident) => {
                const issueText = incident.payment_method.replace('Incident: ', '');
                const isThisSms = smsStatus.id === incident.id;
                
                return (
                  <div key={incident.id} className="bg-gray-50 dark:bg-[#1E293B]/50 border border-gray-200/60 dark:border-slate-700/50 rounded-xl p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 transition-all hover:shadow-md">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1 p-2.5 bg-amber-100 dark:bg-amber-500/20 rounded-xl border border-amber-200 dark:border-amber-500/30">
                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-900 dark:text-white font-medium leading-relaxed">
                          <span className="font-bold text-amber-600 dark:text-amber-500">Alert:</span> {incident.collector_name} reported <span className="font-bold">Door {incident.house_number}</span> at {incident.estate_name}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-md text-gray-700 dark:text-gray-300 uppercase tracking-wider">Reason: {issueText}</span>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold flex items-center gap-1">
                            <Activity className="w-3 h-3" />
                            {new Date(incident.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full lg:w-auto">
                      <div className="relative flex-1 lg:flex-none">
                        <button 
                          disabled={smsStatus.loading}
                          onClick={() => handleBlastSMS(incident)}
                          className={`w-full lg:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm whitespace-nowrap border ${
                            smsStatus.success && isThisSms
                              ? 'bg-emerald-500 text-white border-emerald-400'
                              : smsStatus.error && isThisSms
                              ? 'bg-rose-500 text-white border-rose-400'
                              : 'bg-white dark:bg-[#0B0F19] border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {smsStatus.loading && isThisSms ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Sending...
                            </>
                          ) : smsStatus.success && isThisSms ? (
                            <>
                              <Check className="w-4 h-4" />
                              SMS Sent!
                            </>
                          ) : smsStatus.error && isThisSms ? (
                            <>
                              <AlertTriangle className="w-4 h-4" />
                              Failed
                            </>
                          ) : (
                            <>
                              <MessageSquare className="w-4 h-4" />
                              Blast SMS
                            </>
                          )}
                        </button>
                        
                        {smsStatus.error && isThisSms && (
                          <div className="absolute top-full left-0 right-0 mt-2 z-10">
                            <div className="bg-rose-500 text-white text-[10px] p-2 rounded-lg shadow-xl font-bold text-center animate-bounce">
                              {smsStatus.error}
                            </div>
                          </div>
                        )}
                      </div>

                      <button 
                        onClick={() => handleResolveIncident(incident.id)}
                        className="flex items-center justify-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
                        title="Mark as Resolved"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Resolve
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                <Check className="w-8 h-8 text-emerald-500" />
              </div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">All clear!</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">No open incidents at this time.</p>
            </div>
          )}
        </div>
      </div>

      {/* 2. Collector Risk Matrix */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-white">
          <Activity className="w-5 h-5 text-blue-500" />
          Live Cash Monitoring
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {collectors.filter(c => c.status === 'Active Now').length === 0 ? (
            <div className="col-span-full bg-white/80 dark:bg-[#1E293B]/30 backdrop-blur-xl border border-gray-200/60 dark:border-slate-700/50 rounded-2xl p-8 text-center text-gray-500 dark:text-gray-400">
              No collectors are currently online.
            </div>
          ) : collectors.filter(c => c.status === 'Active Now').map((collector) => {
            const isCritical = collector.cash > 10000;
            const isWarning = collector.cash > 5000 && collector.cash <= 10000;
            const isSafe = collector.cash <= 5000;

            return (
              <div 
                key={collector.id}
                className={`
                  bg-white/80 dark:bg-[#1E293B]/30 backdrop-blur-xl rounded-2xl p-5 shadow-xl flex flex-col transition-all duration-300
                  ${isCritical ? 'border-2 border-rose-500 dark:border-rose-500 shadow-[0_0_15px_rgba(225,29,72,0.15)] animate-pulse' : ''}
                  ${isWarning ? 'border-2 border-amber-400 dark:border-amber-500/50' : ''}
                  ${isSafe ? 'border border-gray-200/60 dark:border-slate-700/50' : ''}
                `}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg flex items-center gap-2">
                      {collector.name}
                      {collector.isOnline && (
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1 mt-1">
                      <Map className="w-3 h-3" />
                      {collector.route}
                    </p>
                  </div>
                </div>

                <div className="mt-auto">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Live Cash Balance</p>
                  <p className={`text-2xl font-black ${
                    isCritical ? 'text-rose-600 dark:text-rose-500' : 
                    isWarning ? 'text-amber-600 dark:text-amber-500' : 
                    'text-emerald-600 dark:text-emerald-500'
                  }`}>
                    KES {collector.cash.toLocaleString()}
                  </p>
                  
                  {isCritical && (
                    <button className="mt-4 w-full bg-rose-100 dark:bg-rose-500/10 hover:bg-rose-200 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/50 text-rose-700 dark:text-rose-500 font-bold py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Force Cash-Out
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Team Onboarding & App Access */}
      <div className="bg-white/80 dark:bg-[#1E293B]/30 backdrop-blur-xl border border-gray-200/60 dark:border-slate-700/50 rounded-2xl shadow-xl overflow-hidden flex flex-col">
        <div className="p-5 border-b border-gray-200/60 dark:border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-white">
            <Users className="w-5 h-5 text-blue-500" />
            Staff Directory & Access Control
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider border-b border-gray-200/60 dark:border-white/10 bg-gray-50/50 dark:bg-slate-800/20">
                <th className="py-4 px-6 font-semibold">Name</th>
                <th className="py-4 px-6 font-semibold">Phone Number</th>
                <th className="py-4 px-6 font-semibold">Assigned Route</th>
                <th className="py-4 px-6 font-semibold">Access PIN</th>
                <th className="py-4 px-6 font-semibold">App Status</th>
                <th className="py-4 px-6 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/60 dark:divide-white/5 relative">
              {collectors.map((collector) => (
                <tr key={collector.id} className="hover:bg-gray-50/80 dark:hover:bg-white/5 transition-colors group">
                  <td className="py-4 px-6 whitespace-nowrap font-bold text-gray-900 dark:text-white">{collector.name}</td>
                  <td className="py-4 px-6 whitespace-nowrap text-gray-600 dark:text-gray-400 flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                    {collector.phone || '+254 7XX XXX XXX'}
                  </td>
                  <td className="py-4 px-6 whitespace-nowrap text-gray-600 dark:text-gray-400">{collector.route}</td>
                  <td className="py-4 px-6 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono text-sm font-bold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                        {collector.pin}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                      collector.status === 'Active Now' 
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' 
                        : collector.status === 'Pending First Login'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-500/10 dark:text-slate-400 border-slate-200 dark:border-slate-500/20'
                    }`}>
                      {collector.status === 'Active Now' && <CheckCircle2 className="w-3 h-3" />}
                      {collector.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleResetPin(collector)}
                        className="text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border border-transparent hover:border-blue-200 dark:hover:border-blue-500/30 flex items-center gap-1.5"
                        title="Reset PIN"
                      >
                        <RefreshCcw className="w-3.5 h-3.5" />
                        Reset PIN
                      </button>
                      <button
                        onClick={async () => {
                          if (window.confirm(`Are you sure you want to permanently delete collector ${collector.name}?`)) {
                            try {
                              const { error } = await supabase.from('collectors').delete().eq('id', collector.id);
                              if (error) throw error;
                            } catch (err) {
                              alert(`Error deleting collector: ${err.message}`);
                            }
                          }
                        }}
                        className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border border-transparent hover:border-rose-200 dark:hover:border-rose-500/30"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. The Onboarding Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={handleCloseModal}
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Add New Collector</h3>
                <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {!generatedPin ? (
                  <form id="add-collector-form" onSubmit={handleGeneratePin} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Full Name</label>
                      <input 
                        type="text" 
                        required
                        value={newCollector.name}
                        onChange={(e) => setNewCollector({...newCollector, name: e.target.value})}
                        className={`block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${activePalette?.focusRing || 'focus:ring-blue-500'} text-sm`}
                        placeholder="e.g. David Ochieng"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Phone Number</label>
                      <input 
                        type="tel" 
                        required
                        value={newCollector.phone}
                        onChange={(e) => setNewCollector({...newCollector, phone: e.target.value})}
                        className={`block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${activePalette?.focusRing || 'focus:ring-blue-500'} text-sm`}
                        placeholder="+254..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Assigned Estate</label>
                      <select 
                        required
                        value={newCollector.estate}
                        onChange={(e) => setNewCollector({...newCollector, estate: e.target.value})}
                        className={`block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${activePalette?.focusRing || 'focus:ring-blue-500'} text-sm`}
                      >
                        <option value="">Select Estate...</option>
                        {estates.map(e => (
                          <option key={e.id} value={e.id}>{e.name}</option>
                        ))}
                      </select>
                    </div>
                  </form>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-blue-50 dark:bg-blue-500/10 border-2 border-blue-200 dark:border-blue-500/30 rounded-2xl p-6 text-center relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />
                    <p className="text-sm font-bold text-blue-600 dark:text-blue-500 uppercase tracking-wider mb-2">Mobile App PIN</p>
                    <div className="text-5xl font-black text-gray-900 dark:text-white tracking-[0.2em] mb-4">
                      {generatedPin}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium bg-white/50 dark:bg-gray-900/50 inline-block px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-500/20">
                      Give this PIN to the collector to log into the mobile app.
                    </p>
                  </motion.div>
                )}
              </div>

              <div className="p-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex gap-3">
                <button 
                  onClick={handleCloseModal}
                  className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold py-2.5 rounded-xl transition-colors text-sm shadow-sm"
                >
                  Cancel
                </button>
                {!generatedPin ? (
                  <button 
                    type="submit"
                    form="add-collector-form"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition-all shadow-lg text-sm"
                  >
                    Create Account
                  </button>
                ) : (
                  <button 
                    onClick={handleCloseModal}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-xl transition-all shadow-lg text-sm flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Done
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
    </div>
  );
};

export default TeamAndSecurity;