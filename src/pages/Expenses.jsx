import React, { useState, useMemo } from 'react';
import { Search, Plus, X, Loader2, Receipt, TrendingDown, Calendar, Trash2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/useTheme';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import { useSupabaseExpenses } from '../hooks/useSupabaseExpenses';
import ExpensesSpendChart from '../components/ExpensesSpendChart';
import PageHeader from '../components/layout/PageHeader';
import PageStatGrid from '../components/layout/PageStatGrid';
import PageStatCard from '../components/layout/PageStatCard';

const CATEGORIES = ['All', 'Maintenance', 'Utilities', 'Salaries', 'Operations', 'Security', 'General'];
const CATEGORY_COLORS = {
  Maintenance: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
  Utilities: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/20',
  Salaries: 'bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400 border-violet-200 dark:border-violet-500/20',
  Operations: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/20',
  Security: 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-500/20',
  General: 'bg-slate-100 text-slate-700 dark:bg-slate-500/10 dark:text-slate-400 border-slate-200 dark:border-slate-500/20',
};

const Expenses = () => {
  const { activePalette } = useTheme();
  const { currentUser } = useAuth();
  const { expenses, isLoading, tableMissing, totalAllTime, totalThisMonth } = useSupabaseExpenses({ userId: currentUser?.id });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [estatesData, setEstatesData] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newExpense, setNewExpense] = useState({
    title: '',
    amount: '',
    category: 'General',
    estate_name: '',
    payment_method: 'Cash',
    notes: '',
  });

  React.useEffect(() => {
    if (!currentUser) return;
    const fetchEstates = async () => {
      const { data } = await supabase.from('estates').select('name').eq('user_id', currentUser.id).order('name');
      if (data) setEstatesData(data);
    };
    fetchEstates();
  }, [currentUser]);

  const filteredExpenses = useMemo(() => expenses.filter((exp) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || exp.title?.toLowerCase().includes(q) || exp.estate_name?.toLowerCase().includes(q) || exp.category?.toLowerCase().includes(q);
    return matchesSearch && (filterCategory === 'All' || exp.category === filterCategory);
  }), [expenses, searchQuery, filterCategory]);

  const categoryTotals = useMemo(() => {
    const totals = {};
    expenses.forEach((e) => { const cat = e.category || 'General'; totals[cat] = (totals[cat] || 0) + Number(e.amount || 0); });
    return totals;
  }, [expenses]);

  const topCategory = useMemo(() => {
    const entries = Object.entries(categoryTotals);
    return entries.length ? entries.sort((a, b) => b[1] - a[1])[0][0] : '-';
  }, [categoryTotals]);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!newExpense.title || newExpense.amount === '' || !currentUser) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('expenses').insert([{
        user_id: currentUser.id,
        title: newExpense.title.trim(),
        amount: Number(newExpense.amount),
        category: newExpense.category,
        estate_name: newExpense.estate_name || null,
        payment_method: newExpense.payment_method,
        notes: newExpense.notes?.trim() || null,
        status: 'Approved',
      }]);
      if (error) throw error;
      setIsModalOpen(false);
      setNewExpense({ title: '', amount: '', category: 'General', estate_name: '', payment_method: 'Cash', notes: '' });
    } catch (err) {
      alert(`Could not save expense: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Delete this expense record?') || !currentUser) return;
    const { error } = await supabase.from('expenses').delete().eq('id', id).eq('user_id', currentUser.id);
    if (error) alert(`Error deleting expense: ${error.message}`);
  };

  const formatDate = (iso) => new Date(iso).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

  const fieldClass = `block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${activePalette?.focusRing || 'focus:ring-rose-500'} text-sm`;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1920px] mx-auto min-h-screen space-y-6">
      <PageHeader
        icon={Receipt}
        iconClassName="text-rose-600 dark:text-rose-400"
        iconBgClassName="bg-rose-500/10 dark:bg-rose-500/20"
        title="Expenses"
        subtitle="Operational spend across estates — live from Supabase"
        actions={
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            disabled={tableMissing}
            className="flex-shrink-0 flex items-center gap-2 bg-rose-600 text-white px-5 py-2.5 rounded-xl shadow-lg hover:bg-rose-700 font-semibold text-sm disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Log Expense
          </button>
        }
      />

      {tableMissing && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 rounded-2xl p-5 flex gap-4">
          <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900 dark:text-amber-200">Database setup required</p>
            <p className="text-sm text-amber-800/80 dark:text-amber-300/80 mt-1">
              Run <code className="text-xs bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 rounded">supabase/expenses_table.sql</code> in your Supabase SQL Editor.
            </p>
          </div>
        </div>
      )}

      <PageStatGrid columns={3}>
        <PageStatCard
          label="Total Spend"
          value={`KES ${totalAllTime.toLocaleString()}`}
          valueClassName="text-rose-600 dark:text-rose-400"
          icon={Receipt}
          iconClassName="text-rose-600 dark:text-rose-400"
          iconBgClassName="bg-rose-100 dark:bg-rose-500/20"
        />
        <PageStatCard
          label="This Month"
          value={`KES ${totalThisMonth.toLocaleString()}`}
          icon={Calendar}
          iconClassName="text-gray-600 dark:text-gray-300"
          iconBgClassName="bg-gray-100 dark:bg-gray-800"
        />
        <PageStatCard
          label="Top Category"
          value={topCategory}
          icon={TrendingDown}
          iconClassName="text-violet-600 dark:text-violet-400"
          iconBgClassName="bg-violet-100 dark:bg-violet-500/20"
        />
      </PageStatGrid>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex flex-wrap p-1 bg-gray-100 dark:bg-[#0B0F19] rounded-xl border border-gray-200 dark:border-gray-800 gap-1 flex-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all ${filterCategory === cat ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-700' : 'text-gray-500 border border-transparent'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {!tableMissing && (
        <ExpensesSpendChart expenses={expenses} categoryFilter={filterCategory} />
      )}

      <div className="bg-white/80 dark:bg-[#1E293B]/30 backdrop-blur-xl border border-gray-200/60 dark:border-slate-700/50 rounded-2xl shadow-xl overflow-hidden flex flex-col">
        <div className="p-5 border-b border-gray-200/60 dark:border-white/10">
          <div className="relative w-full lg:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search title, estate, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`block w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#1E293B]/50 text-gray-900 dark:text-white placeholder-gray-500 rounded-xl focus:ring-2 ${activePalette?.focusRing || 'focus:ring-rose-500'} border border-gray-200 dark:border-slate-700/50 text-sm`}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider border-b border-gray-200/60 dark:border-white/10 bg-gray-50/50 dark:bg-slate-800/20">
                <th className="py-4 px-6 font-semibold">Date</th>
                <th className="py-4 px-6 font-semibold">Title</th>
                <th className="py-4 px-6 font-semibold">Category</th>
                <th className="py-4 px-6 font-semibold">Estate</th>
                <th className="py-4 px-6 font-semibold">Amount</th>
                <th className="py-4 px-6 font-semibold">Method</th>
                <th className="py-4 px-6 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/60 dark:divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="py-16 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-rose-500 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">Loading expenses from Supabase...</p>
                  </td>
                </tr>
              ) : filteredExpenses.length > 0 ? (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-gray-50/80 dark:hover:bg-white/5 transition-colors">
                    <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{formatDate(exp.created_at)}</td>
                    <td className="py-4 px-6">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{exp.title}</span>
                      {exp.notes && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-[200px]">{exp.notes}</p>}
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${CATEGORY_COLORS[exp.category] || CATEGORY_COLORS.General}`}>{exp.category}</span>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{exp.estate_name || '-'}</td>
                    <td className="py-4 px-6 whitespace-nowrap text-sm font-bold text-rose-600 dark:text-rose-400">KES {Number(exp.amount).toLocaleString()}</td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border bg-slate-100 text-slate-700 dark:bg-slate-500/10 dark:text-slate-400 border-slate-200 dark:border-slate-500/20">{exp.payment_method || 'Cash'}</span>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap text-right">
                      <button type="button" onClick={() => handleDeleteExpense(exp.id)} className="p-2 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors" title="Delete expense">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="py-10 px-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    {tableMissing ? 'Create the expenses table in Supabase to start tracking spend.' : 'No expenses found. Log your first expense to get started.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Log Expense</h3>
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={20} /></button>
              </div>
              <form onSubmit={handleAddExpense} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Title</label>
                  <input type="text" required value={newExpense.title} onChange={(e) => setNewExpense({ ...newExpense, title: e.target.value })} className={fieldClass} placeholder="e.g. Generator fuel" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Amount (KES)</label>
                    <input type="number" required min="0" value={newExpense.amount} onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })} className={fieldClass} placeholder="5000" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Category</label>
                    <select value={newExpense.category} onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })} className={fieldClass}>
                      {CATEGORIES.filter((c) => c !== 'All').map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Estate (optional)</label>
                  <select value={newExpense.estate_name} onChange={(e) => setNewExpense({ ...newExpense, estate_name: e.target.value })} className={fieldClass}>
                    <option value="">All / Company-wide</option>
                    {estatesData.map((e) => <option key={e.name} value={e.name}>{e.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Payment Method</label>
                  <select value={newExpense.payment_method} onChange={(e) => setNewExpense({ ...newExpense, payment_method: e.target.value })} className={fieldClass}>
                    <option value="Cash">Cash</option>
                    <option value="M-PESA">M-PESA</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes (optional)</label>
                  <textarea value={newExpense.notes} onChange={(e) => setNewExpense({ ...newExpense, notes: e.target.value })} rows={2} className={`${fieldClass} resize-none`} placeholder="Invoice ref, vendor, etc." />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 px-4 rounded-xl text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 text-sm font-medium">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 px-4 bg-rose-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex justify-center items-center gap-2">
                    {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                    {isSubmitting ? 'Saving...' : 'Save Expense'}
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

export default Expenses;
