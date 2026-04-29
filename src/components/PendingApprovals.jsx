import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Clock, AlertCircle } from 'lucide-react';

const PendingApprovals = () => {
  const [pendingTxs, setPendingTxs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .like('payment_method', '%(Pending)%')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPendingTxs(data || []);
    } catch (err) {
      console.error('Error fetching pending transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();

    const sub = supabase
      .channel('pending-approvals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        fetchPending();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, []);

  const handleApprove = async (tx) => {
    try {
      // 1. Remove '(Pending)' from payment method
      const newMethod = tx.payment_method.replace(' (Pending)', '');
      
      // 2. Fetch the tenant to update balance
      // Note: we assume house_number in tx matches tenant's block_number or block_number-door_number
      // But we need estate_id. MobileCollectorGrid logs 'estate_name', so we fetch estate_id first
      const { data: estateData } = await supabase.from('estates').select('id').eq('name', tx.estate_name).single();
      
      if (estateData) {
        // Look up tenant
        // In MobileCollectorGrid, selectedHouse.id was either block_number-door_number or block_number
        // We'll do a simple match using a custom RPC or fetch all tenants for the estate
        const { data: tenants } = await supabase.from('tenants').select('*').eq('estate_id', estateData.id);
        
        let tenantId = null;
        let currentBalance = 0;
        
        if (tenants) {
          const tenant = tenants.find(t => {
            const hId = t.door_number ? `${t.block_number}-${t.door_number}` : t.block_number;
            return hId === tx.house_number;
          });
          if (tenant) {
            tenantId = tenant.id;
            currentBalance = Number(tenant.current_balance);
          }
        }
        
        if (tenantId) {
          // Add the payment to the tenant's balance (current_balance + amount)
          // Wait, if balance is negative (they owe money), logging a payment means current_balance + amount
          const newBalance = currentBalance + Number(tx.amount);
          await supabase.from('tenants').update({ current_balance: newBalance }).eq('id', tenantId);
          
          // Also update transaction's resulting_balance to reflect true updated balance
          await supabase.from('transactions').update({ 
            payment_method: newMethod,
            resulting_balance: newBalance
          }).eq('id', tx.id);
        } else {
          // Tenant not found (unlikely), just update tx
          await supabase.from('transactions').update({ payment_method: newMethod }).eq('id', tx.id);
        }
      } else {
         // Estate not found, just update tx
         await supabase.from('transactions').update({ payment_method: newMethod }).eq('id', tx.id);
      }
      
    } catch (err) {
      console.error('Approval error:', err);
      alert(`Failed to approve: ${err.message}`);
    }
  };

  const handleReject = async (txId) => {
    if (!window.confirm('Are you sure you want to reject and delete this payment log?')) return;
    try {
      await supabase.from('transactions').delete().eq('id', txId);
    } catch (err) {
      console.error('Rejection error:', err);
      alert(`Failed to reject: ${err.message}`);
    }
  };

  if (loading) return null;
  if (pendingTxs.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-gray-800 relative overflow-hidden mb-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
          <Clock className="text-orange-500 w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Pending Approvals</h2>
          <p className="text-sm text-gray-500">Payments waiting for admin review</p>
        </div>
        <div className="ml-auto bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse">
          {pendingTxs.length} Pending
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {pendingTxs.map((tx) => (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{tx.estate_name}</span>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">Door {tx.house_number}</h3>
                </div>
                <span className="bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 text-xs font-bold px-2 py-1 rounded-lg">
                  {tx.payment_method.replace(' (Pending)', '')}
                </span>
              </div>
              
              <div className="text-2xl font-black text-emerald-500 mb-4">
                KES {tx.amount}
              </div>

              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => handleReject(tx.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 font-bold transition-colors text-sm"
                >
                  <X className="w-4 h-4" /> Reject
                </button>
                <button
                  onClick={() => handleApprove(tx)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-colors shadow-lg shadow-emerald-500/20 text-sm"
                >
                  <Check className="w-4 h-4" /> Approve
                </button>
              </div>
              <div className="text-[10px] text-gray-400 mt-3 text-center">
                Logged by {tx.collector_name || 'Unknown'}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PendingApprovals;