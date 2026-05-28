import React, { useState, useEffect } from 'react';
import { Search, Plus, X, Loader2, Wallet, TrendingUp, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/useTheme';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import PageHeader from '../components/layout/PageHeader';
import PageStatGrid from '../components/layout/PageStatGrid';
import PageStatCard from '../components/layout/PageStatCard';

const Collections = () => {
  const { activePalette } = useTheme();
  const { currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMethod, setFilterMethod] = useState('All');
  const [transactions, setTransactions] = useState([]);
  const [houses, setHouses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [newPayment, setNewPayment] = useState({ houseNumber: '', estateId: '', amount: '', method: 'Cash' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [estatesData, setEstatesData] = useState([]);

  useEffect(() => {
    if (!currentUser) return;
    fetchData();
    fetchEstates();

    // Set up real-time subscriptions
    const tenantsSubscription = supabase
      .channel('collections-tenants-changes')
      .on('postgres_changes', { event: '*', table: 'tenants', schema: 'public', filter: `user_id=eq.${currentUser.id}` }, () => {
        fetchData();
      })
      .subscribe();

    const transactionsSubscription = supabase
      .channel('collections-transactions-changes')
      .on('postgres_changes', { event: '*', table: 'transactions', schema: 'public', filter: `user_id=eq.${currentUser.id}` }, () => {
        fetchData();
      })
      .subscribe();

    const estatesSubscription = supabase
      .channel('collections-estates-changes')
      .on('postgres_changes', { event: '*', table: 'estates', schema: 'public', filter: `user_id=eq.${currentUser.id}` }, () => {
        fetchEstates();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(tenantsSubscription);
      supabase.removeChannel(transactionsSubscription);
      supabase.removeChannel(estatesSubscription);
    };
  }, [currentUser]);

  const fetchEstates = async () => {
    if (!currentUser) return;
    const { data } = await supabase.from('estates').select('*').eq('user_id', currentUser.id);
    if (data) {
      setEstatesData(data);
      if (data.length > 0 && !newPayment.estateId) {
        setNewPayment(prev => ({ ...prev, estateId: data[0].id }));
      }
    }
  };

  const fetchData = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    
    // 1. Fetch current active tenants balances and link with estates
    const { data: tenantsData } = await supabase
      .from('tenants')
      .select(`
        *,
        estates (
          name
        )
      `)
      .eq('user_id', currentUser.id);

    if (tenantsData) {
      setHouses(tenantsData.map(t => ({ 
        id: t.id, 
        house_number: t.door_number ? `${t.block_number}-${t.door_number}` : t.block_number, 
        estate: t.estates?.name || 'Unknown Estate',
        estate_id: t.estate_id,
        balance: Number(t.current_balance), 
        rate: Number(t.monthly_rate) 
      })));
    }

    // 2. Fetch all historical transactions
    const { data: txData } = await supabase.from('transactions').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });
    if (txData) {
      const actualPayments = txData.filter(tx => !tx.payment_method?.startsWith('Incident'));
      setTransactions(actualPayments.map(tx => ({
        id: tx.id.split('-')[0].toUpperCase(), // Takes the first chunk of the UUID to make a clean TRX-ID
        full_id: tx.id,
        date: new Date(tx.created_at).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
        houseNumber: tx.house_number,
        estate: tx.estate_name,
        amount: `KES ${Number(tx.amount).toLocaleString()}`,
        rawAmount: Number(tx.amount),
        method: tx.payment_method,
        collector: tx.collector_name || 'Admin',
        balance: Number(tx.resulting_balance)
      })));
    }
    setIsLoading(false);
  };

  // Filter Logic
  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          tx.houseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          tx.estate.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesFilter = false;
    if (filterMethod === 'All') matchesFilter = true;
    else if (filterMethod === 'Pending') matchesFilter = tx.method?.includes('Pending');
    else matchesFilter = tx.method === filterMethod;

    return matchesSearch && matchesFilter;
  });

  const handleApprovePayment = async (txFullId, currentMethod) => {
    if (!currentUser) return;
    try {
      const newMethod = currentMethod.replace(' (Pending)', '');
      
      // Fetch the transaction details first to get the amount, house, estate
      const { data: txData } = await supabase.from('transactions').select('*').eq('id', txFullId).eq('user_id', currentUser.id).single();
      
      if (!txData) throw new Error('Transaction not found');

      // Fetch estate to get ID
      const { data: estateData } = await supabase.from('estates').select('id').eq('name', txData.estate_name).eq('user_id', currentUser.id).single();
      
      if (estateData) {
        const { data: tenants } = await supabase.from('tenants').select('*').eq('estate_id', estateData.id).eq('user_id', currentUser.id);
        let tenantId = null;
        let currentBalance = 0;
        
        if (tenants) {
          const tenant = tenants.find(t => {
            const hId = t.door_number ? `${t.block_number}-${t.door_number}` : t.block_number;
            return hId === txData.house_number;
          });
          if (tenant) {
            tenantId = tenant.id;
            currentBalance = Number(tenant.current_balance);
          }
        }
        
        if (tenantId) {
          const newBalance = currentBalance + Number(txData.amount);
          await supabase.from('tenants').update({ current_balance: newBalance }).eq('id', tenantId).eq('user_id', currentUser.id);
          
          await supabase.from('transactions').update({ 
            payment_method: newMethod,
            resulting_balance: newBalance
          }).eq('id', txFullId).eq('user_id', currentUser.id);
        } else {
          await supabase.from('transactions').update({ payment_method: newMethod }).eq('id', txFullId).eq('user_id', currentUser.id);
        }
      } else {
        await supabase.from('transactions').update({ payment_method: newMethod }).eq('id', txFullId).eq('user_id', currentUser.id);
      }
      
      // The real-time subscription will refresh the data automatically
    } catch (err) {
      console.error('Error approving payment:', err);
      alert(`Error approving payment: ${err.message}`);
    }
  };

  // Dynamic Stats Calculations
  const totalMonthlyRate = houses.reduce((sum, h) => sum + (h.rate || 0), 0);
  
  // Actually collected this month (we would ideally filter transactions by current month)
  // For now, let's assume all transactions in state are recent or use a simpler metric
  const totalCollected = transactions.reduce((sum, tx) => {
    if (tx.method?.includes('(Pending)')) return sum;
    return sum + (tx.rawAmount || 0);
  }, 0);

  // Defaulter Rate: % of tenants with negative balance
  const defaultingTenants = houses.filter(h => h.balance < 0).length;
  const totalTenants = houses.length || 1;
  const defaulterRate = ((defaultingTenants / totalTenants) * 100).toFixed(1);

  const handleLogPayment = async (e) => {
    e.preventDefault();
    if (!newPayment.houseNumber || newPayment.amount === '' || !newPayment.estateId || !currentUser) return;

    setIsSubmitting(true);
    const paidAmount = Number(newPayment.amount);
    const houseNum = newPayment.houseNumber.toUpperCase();
    const estateObj = estatesData.find(e => e.id === newPayment.estateId);
    const finalEstateName = estateObj?.name || 'Unknown Estate';

    // 1. Find the house in our current local state
    const existingHouse = houses.find(h => 
      h.house_number.toUpperCase() === houseNum && 
      h.estate_id === newPayment.estateId
    );

    let newBalance = 0;

    try {
      if (existingHouse) {
        newBalance = existingHouse.balance + paidAmount;
        // Update existing tenant's balance in Supabase
        const { error: updateError } = await supabase
          .from('tenants')
          .update({ current_balance: newBalance })
          .eq('id', existingHouse.id)
          .eq('user_id', currentUser.id);
        
        if (updateError) throw updateError;
      } else {
        // Fallback: If tenant doesn't exist, we can't accurately know their rate
        // In a modern app, we should probably warn the user or create a guest entry
        // For now, we'll use a default rate of 0 if they don't exist
        newBalance = paidAmount; 
        
        const { error: insertError } = await supabase
          .from('tenants')
          .insert([{
            user_id: currentUser.id,
            estate_id: newPayment.estateId,
            block_number: houseNum,
            tenant_name: 'Unregistered Occupant',
            monthly_rate: 0, 
            current_balance: newBalance,
            is_active: true
          }]);
          
        if (insertError) throw insertError;
      }

      // 2. Log the actual payment record
      const { error: txError } = await supabase
        .from('transactions')
        .insert([{
          user_id: currentUser.id,
          house_number: houseNum,
          estate_name: finalEstateName,
          amount: paidAmount,
          payment_method: newPayment.method,
          resulting_balance: newBalance
        }]);

      if (txError) throw txError;

      // 3. Success cleanup
      setIsPaymentModalOpen(false);
      setNewPayment({ ...newPayment, houseNumber: '', amount: '' });
      await fetchData();
    } catch (err) {
      console.error('Payment Error:', err);
      alert(`Error logging payment: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1920px] mx-auto min-h-screen space-y-6">
      
      <PageHeader
        icon={Wallet}
        iconClassName="text-blue-600 dark:text-blue-400"
        iconBgClassName="bg-blue-500/10 dark:bg-blue-500/20"
        title="Collections & Ledger"
        subtitle="Payments and M-PESA — live from Supabase"
        actions={
          <button
            type="button"
            onClick={() => setIsPaymentModalOpen(true)}
            className="flex-shrink-0 flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl shadow-lg hover:bg-blue-700 transition-all font-semibold text-sm"
          >
            <Plus className="h-4 w-4" />
            Log Cash Payment
          </button>
        }
      />

      <PageStatGrid columns={3}>
        <PageStatCard
          label="Monthly Billing"
          value={`KES ${totalMonthlyRate.toLocaleString()}`}
          icon={Wallet}
          iconClassName="text-gray-600 dark:text-gray-300"
          iconBgClassName="bg-gray-100 dark:bg-gray-800"
        />
        <PageStatCard
          label="Total Collected"
          value={`KES ${totalCollected.toLocaleString()}`}
          subtitle="Approved payments only"
          icon={TrendingUp}
          valueClassName="text-emerald-600 dark:text-emerald-400"
          iconClassName="text-emerald-600 dark:text-emerald-400"
          iconBgClassName="bg-emerald-100 dark:bg-emerald-500/20"
        />
        <PageStatCard
          label="Defaulter Rate"
          value={`${defaulterRate}%`}
          subtitle={`${defaultingTenants} of ${totalTenants} in debt`}
          icon={AlertTriangle}
          valueClassName={parseFloat(defaulterRate) > 20 ? 'text-rose-600 dark:text-rose-500' : 'text-gray-900 dark:text-white'}
          iconClassName="text-rose-600 dark:text-rose-400"
          iconBgClassName="bg-rose-100 dark:bg-rose-500/20"
        />
      </PageStatGrid>

      {/* 2. The Master Ledger (Data Table Container) */}
      <div className="bg-white/80 dark:bg-[#1E293B]/30 backdrop-blur-xl border border-gray-200/60 dark:border-slate-700/50 rounded-2xl shadow-xl overflow-hidden flex flex-col">
        
        {/* Header Area with Filters */}
        <div className="p-5 border-b border-gray-200/60 dark:border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative w-full sm:max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search House No, Estate, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`block w-full pl-10 pr-4 py-2.5 border-0 bg-white dark:bg-[#1E293B]/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-xl focus:ring-2 ${activePalette?.focusRing || 'focus:ring-blue-500'} focus:bg-white dark:focus:bg-[#1E293B] transition-all duration-200 shadow-sm border border-gray-200 dark:border-slate-700/50 text-sm`}
            />
          </div>

          {/* Segmented Control */}
          <div className="flex p-1 bg-gray-100 dark:bg-[#0B0F19] rounded-xl border border-gray-200 dark:border-gray-800 w-full sm:w-auto">
            {['All', 'M-PESA', 'Cash', 'Pending'].map(method => (
              <button
                key={method}
                onClick={() => setFilterMethod(method)}
                className={`flex-1 sm:flex-none px-5 py-1.5 text-sm font-semibold rounded-lg transition-all ${
                  filterMethod === method 
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-700' 
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border border-transparent'
                }`}
              >
                {method}
              </button>
            ))}
          </div>
        </div>

        {/* 3. The Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider border-b border-gray-200/60 dark:border-white/10 bg-gray-50/50 dark:bg-slate-800/20">
                <th className="py-4 px-6 font-semibold">Date</th>
                <th className="py-4 px-6 font-semibold">Transaction ID</th>
                <th className="py-4 px-6 font-semibold">House No.</th>
                <th className="py-4 px-6 font-semibold">Amount</th>
                <th className="py-4 px-6 font-semibold">Method</th>
                <th className="py-4 px-6 font-semibold">Account Balance</th>
                <th className="py-4 px-6 font-semibold">Collector</th>
                <th className="py-4 px-6 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/60 dark:divide-white/5 relative">
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="py-16 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">Loading ledger data from Supabase...</p>
                  </td>
                </tr>
              ) : filteredTransactions.length > 0 ? (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50/80 dark:hover:bg-white/5 transition-colors group">
                    <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{tx.date}</td>
                    <td className="py-4 px-6 whitespace-nowrap font-mono text-sm font-medium text-gray-900 dark:text-white">{tx.id}</td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{tx.houseNumber}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{tx.estate}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">{tx.amount}</td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                        tx.method.includes('M-PESA')
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/20'
                          : tx.method.includes('Cash')
                          ? 'bg-slate-100 text-slate-700 dark:bg-slate-500/10 dark:text-slate-400 border-slate-200 dark:border-slate-500/20'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400 border-gray-200 dark:border-gray-500/20'
                      }`}>{tx.method}</span>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                        tx.balance > 0 
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' 
                          : tx.balance < 0 
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-500/20' 
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-500/10 dark:text-slate-400 border-slate-200 dark:border-slate-500/20'
                      }`}>{tx.balance > 0 ? `+KES ${tx.balance}` : tx.balance < 0 ? `-KES ${Math.abs(tx.balance)}` : 'KES 0 (Settled)'}</span>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{tx.collector}</td>
                    <td className="py-4 px-6 whitespace-nowrap text-right">
                      {tx.method?.includes('Pending') ? (
                        <button 
                          onClick={() => handleApprovePayment(tx.full_id, tx.method)}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-colors"
                        >
                          Approve
                        </button>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 text-xs font-medium">Approved</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="py-10 px-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    No transactions found matching your search or filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Payment Modal */}
      <AnimatePresence>
        {isPaymentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
              onClick={() => setIsPaymentModalOpen(false)} 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} 
              className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Log Cash Payment</h3>
                <button onClick={() => setIsPaymentModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleLogPayment} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Estate</label>
                  <select 
                    value={newPayment.estateId} 
                    onChange={(e) => setNewPayment({...newPayment, estateId: e.target.value})} 
                    className={`block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${activePalette?.focusRing || 'focus:ring-blue-500'} text-sm`}
                  >
                    <option value="">Select Estate...</option>
                    {estatesData.map(estate => (
                      <option key={estate.id} value={estate.id}>{estate.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">House Number</label>
                  <input type="text" required value={newPayment.houseNumber} onChange={(e) => setNewPayment({...newPayment, houseNumber: e.target.value})} className={`block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 ${activePalette?.focusRing || 'focus:ring-blue-500'} text-sm`} placeholder="e.g. A1 or 12" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Amount Paid (KES)</label>
                  <input type="number" required min="0" value={newPayment.amount} onChange={(e) => setNewPayment({...newPayment, amount: e.target.value})} className={`block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 ${activePalette?.focusRing || 'focus:ring-blue-500'} text-sm`} placeholder="e.g. 450" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Payment Method</label>
                  <select value={newPayment.method} onChange={(e) => setNewPayment({...newPayment, method: e.target.value})} className={`block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${activePalette?.focusRing || 'focus:ring-blue-500'} text-sm`}>
                    <option value="Cash">Cash</option>
                    <option value="M-PESA">M-PESA (Manual Override)</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="flex-1 py-2.5 px-4 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm font-medium border border-gray-200 dark:border-gray-700">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className={`flex-1 py-2.5 px-4 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition-colors text-sm font-semibold disabled:opacity-50 flex justify-center items-center gap-2`}>
                    {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                    {isSubmitting ? 'Saving...' : 'Save Payment'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Collections;