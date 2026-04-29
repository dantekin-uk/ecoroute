import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Check, X, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '../supabase';
import { AuthContext } from '../context/AuthContextBase';

const MobileCollectorGrid = () => {
  const { currentUser } = useContext(AuthContext) || {};
  const [estates, setEstates] = useState([]);
  const [activeEstate, setActiveEstate] = useState(null);
  const [houses, setHouses] = useState([]);
  const [selectedHouse, setSelectedHouse] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showIssueMenu, setShowIssueMenu] = useState(false);
  const [allCollectors, setAllCollectors] = useState([]);
  const [selectedAdminCollector, setSelectedAdminCollector] = useState('Admin'); // Admin can choose who they are logging as

  // Check if this is a dedicated field agent (logged in via /collector-login)
  const collectorAuthStr = localStorage.getItem('collector_auth');
  const collectorAuth = collectorAuthStr ? JSON.parse(collectorAuthStr) : null;
  // If currentUser is present (Admin), they get full access, ignore collectorAuth
  const isAdmin = !!currentUser;
  const isDedicatedCollector = !isAdmin && !!collectorAuth;
  
  // Determine the name to log transactions under
  const collectorName = isDedicatedCollector ? collectorAuth.name : selectedAdminCollector;

  useEffect(() => {
    if (!isDedicatedCollector && !isAdmin) {
      window.location.href = '/collector-login';
    }
  }, [isDedicatedCollector, isAdmin]);

  useEffect(() => {
    fetchData();

    // If Admin, fetch all collectors so they can masquerade as them
    if (isAdmin) {
      const fetchCollectors = async () => {
        const { data } = await supabase.from('collectors').select('name');
        if (data) {
          setAllCollectors([{ name: 'Admin' }, ...data]);
        }
      };
      fetchCollectors();
    }

    const subscription = supabase
      .channel('mobile-grid-changes')
      .on('postgres_changes', { event: '*', table: 'tenants', schema: 'public' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchData = async () => {
    try {
      const { data: rawEstatesData, error: estatesError } = await supabase.from('estates').select('*').order('created_at', { ascending: true });
      if (estatesError) throw estatesError;

      let estatesData = rawEstatesData;
      if (isDedicatedCollector && collectorAuth.assigned_estates) {
        // Filter strictly to what the collector is assigned to
        estatesData = rawEstatesData.filter(e => 
          collectorAuth.assigned_estates.includes(e.id) || 
          collectorAuth.assigned_estates.includes(e.name.toLowerCase())
        );
        // Fallback if none match
        if (estatesData.length === 0 && rawEstatesData.length > 0) {
          estatesData = [rawEstatesData[0]]; 
        }
      }

      const { data: tenantsData, error: tenantsError } = await supabase.from('tenants').select('*');
      if (tenantsError) throw tenantsError;

      if (estatesData && estatesData.length > 0) {
        setEstates(estatesData);
        // Default to first estate if none selected
        const currentEstate = activeEstate || estatesData[0];
        if (!activeEstate) setActiveEstate(currentEstate);

        if (tenantsData) {
          const estateTenants = tenantsData
            .filter(t => t.estate_id === currentEstate.id)
            .map(t => ({
              id: t.door_number ? `${t.block_number}-${t.door_number}` : t.block_number,
              tenantId: t.id,
              balance: Number(t.current_balance),
              name: t.tenant_name,
              rate: Number(t.monthly_rate)
            }))
            .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
          setHouses(estateTenants);
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // When active estate changes, refetch or filter
  useEffect(() => {
    if (activeEstate) {
      fetchData();
    }
  }, [activeEstate]);

  const pendingDoors = houses.filter((h) => h.balance < 0).length;

  const handleHouseClick = (house) => {
    if (house.balance < 0) {
      setSelectedHouse(house);
    }
  };

  const handleCloseSheet = () => {
    if (!isSubmitting) {
      setSelectedHouse(null);
      setShowIssueMenu(false);
    }
  };

  const handleReportIssue = async (issueType) => {
    if (!selectedHouse) return;
    setIsSubmitting(true);

    try {
      const { error: txError } = await supabase
        .from('transactions')
        .insert([{
          house_number: selectedHouse.id,
          estate_name: activeEstate.name,
          amount: 0,
          payment_method: `Incident: ${issueType}`,
          collector_name: collectorName,
          resulting_balance: selectedHouse.balance
        }]);

      if (txError) throw txError;

      alert(`Issue reported: ${issueType}`);
      handleCloseSheet();
    } catch (err) {
      console.error('Issue Report Error:', err);
      alert(`Error reporting issue: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogPayment = async (method) => {
    if (!selectedHouse) return;
    setIsSubmitting(true);
    
    // The amount to pay is the absolute value of the negative balance
    const amount = Math.abs(selectedHouse.balance);
    const newBalance = selectedHouse.balance; // Balance doesn't change until admin approves

    try {
      // Log transaction as Pending. Tenant balance is NOT updated here.
      const paymentMethod = method === 'cash' ? 'Cash (Pending)' : 'M-PESA (Pending)';
      
      const { error: txError } = await supabase
        .from('transactions')
        .insert([{
          house_number: selectedHouse.id,
          estate_name: activeEstate.name,
          amount: amount,
          payment_method: paymentMethod,
          collector_name: collectorName,
          resulting_balance: newBalance
        }]);

      if (txError) throw txError;

      // Optimistically update UI to show it's "done" for the collector
      setHouses((prev) =>
        prev.map((h) => (h.id === selectedHouse.id ? { ...h, balance: 0 } : h))
      );
      setSelectedHouse(null);
    } catch (err) {
      console.error('Payment Error:', err);
      alert(`Error logging payment: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white overflow-hidden font-sans flex flex-col">
      <div className="max-w-md mx-auto w-full flex-1 relative flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="pt-12 pb-6 px-6 bg-[#0B0F19]/80 backdrop-blur-xl sticky top-0 z-10 border-b border-white/5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <MapPin className="text-rose-500 w-5 h-5" />
              <h1 className="text-2xl font-bold tracking-tight text-white">
                {isLoading ? 'Loading...' : (activeEstate?.name || 'No Estate')}
              </h1>
            </div>
            
            <div className="flex items-center gap-3">
              {!isLoading && estates.length > 1 && (
                <select
                  value={activeEstate?.id || ''}
                  onChange={(e) => {
                    const estate = estates.find(es => es.id === e.target.value);
                    if (estate) setActiveEstate(estate);
                  }}
                  className="bg-[#131B2C] border border-white/10 text-white text-sm rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-rose-500"
                >
                  {estates.map((estate) => (
                    <option key={estate.id} value={estate.id}>
                      {estate.name}
                    </option>
                  ))}
                </select>
              )}
              {isDedicatedCollector && (
                <button
                  onClick={() => {
                    localStorage.removeItem('collector_auth');
                    window.location.href = '/collector-login';
                  }}
                  className="text-xs font-bold text-slate-400 hover:text-white uppercase tracking-wider px-2 py-1 rounded bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 transition-colors"
                >
                  Logout
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between mt-2 ml-7">
            <p className="text-gray-400 font-medium">{pendingDoors} Doors Pending</p>
            {isAdmin && allCollectors.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Logging as:</span>
                <select
                  value={selectedAdminCollector}
                  onChange={(e) => setSelectedAdminCollector(e.target.value)}
                  className="bg-[#131B2C] border border-white/10 text-emerald-400 font-bold text-xs rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {allCollectors.map((c, i) => (
                    <option key={i} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* The Grid */}
        <div className="flex-1 p-6 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {houses.map((house) => {
                const isPending = house.balance < 0;
                return (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    key={house.id}
                    onClick={() => handleHouseClick(house)}
                    className={`
                      aspect-square rounded-2xl flex flex-col items-center justify-center relative overflow-hidden transition-colors
                      ${
                        isPending
                          ? 'bg-rose-500/20 border-2 border-rose-500/50 hover:bg-rose-500/30'
                          : 'bg-emerald-500/10 border border-emerald-500/20 opacity-60'
                      }
                    `}
                  >
                    <span
                      className={`text-2xl font-black ${
                        isPending ? 'text-rose-500' : 'text-emerald-600/80'
                      }`}
                    >
                      {house.id}
                    </span>

                    {!isPending && (
                      <div className="absolute top-2 right-2 bg-emerald-500/20 p-1 rounded-full">
                        <Check className="w-3 h-3 text-emerald-500" strokeWidth={3} />
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Sheet */}
        <AnimatePresence>
          {selectedHouse && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleCloseSheet}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40"
              />

              {/* Sheet */}
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute bottom-0 left-0 right-0 bg-[#131B2C] rounded-t-3xl p-6 z-50 shadow-2xl border-t border-white/10"
              >
                <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6" />

                <div className="mb-8 text-center">
                  <h2 className="text-3xl font-black text-white mb-2">Door {selectedHouse.id}</h2>
                  <p className="text-xl text-rose-400 font-bold">
                    Owes: Ksh {Math.abs(selectedHouse.balance)}
                  </p>
                </div>

                {!showIssueMenu ? (
                  <div className="space-y-4">
                    <button
                      onClick={() => handleLogPayment('cash')}
                      className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-lg py-5 rounded-2xl transition-colors shadow-lg shadow-blue-500/20"
                    >
                      Log Cash Payment
                    </button>

                    <button
                      onClick={() => handleLogPayment('mpesa')}
                      className="w-full bg-transparent border-2 border-blue-500 text-blue-400 hover:bg-blue-500/10 active:bg-blue-500/20 font-bold text-lg py-5 rounded-2xl transition-colors"
                    >
                      Log M-PESA
                    </button>

                    <button
                      onClick={() => setShowIssueMenu(true)}
                      className="w-full flex items-center justify-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 active:bg-rose-500/30 border-2 border-rose-500/30 text-rose-400 font-bold text-lg py-5 rounded-2xl transition-colors mt-4"
                    >
                      <AlertTriangle className="w-5 h-5" />
                      Report Issue
                    </button>

                    <button
                      onClick={handleCloseSheet}
                      className="w-full flex items-center justify-center gap-2 text-gray-400 hover:text-white font-bold py-4 mt-2 transition-colors"
                    >
                      <X className="w-5 h-5" />
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="text-rose-400 font-bold text-center mb-4 uppercase tracking-wider text-sm">Select Issue Type</h3>
                    
                    <button
                      onClick={() => handleReportIssue('Locked Gate')}
                      className="w-full bg-[#1E293B] border border-white/10 hover:bg-white/10 text-white font-bold text-lg py-4 rounded-2xl transition-colors"
                    >
                      Locked Gate / Inaccessible
                    </button>

                    <button
                      onClick={() => handleReportIssue('Tenant Refused')}
                      className="w-full bg-[#1E293B] border border-white/10 hover:bg-white/10 text-white font-bold text-lg py-4 rounded-2xl transition-colors"
                    >
                      Tenant Refused
                    </button>
                    
                    <button
                      onClick={() => handleReportIssue('Vacant')}
                      className="w-full bg-[#1E293B] border border-white/10 hover:bg-white/10 text-white font-bold text-lg py-4 rounded-2xl transition-colors"
                    >
                      House is Vacant
                    </button>

                    <button
                      onClick={() => setShowIssueMenu(false)}
                      className="w-full flex items-center justify-center gap-2 text-gray-400 hover:text-white font-bold py-4 mt-2 transition-colors"
                    >
                      <X className="w-5 h-5" />
                      Back to Payments
                    </button>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MobileCollectorGrid;
