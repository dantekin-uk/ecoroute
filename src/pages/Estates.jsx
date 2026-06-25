import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Building2, Users, AlertTriangle, ChevronDown, ChevronRight, MoreVertical, X, UploadCloud, Wand2, FileSpreadsheet, Trash2, Edit2, MoreHorizontal, Loader2, Eye, DollarSign } from 'lucide-react';
import { useTheme } from '../context/useTheme';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import PageHeader from '../components/layout/PageHeader';
import PageStatGrid from '../components/layout/PageStatGrid';
import PageStatCard from '../components/layout/PageStatCard';

// Helper to sort naturally (126 comes before 126-A, etc.)
const naturalSort = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

const Estates = () => {
  const { activePalette } = useTheme();
  const { currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [importMode, setImportMode] = useState('single'); // 'single' | 'bulk'
  const [expandedEstates, setExpandedEstates] = useState({}); // Open first one by default
  const [expandedPlots, setExpandedPlots] = useState({}); // Track expanded plots
  
  // Live Supabase Data State
  const [estatesData, setEstatesData] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState(null);

  // Modal States
  const [isEstateModalOpen, setIsEstateModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [isEditTenantModalOpen, setIsEditTenantModalOpen] = useState(false);
  const [isTenantDetailModalOpen, setIsTenantDetailModalOpen] = useState(false);

  // Form States
  const [newTenant, setNewTenant] = useState({ phone: '', estateId: '', blockNumber: '', doorNumber: '', monthlyRate: '', tenantName: 'Occupant' });
  const [editTenant, setEditTenant] = useState({});
  const [newEstateName, setNewEstateName] = useState('');
  const [bulkEstateId, setBulkEstateId] = useState('');
  const [parsedBulkData, setParsedBulkData] = useState([]);
  const fileInputRef = useRef(null);
  const [genBlockPrefix, setGenBlockPrefix] = useState('');
  const [genStart, setGenStart] = useState('1');
  const [genEnd, setGenEnd] = useState('60');
  const [genRate, setGenRate] = useState('450');

  // Payment Form State
  const [paymentPhone, setPaymentPhone] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Fetch all data
  const fetchData = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      // Fetch estates, tenants, and transactions
      const [estatesRes, tenantsRes, transactionsRes] = await Promise.all([
        supabase.from('estates').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: true }),
        supabase.from('tenants').select('*').eq('user_id', currentUser.id),
        supabase.from('transactions').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false })
      ]);

      if (estatesRes.error) throw estatesRes.error;
      if (tenantsRes.error) throw tenantsRes.error;
      if (transactionsRes.error) throw transactionsRes.error;

      const estates = estatesRes.data || [];
      const tenants = tenantsRes.data || [];
      const txs = transactionsRes.data || [];

      setTransactions(txs);

      // Format estates data with grouped and sorted tenants
      const formattedData = estates.map(est => {
        const estateTenants = tenants.filter(t => t.estate_id === est.id);
        
        // Group tenants by block number
        const groupedTenants = estateTenants.reduce((acc, t) => {
          const block = t.block_number || 'Unassigned';
          if (!acc[block]) acc[block] = [];
          acc[block].push({
            ...t,
            houseNumber: t.door_number ? `${t.block_number}-${t.door_number}` : t.block_number,
            phone: t.phone_number || 'N/A',
            balance: Number(t.current_balance) || 0,
            monthlyRate: Number(t.monthly_rate) || 0
          });
          return acc;
        }, {});

        // Sort blocks naturally and sort tenants within each block
        const sortedBlocks = Object.keys(groupedTenants).sort(naturalSort);
        const finalTenants = sortedBlocks.flatMap(block => 
          groupedTenants[block].sort((a, b) => {
            const aDoor = a.door_number || '';
            const bDoor = b.door_number || '';
            return naturalSort(aDoor, bDoor);
          })
        );

        // Initialize expanded state for first estate
        if (estates.length > 0 && Object.keys(expandedEstates).length === 0) {
          setExpandedEstates({ [estates[0].id]: true });
        }

        return {
          id: est.id,
          name: est.name,
          totalHouses: estateTenants.length,
          tenants: finalTenants,
          groupedTenants,
          sortedBlocks
        };
      });

      setEstatesData(formattedData);
    } catch (err) {
      console.error('Error fetching data:', err);
      alert(`Failed to load data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    fetchData();

    // Set up real-time subscriptions
    const estatesSubscription = supabase
      .channel('estates-changes')
      .on('postgres_changes', { event: '*', table: 'estates', schema: 'public', filter: `user_id=eq.${currentUser.id}` }, () => {
        fetchData();
      })
      .subscribe();

    const tenantsSubscription = supabase
      .channel('estates-tenants-changes')
      .on('postgres_changes', { event: '*', table: 'tenants', schema: 'public', filter: `user_id=eq.${currentUser.id}` }, () => {
        fetchData();
      })
      .subscribe();

    const transactionsSubscription = supabase
      .channel('estates-transactions-changes')
      .on('postgres_changes', { event: '*', table: 'transactions', schema: 'public', filter: `user_id=eq.${currentUser.id}` }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(estatesSubscription);
      supabase.removeChannel(tenantsSubscription);
      supabase.removeChannel(transactionsSubscription);
    };
  }, [currentUser]);

  // Toggle Functions
  const toggleEstate = (id) => {
    setExpandedEstates(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const togglePlot = (estateId, blockNumber) => {
    const key = `${estateId}-${blockNumber}`;
    setExpandedPlots(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Delete Handlers
  const handleDeleteTenant = async (estateId, tenantId) => {
    if (window.confirm("Are you sure you want to remove this tenant? This will also remove their history.") && currentUser) {
      setIsLoading(true);
      try {
        const { error } = await supabase.from('tenants').delete().eq('id', tenantId).eq('user_id', currentUser.id);
        if (error) throw error;
      } catch (err) {
        alert(`Error deleting tenant: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    }
    setOpenMenuId(null);
  };

  const handleDeleteEstate = async (estateId) => {
    if (window.confirm("CRITICAL: Are you sure you want to delete this ENTIRE estate and ALL its tenants? This cannot be undone.") && currentUser) {
      setIsLoading(true);
      try {
        const { error: tError } = await supabase.from('tenants').delete().eq('estate_id', estateId).eq('user_id', currentUser.id);
        if (tError) throw tError;

        const { error: eError } = await supabase.from('estates').delete().eq('id', estateId).eq('user_id', currentUser.id);
        if (eError) throw eError;
      } catch (err) {
        alert(`Error deleting estate: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    }
    setOpenMenuId(null);
  };

  // Add Handlers
  const handleAddEstate = async () => {
    if (!newEstateName.trim() || !currentUser) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase.from('estates').insert([{ name: newEstateName, user_id: currentUser.id }]);
      if (error) throw error;
      setNewEstateName('');
      setIsEstateModalOpen(false);
    } catch (err) {
      console.error('Error adding estate:', err);
      alert(`Failed to add estate: ${err.message}`);
      setIsLoading(false);
    }
  };

  const handleAddTenant = async () => {
    if (!newTenant.estateId || !newTenant.blockNumber || !newTenant.monthlyRate || !currentUser) {
      alert('Please fill in all required fields (Estate, Plot/Block Number, Monthly Rate).');
      return;
    }
    
    setIsLoading(true);
    const rate = Number(newTenant.monthlyRate);
    try {
      const { error } = await supabase.from('tenants').insert([{
        user_id: currentUser.id,
        estate_id: newTenant.estateId,
        block_number: newTenant.blockNumber,
        door_number: newTenant.doorNumber || null,
        tenant_name: newTenant.tenantName || 'Occupant',
        phone_number: newTenant.phone || 'N/A',
        current_balance: -rate, 
        monthly_rate: rate,
        is_active: true
      }]);
      if (error) throw error;
      
      setNewTenant({ phone: '', estateId: '', blockNumber: '', doorNumber: '', monthlyRate: '', tenantName: 'Occupant' });
      setIsPanelOpen(false);
    } catch (err) {
      console.error('Error adding tenant:', err);
      alert(`Failed to add tenant: ${err.message}`);
      setIsLoading(false);
    }
  };

  // Edit Handler
  const handleEditTenant = async () => {
    if (!editTenant.id || !currentUser) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase.from('tenants').update({
        block_number: editTenant.block_number,
        door_number: editTenant.door_number || null,
        tenant_name: editTenant.tenant_name,
        phone_number: editTenant.phone_number,
        monthly_rate: Number(editTenant.monthly_rate),
        current_balance: Number(editTenant.current_balance)
      }).eq('id', editTenant.id).eq('user_id', currentUser.id);
      
      if (error) throw error;
      setIsEditTenantModalOpen(false);
      setEditTenant({});
    } catch (err) {
      console.error('Error updating tenant:', err);
      alert(`Failed to update tenant: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Download CSV Template
  const handleDownloadTemplate = () => {
    const csvContent = "Plot/Block Number,Unit/Door Number (Optional),Phone Number,Monthly Rate\n126,Main House,+254700000000,450\n126,B,+254711111111,800\nA,1,,600";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "tenant_import_template.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Bulk Import
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n');
      const tenants = [];
      
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const [blockNumber, doorNumber, phone, rate] = lines[i].split(',');
        const monthlyRate = Number(rate) || 450;
        if (blockNumber) {
          tenants.push({
            user_id: currentUser.id,
            estate_id: bulkEstateId,
            block_number: blockNumber.trim(),
            door_number: doorNumber ? doorNumber.trim() : null,
            tenant_name: 'Occupant',
            phone_number: phone ? phone.trim() : 'N/A',
            current_balance: -monthlyRate,
            monthly_rate: monthlyRate,
            is_active: true
          });
        }
      }
      setParsedBulkData(tenants);
    };
    reader.readAsText(file);
  };

  const handleProcessImport = async () => {
    if (!bulkEstateId) return alert('Please select an estate for the bulk import.');
    if (parsedBulkData.length === 0) return alert('Please upload a valid CSV file first.');
    
    setIsLoading(true);
    try {
      await supabase.from('tenants').insert(parsedBulkData);
      setBulkEstateId('');
      setParsedBulkData([]);
      setIsPanelOpen(false);
    } catch (err) {
      alert(`Error importing tenants: ${err.message}`);
      setIsLoading(false);
    }
  };

  // Smart Unit Generator
  const handleGenerateUnits = async () => {
    if (!bulkEstateId || !currentUser) return alert('Please select a Target Estate first.');
    const start = parseInt(genStart);
    const end = parseInt(genEnd);
    const rate = Number(genRate) || 450;
    
    if (isNaN(start) || isNaN(end) || start > end) {
      return alert('Please enter valid start and end numbers.');
    }

    setIsLoading(true);
    const newTenants = [];
    for (let i = start; i <= end; i++) {
      newTenants.push({
        user_id: currentUser.id,
        estate_id: bulkEstateId,
        block_number: genBlockPrefix || `${i}`,
        door_number: genBlockPrefix ? `${i}` : null,
        tenant_name: 'Empty Unit',
        current_balance: -rate,
        monthly_rate: rate,
        is_active: true
      });
    }

    try {
      await supabase.from('tenants').insert(newTenants);
      setGenBlockPrefix('');
      setGenStart('1');
      setGenEnd('60');
      setGenRate('450');
      setBulkEstateId('');
      setIsPanelOpen(false);
    } catch (err) {
      alert(`Error generating units: ${err.message}`);
      setIsLoading(false);
    }
  };

  // Open Tenant Detail Modal
  const openTenantDetail = (tenant) => {
    setSelectedTenant(tenant);
    setIsTenantDetailModalOpen(true);
    // Set initial payment values
    setPaymentPhone(tenant.phone !== "N/A" ? tenant.phone : "");
    setPaymentAmount(String(Math.abs(tenant.balance || 0)));
  };

  // Handle M-Pesa Payment
  const handlePayment = async () => {
    if (!selectedTenant || !paymentPhone || !paymentAmount) {
      alert("Please fill in all payment details");
      return;
    }
    setIsProcessingPayment(true);
    try {
      // We'll implement this later when we set up Supabase Functions
      alert("Payment initiation will be available once Supabase Functions are deployed!");
    } catch (error) {
      console.error("Payment error:", error);
      alert("Failed to initiate payment. Please try again.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Open Edit Tenant Modal
  const openEditTenant = (tenant) => {
    setEditTenant({ ...tenant });
    setIsEditTenantModalOpen(true);
    setOpenMenuId(null);
  };

  // Filter data based on search query
  const filteredEstates = estatesData.map(estate => {
    const filteredTenants = estate.tenants.filter(t => 
      t.houseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.phone && t.phone.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.tenant_name && t.tenant_name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    return { ...estate, tenants: filteredTenants };
  }).filter(estate => estate.tenants.length > 0 || estate.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Live Stats Calculations
  const allTenants = estatesData.flatMap(est => est.tenants);
  const totalTenantsCount = allTenants.length;
  const defaultingCount = allTenants.filter(t => t.balance < 0).length;
  const liveDefaulterRate = totalTenantsCount > 0 
    ? ((defaultingCount / totalTenantsCount) * 100).toFixed(1) 
    : "0";

  // Get tenant-specific transactions
  const getTenantTransactions = (tenant) => {
    const houseId = tenant.door_number ? `${tenant.block_number}-${tenant.door_number}` : tenant.block_number;
    return transactions.filter(tx => tx.house_number === houseId);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1920px] mx-auto min-h-screen space-y-6">
      
      {/* Global Click-Away for Menus */}
      {openMenuId && (
        <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
      )}

      <PageHeader
        icon={Building2}
        iconClassName="text-blue-600 dark:text-blue-400"
        iconBgClassName="bg-blue-500/10 dark:bg-blue-500/20"
        title="Estates & Tenants"
        subtitle={
          <span className="flex items-center gap-2">
            {isLoading && <Loader2 size={14} className="animate-spin text-blue-500" />}
            Manage properties and doors — live from Supabase
          </span>
        }
        actions={
          <>
          <div className="flex w-full sm:w-auto items-center gap-3 flex-1 sm:flex-initial">
          <button
            onClick={() => setIsEstateModalOpen(true)}
            className={`flex-shrink-0 flex items-center gap-2 bg-white dark:bg-[#1E293B] text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 font-medium text-sm`}
          >
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Add Estate</span>
            <span className="sm:hidden">Estate</span>
          </button>

          <div className="relative flex-1 sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search tenants or estates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`block w-full pl-10 pr-4 py-2 border-0 bg-white dark:bg-[#1E293B]/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-xl focus:ring-2 ${activePalette.focusRing} focus:bg-white dark:focus:bg-[#1E293B] transition-all duration-200 shadow-sm border border-gray-200 dark:border-slate-700/50`}
            />
          </div>
          <button
            onClick={() => setIsPanelOpen(true)}
            className={`flex-shrink-0 flex items-center gap-2 bg-gradient-to-r ${activePalette.gradientFrom} ${activePalette.gradientTo} text-white px-4 py-2 rounded-xl shadow-lg ${activePalette.shadow} hover:opacity-90 transition-all duration-200 font-medium text-sm`}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add New Tenant</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
          </>
        }
      />

      <PageStatGrid columns={3}>
        <PageStatCard
          label="Active Tenants"
          value={totalTenantsCount.toLocaleString()}
          icon={Users}
          iconClassName="text-blue-600 dark:text-blue-400"
          iconBgClassName="bg-blue-100 dark:bg-blue-500/20"
        />
        <PageStatCard
          label="Estates"
          value={estatesData.length}
          icon={Building2}
          iconClassName="text-purple-600 dark:text-purple-400"
          iconBgClassName="bg-purple-100 dark:bg-purple-500/20"
        />
        <PageStatCard
          label="Defaulter Rate"
          value={`${liveDefaulterRate}%`}
          subtitle={`${defaultingCount} tenants in arrears`}
          icon={AlertTriangle}
          valueClassName="text-rose-600 dark:text-rose-500"
          iconClassName="text-rose-600 dark:text-rose-400"
          iconBgClassName="bg-rose-100 dark:bg-rose-500/20"
        />
      </PageStatGrid>

      {/* Main Data View */}
      <div className="space-y-4">
        {filteredEstates.length === 0 && !isLoading ? (
          <div className="text-center py-20 bg-white/50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
            <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">No Estates Found</h3>
            <p className="text-sm text-gray-500 mt-1">Click "Add Estate" to get started.</p>
          </div>
        ) : filteredEstates.map((estate) => (
          <div key={estate.id} className="bg-white/80 dark:bg-[#1E293B]/20 backdrop-blur-md border border-gray-200/60 dark:border-slate-700/50 rounded-2xl shadow-lg overflow-hidden transition-all duration-300">
            
            {/* Estate Accordion Header */}
            <div 
              onClick={() => toggleEstate(estate.id)}
              className="w-full flex items-center justify-between p-5 hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-500 dark:text-gray-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{estate.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{estate.totalHouses} Houses Total</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="relative z-50">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === `estate-${estate.id}` ? null : `estate-${estate.id}`); }}
                    className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-slate-700 transition-colors focus:outline-none"
                  >
                    <MoreHorizontal size={20} />
                  </button>
                  <AnimatePresence>
                    {openMenuId === `estate-${estate.id}` && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.1 }}
                        className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden"
                      >
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteEstate(estate.id); }} 
                          className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2 font-medium"
                        >
                          <Trash2 size={16} /> Delete Estate
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-gray-400">
                  {expandedEstates[estate.id] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </div>
              </div>
            </div>

            {/* Estate Accordion Body */}
            <AnimatePresence initial={false}>
              {expandedEstates[estate.id] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="border-t border-gray-200/60 dark:border-slate-700/50"
                >
                  <div className="p-4 space-y-3">
                    {/* Grouped by Plot */}
                    {estate.sortedBlocks.map((blockNumber) => {
                      const plotTenants = estate.groupedTenants[blockNumber].filter(t => 
                        estate.tenants.some(ft => ft.id === t.id)
                      );
                      if (plotTenants.length === 0) return null;
                      
                      const plotKey = `${estate.id}-${blockNumber}`;
                      const isPlotExpanded = expandedPlots[plotKey] ?? plotTenants.length > 1;

                      return (
                        <div key={plotKey} className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
                          {/* Plot Header */}
                          <div 
                            onClick={() => togglePlot(estate.id, blockNumber)}
                            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <Building2 size={16} />
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900 dark:text-white">Plot {blockNumber}</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{plotTenants.length} unit{plotTenants.length !== 1 ? 's' : ''}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {plotTenants.length > 1 && (
                                <ChevronDown 
                                  size={18} 
                                  className={`text-gray-400 transition-transform ${isPlotExpanded ? 'rotate-0' : '-rotate-90'}`} 
                                />
                              )}
                            </div>
                          </div>

                          {/* Plot Tenants */}
                          <AnimatePresence>
                            {(isPlotExpanded || plotTenants.length === 1) && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <div className="divide-y divide-gray-100 dark:divide-slate-700">
                                  {plotTenants.map((tenant) => (
                                    <div key={tenant.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors">
                                      <div className="flex items-center gap-4">
                                        <div className="font-mono text-sm font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                                          {tenant.houseNumber}
                                        </div>
                                        <div>
                                          <p className="text-sm font-medium text-gray-900 dark:text-white">{tenant.tenant_name}</p>
                                          <p className="text-xs text-gray-500 dark:text-gray-400">{tenant.phone}</p>
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-center gap-3">
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                                          tenant.balance > 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' 
                                          : tenant.balance < 0 ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-500/20' 
                                          : 'bg-slate-100 text-slate-700 dark:bg-slate-500/10 dark:text-slate-400 border-slate-200 dark:border-slate-500/20'
                                        }`}>
                                          {tenant.balance > 0 ? `+KES ${tenant.balance}` : tenant.balance < 0 ? `-KES ${Math.abs(tenant.balance)}` : 'KES 0'}
                                        </span>
                                        
                                        <button
                                          onClick={(e) => { e.stopPropagation(); openTenantDetail(tenant); }}
                                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                                        >
                                          <Eye size={16} />
                                        </button>
                                        
                                        <div className="relative">
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === `tenant-${tenant.id}` ? null : `tenant-${tenant.id}`); }}
                                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                          >
                                            <MoreVertical size={18} />
                                          </button>
                                          <AnimatePresence>
                                            {openMenuId === `tenant-${tenant.id}` && (
                                              <motion.div
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                transition={{ duration: 0.1 }}
                                                className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden"
                                              >
                                                <button 
                                                  onClick={(e) => { e.stopPropagation(); openEditTenant(tenant); }}
                                                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-2 font-medium"
                                                >
                                                  <Edit2 size={14} /> Edit Tenant
                                                </button>
                                                <button 
                                                  onClick={(e) => { e.stopPropagation(); handleDeleteTenant(estate.id, tenant.id); }} 
                                                  className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2 font-medium"
                                                >
                                                  <Trash2 size={14} /> Delete
                                                </button>
                                              </motion.div>
                                            )}
                                          </AnimatePresence>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Add Tenant Panel */}
      <AnimatePresence>
        {isPanelOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPanelOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white dark:bg-[#0B0F19] shadow-2xl border-l border-gray-200 dark:border-gray-800 z-50 flex flex-col"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-800">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Tenants</h2>
                <button 
                  onClick={() => setIsPanelOpen(false)}
                  className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                
                <div className="flex p-1 mb-6 bg-gray-100 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800">
                  <button
                    onClick={() => setImportMode('single')}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                      importMode === 'single' 
                        ? `bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-700` 
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    Single Entry
                  </button>
                  <button
                    onClick={() => setImportMode('bulk')}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                      importMode === 'bulk' 
                        ? `bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-700` 
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    Bulk Import
                  </button>
                </div>

                {importMode === 'single' ? (
                  <div className="space-y-5">
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Select Estate
                      </label>
                      <div className="relative">
                        <select 
                          value={newTenant.estateId}
                          onChange={(e) => setNewTenant({...newTenant, estateId: e.target.value})}
                          className={`block w-full pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white appearance-none focus:outline-none focus:ring-2 ${activePalette.focusRing} focus:border-transparent transition-all duration-200 text-sm`}
                        >
                          <option value="">Choose an estate...</option>
                          {estatesData.map(estate => (
                            <option key={estate.id} value={estate.id}>{estate.name}</option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                          <ChevronDown size={16} />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Tenant Name
                      </label>
                      <input
                        type="text"
                        value={newTenant.tenantName}
                        onChange={(e) => setNewTenant({...newTenant, tenantName: e.target.value})}
                        className={`block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 ${activePalette.focusRing} focus:border-transparent transition-all duration-200 text-sm`}
                        placeholder="Occupant"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Plot / Block Number
                      </label>
                      <input
                        type="text"
                        value={newTenant.blockNumber}
                        onChange={(e) => setNewTenant({...newTenant, blockNumber: e.target.value})}
                        className={`block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 ${activePalette.focusRing} focus:border-transparent transition-all duration-200 text-sm`}
                        placeholder="e.g. 126 or A"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Unit / Door Number (Optional)
                      </label>
                      <input
                        type="text"
                        value={newTenant.doorNumber}
                        onChange={(e) => setNewTenant({...newTenant, doorNumber: e.target.value})}
                        className={`block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 ${activePalette.focusRing} focus:border-transparent transition-all duration-200 text-sm`}
                        placeholder="e.g. B, Main House, or 1"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Monthly Rate (KES)
                      </label>
                      <input
                        type="number"
                        value={newTenant.monthlyRate}
                        onChange={(e) => setNewTenant({...newTenant, monthlyRate: e.target.value})}
                        className={`block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 ${activePalette.focusRing} focus:border-transparent transition-all duration-200 text-sm`}
                        placeholder="e.g. 450"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Phone Number (Optional)
                      </label>
                      <input
                        type="tel"
                        value={newTenant.phone}
                        onChange={(e) => setNewTenant({...newTenant, phone: e.target.value})}
                        className={`block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 ${activePalette.focusRing} focus:border-transparent transition-all duration-200 text-sm`}
                        placeholder="+254 XXX XXX XXX"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Target Estate
                      </label>
                      <div className="relative">
                        <select 
                          value={bulkEstateId}
                          onChange={(e) => setBulkEstateId(e.target.value)}
                          className={`block w-full pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white appearance-none focus:outline-none focus:ring-2 ${activePalette.focusRing} focus:border-transparent transition-all duration-200 text-sm`}
                        >
                          <option value="">Choose an estate...</option>
                          {estatesData.map(estate => (
                            <option key={estate.id} value={estate.id}>{estate.name}</option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                          <ChevronDown size={16} />
                        </div>
                      </div>
                    </div>

                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:border-blue-500 dark:hover:border-blue-500 transition-colors cursor-pointer group bg-gray-50/50 dark:bg-gray-900/20"
                    >
                      <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                      <div className={`w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center mb-3 text-blue-500 group-hover:scale-110 transition-transform`}>
                        <UploadCloud size={28} />
                      </div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">Upload CSV or Excel</p>
                      {parsedBulkData.length > 0 ? (
                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mb-3">{parsedBulkData.length} tenants ready to import!</p>
                      ) : (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Click to browse or drag and drop your file here</p>
                      )}
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDownloadTemplate(); }}
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline relative z-10"
                      >
                        <FileSpreadsheet size={14} /> Download Template
                      </button>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200 dark:border-gray-800"></div>
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="px-2 bg-white dark:bg-[#0B0F19] text-gray-400 font-medium uppercase tracking-wider">Or</span>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/10 dark:to-blue-900/10 rounded-2xl p-5 border border-purple-100 dark:border-purple-800/30">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400">
                          <Wand2 size={16} />
                        </div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Smart Unit Generator</h3>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                        Automatically generate empty units. If you enter a block prefix (like "126" or "A"), units will be 126-1, 126-2…
                      </p>
                      
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                            Block Prefix <span className="normal-case font-medium text-gray-400 ml-0.5">(Optional)</span>
                          </label>
                          <input type="text" value={genBlockPrefix} onChange={(e) => setGenBlockPrefix(e.target.value)} placeholder="None" className={`w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 ${activePalette.focusRing}`} />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Start</label>
                          <input type="number" value={genStart} onChange={(e) => setGenStart(e.target.value)} placeholder="1" className={`w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 ${activePalette.focusRing}`} />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">End</label>
                          <input type="number" value={genEnd} onChange={(e) => setGenEnd(e.target.value)} placeholder="60" className={`w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 ${activePalette.focusRing}`} />
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                          Monthly Rate (KES)
                        </label>
                        <input
                          type="number"
                          value={genRate}
                          onChange={(e) => setGenRate(e.target.value)}
                          placeholder="e.g. 450"
                          className={`w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 ${activePalette.focusRing}`}
                        />
                      </div>
                      <button type="button" onClick={handleGenerateUnits} className="w-full py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-sm font-bold text-gray-900 dark:text-white transition-colors shadow-sm">
                        Generate Units
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0B0F19]">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={importMode === 'single' ? handleAddTenant : handleProcessImport}
                  className={`w-full flex items-center justify-center gap-2 bg-gradient-to-r ${activePalette.gradientFrom} ${activePalette.gradientTo} text-white py-3.5 px-4 rounded-xl shadow-lg ${activePalette.shadow} hover:opacity-90 transition-all duration-300 font-semibold disabled:opacity-50`}
                >
                  {isLoading && <Loader2 size={16} className="animate-spin" />}
                  {importMode === 'single' ? 'Save Tenant' : 'Process Import'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsPanelOpen(false)}
                  className="w-full mt-3 flex items-center justify-center py-3.5 px-4 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add Estate Modal */}
      <AnimatePresence>
        {isEstateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
              onClick={() => setIsEstateModalOpen(false)} 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} 
              className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-700"
            >
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Add New Estate</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Estate Name</label>
                  <input 
                    type="text" 
                    value={newEstateName} 
                    onChange={(e) => setNewEstateName(e.target.value)} 
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter estate name"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => setIsEstateModalOpen(false)} 
                  className="flex-1 px-4 py-2.5 text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddEstate} 
                  disabled={!newEstateName.trim() || isLoading}
                  className={`flex-1 px-4 py-2.5 bg-gradient-to-r ${activePalette.gradientFrom} ${activePalette.gradientTo} text-white rounded-xl font-medium shadow-lg hover:opacity-90 transition-all disabled:opacity-50`}
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Add Estate'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Tenant Modal */}
      <AnimatePresence>
        {isEditTenantModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
              onClick={() => setIsEditTenantModalOpen(false)} 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} 
              className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Edit Tenant</h3>
                <button 
                  onClick={() => setIsEditTenantModalOpen(false)}
                  className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Plot / Block</label>
                    <input 
                      type="text" 
                      value={editTenant.block_number || ''} 
                      onChange={(e) => setEditTenant({...editTenant, block_number: e.target.value})} 
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Unit / Door</label>
                    <input 
                      type="text" 
                      value={editTenant.door_number || ''} 
                      onChange={(e) => setEditTenant({...editTenant, door_number: e.target.value})} 
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tenant Name</label>
                  <input 
                    type="text" 
                    value={editTenant.tenant_name || ''} 
                    onChange={(e) => setEditTenant({...editTenant, tenant_name: e.target.value})} 
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</label>
                  <input 
                    type="text" 
                    value={editTenant.phone_number || ''} 
                    onChange={(e) => setEditTenant({...editTenant, phone_number: e.target.value})} 
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Monthly Rate (KES)</label>
                    <input 
                      type="number" 
                      value={editTenant.monthly_rate || ''} 
                      onChange={(e) => setEditTenant({...editTenant, monthly_rate: Number(e.target.value)})} 
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Current Balance</label>
                    <input 
                      type="number" 
                      value={editTenant.current_balance || ''} 
                      onChange={(e) => setEditTenant({...editTenant, current_balance: Number(e.target.value)})} 
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => setIsEditTenantModalOpen(false)} 
                  className="flex-1 px-4 py-2.5 text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleEditTenant} 
                  disabled={isLoading}
                  className={`flex-1 px-4 py-2.5 bg-gradient-to-r ${activePalette.gradientFrom} ${activePalette.gradientTo} text-white rounded-xl font-medium shadow-lg hover:opacity-90 transition-all disabled:opacity-50`}
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Tenant Detail Modal */}
      <AnimatePresence>
        {isTenantDetailModalOpen && selectedTenant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
              onClick={() => setIsTenantDetailModalOpen(false)} 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }} 
              className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700"
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                      <Building2 className="text-white w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">{selectedTenant.houseNumber}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{selectedTenant.tenant_name}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsTenantDetailModalOpen(false)}
                    className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">Phone</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedTenant.phone}</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">Monthly Rate</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">KES {selectedTenant.monthlyRate}</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">Balance</p>
                    <p className={`text-sm font-bold ${selectedTenant.balance > 0 ? 'text-emerald-600' : selectedTenant.balance < 0 ? 'text-rose-600' : 'text-gray-900'}`}>
                      {selectedTenant.balance > 0 ? `+KES ${selectedTenant.balance}` : selectedTenant.balance < 0 ? `-KES ${Math.abs(selectedTenant.balance)}` : 'KES 0'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <DollarSign size={16} />
                  Payment History
                </h4>
                <div className="space-y-3">
                  {getTenantTransactions(selectedTenant).length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <p>No payment history yet</p>
                    </div>
                  ) : (
                    getTenantTransactions(selectedTenant).map((tx) => (
                      <div key={tx.id} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            tx.amount > 0 ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                          }`}>
                            <DollarSign size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{tx.payment_method}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(tx.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-bold ${tx.amount > 0 ? 'text-emerald-600' : 'text-gray-600'}`}>
                            {tx.amount > 0 ? `+KES ${tx.amount}` : tx.amount < 0 ? `-KES ${Math.abs(tx.amount)}` : 'KES 0'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Balance: KES {tx.resulting_balance}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
                {/* M-Pesa Payment Form */}
                <div className="mb-6 bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <DollarSign size={16} />
                    Pay via M-Pesa
                  </h4>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</label>
                      <input
                        type="tel"
                        placeholder="+254700123456"
                        value={paymentPhone}
                        onChange={(e) => setPaymentPhone(e.target.value)}
                        className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${activePalette.focusRing} transition-all duration-200`}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount (KES)</label>
                      <input
                        type="number"
                        placeholder="Enter amount to pay"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${activePalette.focusRing} transition-all duration-200`}
                      />
                    </div>
                    <button
                      onClick={handlePayment}
                      disabled={isProcessingPayment}
                      className={`w-full px-4 py-3 bg-gradient-to-r ${activePalette.gradientFrom} ${activePalette.gradientTo} text-white rounded-xl font-medium shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50`}
                    >
                      {isProcessingPayment && <Loader2 size={18} className="animate-spin" />}
                      <DollarSign size={18} />
                      {isProcessingPayment ? "Processing Payment..." : "Pay via M-Pesa"}
                    </button>
                  </div>
                </div>
                {/* Edit Tenant Button */}
                <button 
                  onClick={() => {
                    openEditTenant(selectedTenant);
                    setIsTenantDetailModalOpen(false);
                  }}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center justify-center gap-2"
                >
                  <Edit2 size={18} />
                  Edit Tenant Details
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Estates;
