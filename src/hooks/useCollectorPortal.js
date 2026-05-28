import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { mapTenantsToHouses, computeCollectorStats } from '../lib/collectorPortalUtils';

/**
 * Shared collector portal data & actions.
 * @param {'admin'|'field'} mode — admin sees all collectors/estates; field is scoped to login.
 */
export function useCollectorPortal(mode = 'field') {
  const { currentUser } = useAuth();
  const isAdminMode = mode === 'admin' || (!!currentUser && mode === 'field');

  const collectorAuthStr = typeof window !== 'undefined' ? localStorage.getItem('collector_auth') : null;
  const collectorAuth = collectorAuthStr ? JSON.parse(collectorAuthStr) : null;
  const isDedicatedCollector = !isAdminMode && !currentUser && !!collectorAuth;

  const [estates, setEstates] = useState([]);
  const [activeEstate, setActiveEstate] = useState(null);
  const [houses, setHouses] = useState([]);
  const [tenantsData, setTenantsData] = useState([]); // Store tenants locally
  const [allCollectors, setAllCollectors] = useState([]);
  const [selectedCollectorName, setSelectedCollectorName] = useState('Admin');
  const [todayTransactions, setTodayTransactions] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedHouse, setSelectedHouse] = useState(null);
  const [showIssueMenu, setShowIssueMenu] = useState(false);

  const collectorName = isDedicatedCollector
    ? collectorAuth.name
    : selectedCollectorName;
  
  // Wrap setActiveEstate to prevent dedicated collectors from changing estates
  const safeSetActiveEstate = (estate) => {
    if (isDedicatedCollector) {
      // Dedicated collectors can't change estates
      return;
    }
    setActiveEstate(estate);
  };

  // Determine the correct user_id to use
  const effectiveUserId = isDedicatedCollector ? collectorAuth?.user_id : currentUser?.id;

  const loadCollectors = useCallback(async () => {
    if (!effectiveUserId) return;
    const { data } = await supabase
      .from('collectors')
      .select('id, name, phone, status, assigned_estate')
      .eq('user_id', effectiveUserId);
    if (data) setAllCollectors(data);
  }, [effectiveUserId]);

  const fetchAllTransactions = useCallback(async () => {
    if (!effectiveUserId) return;
    const { data: txs } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', effectiveUserId)
      .order('created_at', { ascending: false });
    setAllTransactions(txs || []);
    
    // Also set todayTransactions for backward compatibility
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todayTxs = (txs || []).filter(tx => {
      const txDate = new Date(tx.created_at);
      txDate.setHours(0, 0, 0, 0);
      return txDate.getTime() === startOfDay.getTime();
    });
    setTodayTransactions(todayTxs);
  }, [effectiveUserId]);

  const fetchPortalData = useCallback(async () => {
    if (!effectiveUserId) return;
    try {
      const { data: rawEstates, error: estatesError } = await supabase
        .from('estates')
        .select('*')
        .eq('user_id', effectiveUserId)
        .order('created_at', { ascending: true });
      if (estatesError) throw estatesError;

      let estatesData = rawEstates || [];

      if (isDedicatedCollector && collectorAuth?.id) {
        const { data: collectorDb } = await supabase
          .from('collectors')
          .select('assigned_estate')
          .eq('id', collectorAuth.id)
          .eq('user_id', effectiveUserId)
          .single();

        if (collectorDb?.assigned_estate) {
          estatesData = estatesData.filter((e) => e.id === collectorDb.assigned_estate);
        } else {
          estatesData = [];
        }
      }

      setEstates(estatesData);

      setActiveEstate((prev) => {
        if (prev && estatesData.some((e) => e.id === prev.id)) return prev;
        return estatesData[0] || null;
      });

      await fetchAllTransactions();
    } catch (err) {
      console.error('Collector portal fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isDedicatedCollector, collectorAuth?.id, fetchAllTransactions, effectiveUserId]);

  const loadHousesForEstate = useCallback(async (estateId) => {
    if (!estateId || !effectiveUserId) {
      setHouses([]);
      setTenantsData([]);
      return;
    }
    const { data: fetchedTenants, error } = await supabase.from('tenants').select('*').eq('user_id', effectiveUserId);
    if (error) {
      console.error(error);
      return;
    }
    setTenantsData(fetchedTenants || []);
  }, [effectiveUserId]);
  
  // Regenerate houses from local tenantsData and allTransactions
  useEffect(() => {
    if (activeEstate?.id && tenantsData.length > 0) {
      setHouses(mapTenantsToHouses(tenantsData, activeEstate.id, allTransactions));
    }
  }, [activeEstate?.id, tenantsData, allTransactions]);

  useEffect(() => {
    if (isAdminMode) loadCollectors();
  }, [isAdminMode, loadCollectors]);

  useEffect(() => {
    if (isAdminMode && allCollectors.length && selectedCollectorName === 'Admin') {
      setSelectedCollectorName(allCollectors[0].name);
    }
  }, [isAdminMode, allCollectors, selectedCollectorName]);

  useEffect(() => {
    if (!isDedicatedCollector && !isAdminMode && !currentUser) {
      window.location.href = '/collector-login';
    }
  }, [isDedicatedCollector, isAdminMode, currentUser]);

  useEffect(() => {
    setIsLoading(true);
    fetchPortalData();

    const channel = supabase
      .channel(`collector-portal-${mode}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tenants', filter: effectiveUserId ? `user_id=eq.${effectiveUserId}` : '' }, () => {
        if (activeEstate?.id) loadHousesForEstate(activeEstate.id);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: effectiveUserId ? `user_id=eq.${effectiveUserId}` : '' }, () => {
        fetchAllTransactions();
        if (activeEstate?.id) loadHousesForEstate(activeEstate.id);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collectors', filter: effectiveUserId ? `user_id=eq.${effectiveUserId}` : '' }, () => {
        if (isAdminMode) loadCollectors();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [mode, fetchPortalData, isAdminMode, loadCollectors, loadHousesForEstate, fetchAllTransactions, activeEstate?.id, effectiveUserId]);

  // Call loadHousesForEstate when activeEstate changes
  useEffect(() => {
    if (activeEstate?.id) {
      loadHousesForEstate(activeEstate.id);
    }
  }, [activeEstate?.id, loadHousesForEstate]);

  useEffect(() => {
    if (!isAdminMode || !activeEstate?.id || !allCollectors.length) return;
    const assigned = allCollectors.find((c) => c.assigned_estate === activeEstate.id);
    if (assigned) setSelectedCollectorName(assigned.name);
  }, [isAdminMode, activeEstate?.id, allCollectors]);

  useEffect(() => {
    if (!isAdminMode || !selectedCollectorName) return;
    const c = allCollectors.find((x) => x.name === selectedCollectorName);
    if (!c?.assigned_estate || !estates.length) return;
    const estate = estates.find((e) => e.id === c.assigned_estate);
    if (estate) setActiveEstate(estate);
  }, [selectedCollectorName, isAdminMode, allCollectors, estates]);

  const stats = useMemo(
    () => computeCollectorStats(todayTransactions, collectorName, houses),
    [todayTransactions, collectorName, houses]
  );

  const collectorSummaries = useMemo(() => {
    return allCollectors.map((c) => {
      const estate = estates.find((e) => e.id === c.assigned_estate);
      const s = computeCollectorStats(todayTransactions, c.name, []);
      return {
        ...c,
        estateName: estate?.name || 'Unassigned',
        collectedToday: s.collectedToday,
        logsToday: s.logsToday,
      };
    });
  }, [allCollectors, estates, todayTransactions]);

  const recentForCollector = useMemo(
    () =>
      todayTransactions
        .filter((tx) => tx.collector_name === collectorName)
        .slice(0, 8),
    [todayTransactions, collectorName]
  );

  const handleCloseSheet = () => {
    if (!isSubmitting) {
      setSelectedHouse(null);
      setShowIssueMenu(false);
    }
  };

  const handleHouseClick = (house) => {
    if (house.balance < 0 && !house.isProcessedToday) {
      setSelectedHouse(house);
    }
  };

  const handleReportIssue = async (issueType) => {
    if (!selectedHouse || !activeEstate || !effectiveUserId) return;
    if (selectedHouse.isProcessedToday) return;
    setIsSubmitting(true);
    try {
      const newTransaction = {
        user_id: effectiveUserId,
        house_number: selectedHouse.id,
        estate_name: activeEstate.name,
        amount: 0,
        payment_method: `Incident: ${issueType}`,
        collector_name: collectorName,
        resulting_balance: selectedHouse.balance,
      };
      const { data, error } = await supabase.from('transactions').insert([newTransaction]).select();
      if (error) throw error;
      
      // Update local state
      setAllTransactions((prev) => (data ? [...data, ...prev] : prev));
      setTodayTransactions((prev) => (data ? [...data, ...prev] : prev));
      setHouses((prev) =>
        prev.map((h) => (h.id === selectedHouse.id ? { ...h, isProcessedToday: true } : h))
      );
      handleCloseSheet();
    } catch (err) {
      alert(`Error reporting issue: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogPayment = async (method) => {
    if (!selectedHouse || !activeEstate || !effectiveUserId) return;
    if (selectedHouse.isProcessedToday) return;
    setIsSubmitting(true);
    const amount = Math.abs(selectedHouse.balance);
    const paymentMethod = method === 'cash' ? 'Cash (Pending)' : 'M-PESA (Pending)';

    try {
      const newTransaction = {
        user_id: effectiveUserId,
        house_number: selectedHouse.id,
        estate_name: activeEstate.name,
        amount,
        payment_method: paymentMethod,
        collector_name: collectorName,
        resulting_balance: selectedHouse.balance,
      };
      const { data, error } = await supabase.from('transactions').insert([newTransaction]).select();
      if (error) throw error;

      // Update local state
      setAllTransactions((prev) => (data ? [...data, ...prev] : prev));
      setTodayTransactions((prev) => (data ? [...data, ...prev] : prev));
      setHouses((prev) =>
        prev.map((h) => (h.id === selectedHouse.id ? { ...h, balance: 0, isProcessedToday: true } : h))
      );
      setSelectedHouse(null);
      setShowIssueMenu(false);
    } catch (err) {
      alert(`Error logging payment: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const logoutCollector = () => {
    localStorage.removeItem('collector_auth');
    window.location.href = '/collector-login';
  };

  return {
    isAdminMode,
    isDedicatedCollector,
    collectorAuth,
    estates,
    activeEstate,
    setActiveEstate: safeSetActiveEstate, // Use the safe version
    houses,
    allCollectors,
    collectorSummaries,
    selectedCollectorName,
    setSelectedCollectorName,
    collectorName,
    stats,
    recentForCollector,
    isLoading,
    isSubmitting,
    selectedHouse,
    showIssueMenu,
    setShowIssueMenu,
    handleHouseClick,
    handleCloseSheet,
    handleLogPayment,
    handleReportIssue,
    logoutCollector,
  };
}
