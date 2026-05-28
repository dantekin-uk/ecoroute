import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Loader2, Package, AlertTriangle, Calendar, Truck, Users,
  CheckCircle2, AlertCircle, Plus, Trash2, Box,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/useTheme';
import { useAuth } from '../context/useAuth';
import { supabase } from '../supabase';
import { useSupabaseInventory } from '../hooks/useSupabaseInventory';
import InventoryForecastPanel from '../components/InventoryForecastPanel';
import PageStatGrid from '../components/layout/PageStatGrid';
import PageStatCard from '../components/layout/PageStatCard';

const ASSET_CONDITIONS = ['Excellent', 'Good', 'Fair', 'Needs Repair', 'New'];

const emptyConsumable = {
  name: '',
  quantity: '',
  critical_threshold: '',
  unit: 'Units',
  price_per_unit: '',
};

const emptyAsset = {
  name: '',
  condition: 'Good',
  assigned_to: '',
  purchase_price: '',
};

const Inventory = () => {
  const { activePalette } = useTheme();
  const { currentUser } = useAuth();
  const {
    consumables,
    assets,
    dispenseLogs,
    collectors,
    collectorRecords,
    estates,
    isLoading,
    tableMissing,
    isEmpty,
    lowStockItems,
    totalAssetValue,
    totalConsumableValue,
    todaysDispenses,
    defaultForecastItem,
    buildForecast,
  } = useSupabaseInventory();

  const [forecastItem, setForecastItem] = useState('');
  const [filterTab, setFilterTab] = useState('all');
  const [modal, setModal] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newConsumable, setNewConsumable] = useState(emptyConsumable);
  const [newAsset, setNewAsset] = useState(emptyAsset);
  const [newDispense, setNewDispense] = useState({
    collector: '', estate_id: '', item: '', quantity: '',
  });
  const [collectorManual, setCollectorManual] = useState('');

  useEffect(() => {
    if (defaultForecastItem && !forecastItem) {
      setForecastItem(defaultForecastItem);
    }
  }, [defaultForecastItem, forecastItem]);

  useEffect(() => {
    if (forecastItem && !consumables.some((c) => c.name === forecastItem) && consumables[0]) {
      setForecastItem(consumables[0].name);
    }
  }, [consumables, forecastItem]);

  const forecast = useMemo(
    () => (forecastItem ? buildForecast(forecastItem) : { chartData: [], insights: null, itemName: null }),
    [forecastItem, buildForecast],
  );

  const fieldClass = `block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${activePalette?.focusRing || 'focus:ring-emerald-500'} text-sm`;

  const closeModal = () => {
    setModal(null);
    setNewConsumable(emptyConsumable);
    setNewAsset(emptyAsset);
    setNewDispense({ collector: '', estate_id: '', item: '', quantity: '' });
    setCollectorManual('');
  };

  const resolveEstate = (estateId) => estates.find((e) => e.id === estateId);

  const handleCollectorSelect = (collectorName) => {
    const record = collectorRecords.find((c) => c.name === collectorName);
    const assignedEstate = record?.assigned_estate
      ? estates.find((e) => e.id === record.assigned_estate)
      : null;
    setNewDispense((prev) => ({
      ...prev,
      collector: collectorName,
      estate_id: assignedEstate?.id || prev.estate_id,
    }));
  };

  const formatDate = (iso) => new Date(iso).toLocaleString('en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });

  const handleAddConsumable = async (e) => {
    e.preventDefault();
    if (!newConsumable.name.trim() || !currentUser) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('consumables').insert({
        user_id: currentUser.id,
        name: newConsumable.name.trim(),
        quantity: Number(newConsumable.quantity) || 0,
        critical_threshold: Number(newConsumable.critical_threshold) || 0,
        unit: newConsumable.unit.trim() || 'Units',
        price_per_unit: Number(newConsumable.price_per_unit) || 0,
      });
      if (error) throw error;
      closeModal();
    } catch (err) {
      alert(`Could not add stock item: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddAsset = async (e) => {
    e.preventDefault();
    if (!newAsset.name.trim() || !currentUser) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('fixed_assets').insert({
        user_id: currentUser.id,
        name: newAsset.name.trim(),
        condition: newAsset.condition,
        assigned_to: newAsset.assigned_to.trim() || null,
        purchase_price: Number(newAsset.purchase_price) || 0,
      });
      if (error) throw error;
      closeModal();
    } catch (err) {
      alert(`Could not add asset: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDispense = async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    const collectorName = collectors.length > 0 ? newDispense.collector : collectorManual.trim();
    const estate = resolveEstate(newDispense.estate_id);

    if (!collectorName) {
      alert('Select or enter a collector.');
      return;
    }
    if (!estate) {
      alert('Select the estate this stock is for.');
      return;
    }
    if (!newDispense.item || !newDispense.quantity) return;
    if (consumables.length === 0) {
      alert('Add a stock item first before dispensing.');
      return;
    }

    setIsSubmitting(true);
    try {
      const itemToUpdate = consumables.find((c) => c.name === newDispense.item);
      if (itemToUpdate) {
        const newQuantity = Math.max(0, itemToUpdate.quantity - Number(newDispense.quantity));
        const { error: updateError } = await supabase
          .from('consumables')
          .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
          .eq('id', itemToUpdate.id)
          .eq('user_id', currentUser.id);
        if (updateError) throw updateError;
      }

      const payload = {
        user_id: currentUser.id,
        collector: collectorName,
        estate_id: estate.id,
        estate_name: estate.name,
        item: newDispense.item,
        quantity: Number(newDispense.quantity),
        timestamp: new Date().toISOString(),
      };

      let { error: logError } = await supabase.from('dispense_logs').insert(payload);

      if (logError?.message?.includes('estate')) {
        const { estate_id, estate_name, ...legacy } = payload;
        ({ error: logError } = await supabase.from('dispense_logs').insert({...legacy, user_id: currentUser.id}));
      }

      if (logError) throw logError;
      closeModal();
    } catch (err) {
      alert(`Could not dispense stock: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConsumable = async (id, name) => {
    if (!window.confirm(`Remove "${name}" from your stock list?`) || !currentUser) return;
    const { error } = await supabase.from('consumables').delete().eq('id', id).eq('user_id', currentUser.id);
    if (error) alert(`Error: ${error.message}`);
  };

  const handleDeleteAsset = async (id, name) => {
    if (!window.confirm(`Remove asset "${name}"?`) || !currentUser) return;
    const { error } = await supabase.from('fixed_assets').delete().eq('id', id).eq('user_id', currentUser.id);
    if (error) alert(`Error: ${error.message}`);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1920px] mx-auto min-h-screen space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20">
            <Package className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Inventory</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Build and manage your own stock — nothing is pre-filled</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setModal('consumable')}
            disabled={tableMissing}
            className="flex items-center gap-2 bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-300 px-4 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-500/30 font-semibold text-sm hover:bg-emerald-50 dark:hover:bg-emerald-950/30 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add Stock Item
          </button>
          <button
            type="button"
            onClick={() => setModal('asset')}
            disabled={tableMissing}
            className="flex items-center gap-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-800/80 disabled:opacity-50"
          >
            <Box className="h-4 w-4" />
            Add Asset
          </button>
          <button
            type="button"
            onClick={() => setModal('dispense')}
            disabled={tableMissing || consumables.length === 0 || estates.length === 0}
            title={estates.length === 0 ? 'Add an estate first' : undefined}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg hover:bg-emerald-700 font-semibold text-sm disabled:opacity-50"
          >
            <Truck className="h-4 w-4" />
            Dispense
          </button>
        </div>
      </div>

      {tableMissing && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 rounded-2xl p-5 flex gap-4">
          <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-amber-900 dark:text-amber-200">Database setup required</p>
            <p className="text-sm text-amber-800/80 dark:text-amber-300/80 mt-1">
              Run <code className="text-xs bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 rounded">supabase/InventoryTables.sql</code> once (schema only — no sample data).
            </p>
          </div>
        </div>
      )}

      {!tableMissing && isEmpty && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-8 text-center">
          <Package className="h-12 w-12 text-emerald-600 dark:text-emerald-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Start your inventory</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 max-w-md mx-auto">
            Your catalog is empty. Add the consumables and equipment your operation actually uses — same as adding estates or expenses.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <button type="button" onClick={() => setModal('consumable')} className="inline-flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm">
              <Plus size={16} /> Add your first stock item
            </button>
            <button type="button" onClick={() => setModal('asset')} className="inline-flex items-center gap-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-white px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 font-semibold text-sm">
              <Box size={16} /> Add a fixed asset
            </button>
          </div>
        </div>
      )}

      {!isEmpty && lowStockItems.length > 0 && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-500/30 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-red-900 dark:text-red-200">Low stock</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {lowStockItems.map((item) => (
                  <span key={item.id} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-red-950/40 border border-red-200 text-xs font-bold text-red-700 dark:text-red-300">
                    {item.name}: {item.quantity} {item.unit} (min {item.criticalThreshold})
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {!isEmpty && (
        <>
          <PageStatGrid columns={4}>
            <PageStatCard
              label="Low stock"
              value={lowStockItems.length}
              valueClassName="text-red-600 dark:text-red-400"
              icon={AlertTriangle}
              iconClassName="text-red-600 dark:text-red-400"
              iconBgClassName="bg-red-100 dark:bg-red-500/20"
            />
            <PageStatCard
              label="Asset value"
              value={`KES ${totalAssetValue.toLocaleString()}`}
              valueClassName="text-emerald-600 dark:text-emerald-400"
              icon={CheckCircle2}
              iconClassName="text-emerald-600 dark:text-emerald-400"
              iconBgClassName="bg-emerald-100 dark:bg-emerald-500/20"
            />
            <PageStatCard
              label="Stock value"
              value={`KES ${totalConsumableValue.toLocaleString()}`}
              valueClassName="text-amber-600 dark:text-amber-400"
              icon={Package}
              iconClassName="text-amber-600 dark:text-amber-400"
              iconBgClassName="bg-amber-100 dark:bg-amber-500/20"
            />
            <PageStatCard
              label="Today's dispenses"
              value={todaysDispenses.length}
              valueClassName="text-blue-600 dark:text-blue-400"
              icon={Calendar}
              iconClassName="text-blue-600 dark:text-blue-400"
              iconBgClassName="bg-blue-100 dark:bg-blue-500/20"
            />
          </PageStatGrid>

          {consumables.length > 0 && (
            <InventoryForecastPanel
              consumables={consumables}
              forecastItem={forecastItem || consumables[0]?.name}
              onForecastItemChange={setForecastItem}
              forecast={forecast}
            />
          )}

          {collectors.length === 0 && consumables.length > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 px-1">
              <Link to="/team" className="text-emerald-600 font-semibold hover:underline">Add collectors</Link>
              {' '}in Team & Risk for faster dispense logging.
            </p>
          )}

          <div className="flex flex-wrap p-1 bg-gray-100 dark:bg-[#0B0F19] rounded-xl border border-gray-200 dark:border-gray-800 gap-1">
            {['all', 'consumables', 'assets', 'logs'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilterTab(tab)}
                className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg capitalize transition-all ${
                  filterTab === tab ? 'bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700' : 'text-gray-500'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {(filterTab === 'all' || filterTab === 'consumables') && (
            <TableSection title="Stock items (consumables)" subtitle="Items you use up — add your own names, units, and quantities" isLoading={isLoading} empty={consumables.length === 0} emptyAction={() => setModal('consumable')} emptyLabel="Add stock item">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs uppercase text-slate-500 border-b border-gray-200/60 dark:border-white/10 bg-gray-50/50 dark:bg-slate-800/20">
                    <th className="py-4 px-6">Name</th>
                    <th className="py-4 px-6">Qty</th>
                    <th className="py-4 px-6">Alert at</th>
                    <th className="py-4 px-6">Unit price</th>
                    <th className="py-4 px-6">Value</th>
                    <th className="py-4 px-6 text-right"> </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/60 dark:divide-white/5">
                  {consumables.map((item) => {
                    const isLow = item.criticalThreshold > 0 && item.quantity <= item.criticalThreshold;
                    return (
                      <tr key={item.id} className={isLow ? 'bg-red-50/50 dark:bg-red-950/10' : ''}>
                        <td className="py-4 px-6 font-bold text-sm">{item.name}</td>
                        <td className="py-4 px-6 text-sm">{item.quantity} {item.unit}</td>
                        <td className="py-4 px-6 text-sm text-gray-500">{item.criticalThreshold} {item.unit}</td>
                        <td className="py-4 px-6 text-sm">KES {item.pricePerUnit.toLocaleString()}</td>
                        <td className="py-4 px-6 text-sm font-bold">KES {(item.quantity * item.pricePerUnit).toLocaleString()}</td>
                        <td className="py-4 px-6 text-right">
                          <button type="button" onClick={() => handleDeleteConsumable(item.id, item.name)} className="p-2 text-gray-400 hover:text-red-600 rounded-lg" title="Remove">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableSection>
          )}

          {(filterTab === 'all' || filterTab === 'assets') && (
            <TableSection title="Fixed assets" subtitle="Equipment and durable items you own" isLoading={isLoading} empty={assets.length === 0} emptyAction={() => setModal('asset')} emptyLabel="Add asset">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs uppercase text-slate-500 border-b border-gray-200/60 dark:border-white/10 bg-gray-50/50 dark:bg-slate-800/20">
                    <th className="py-4 px-6">Name</th>
                    <th className="py-4 px-6">Condition</th>
                    <th className="py-4 px-6">Assigned to</th>
                    <th className="py-4 px-6">Price</th>
                    <th className="py-4 px-6 text-right"> </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/60 dark:divide-white/5">
                  {assets.map((asset) => (
                    <tr key={asset.id}>
                      <td className="py-4 px-6 font-bold text-sm">{asset.name}</td>
                      <td className="py-4 px-6 text-sm">{asset.condition}</td>
                      <td className="py-4 px-6 text-sm text-gray-500 flex items-center gap-1"><Users size={14} />{asset.assignedTo || '—'}</td>
                      <td className="py-4 px-6 text-sm font-bold">KES {asset.purchasePrice.toLocaleString()}</td>
                      <td className="py-4 px-6 text-right">
                        <button type="button" onClick={() => handleDeleteAsset(asset.id, asset.name)} className="p-2 text-gray-400 hover:text-red-600 rounded-lg" title="Remove">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableSection>
          )}

          {(filterTab === 'all' || filterTab === 'logs') && (
            <TableSection title="Dispense log" subtitle="Recorded when you dispense stock to collectors" isLoading={isLoading} empty={dispenseLogs.length === 0} emptyLabel="No dispenses yet — use Dispense after adding stock">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs uppercase text-slate-500 border-b border-gray-200/60 dark:border-white/10 bg-gray-50/50 dark:bg-slate-800/20">
                <th className="py-4 px-6">Time</th>
                <th className="py-4 px-6">Collector</th>
                <th className="py-4 px-6">Estate</th>
                <th className="py-4 px-6">Item</th>
                <th className="py-4 px-6">Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/60 dark:divide-white/5">
                  {dispenseLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="py-4 px-6 text-sm text-gray-500 whitespace-nowrap">{formatDate(log.timestamp)}</td>
                    <td className="py-4 px-6 text-sm font-bold">{log.collector}</td>
                    <td className="py-4 px-6 text-sm text-gray-600 dark:text-gray-400">{log.estate_name || '—'}</td>
                    <td className="py-4 px-6 text-sm">{log.item}</td>
                      <td className="py-4 px-6 text-sm font-bold text-emerald-600">{log.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableSection>
          )}
        </>
      )}

      <AnimatePresence>
        {modal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {modal === 'consumable' && 'Add stock item'}
                  {modal === 'asset' && 'Add fixed asset'}
                  {modal === 'dispense' && 'Dispense stock'}
                </h3>
                <button type="button" onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>

              {modal === 'consumable' && (
                <form onSubmit={handleAddConsumable} className="p-5 space-y-4">
                  <Field label="Item name" required>
                    <input className={fieldClass} value={newConsumable.name} onChange={(e) => setNewConsumable({ ...newConsumable, name: e.target.value })} placeholder="e.g. Nitrile gloves" required />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Quantity on hand" required>
                      <input type="number" min="0" className={fieldClass} value={newConsumable.quantity} onChange={(e) => setNewConsumable({ ...newConsumable, quantity: e.target.value })} required />
                    </Field>
                    <Field label="Unit">
                      <input className={fieldClass} value={newConsumable.unit} onChange={(e) => setNewConsumable({ ...newConsumable, unit: e.target.value })} placeholder="Bags, Liters, Pcs" />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Low-stock alert at">
                      <input type="number" min="0" className={fieldClass} value={newConsumable.critical_threshold} onChange={(e) => setNewConsumable({ ...newConsumable, critical_threshold: e.target.value })} placeholder="0 = off" />
                    </Field>
                    <Field label="Price per unit (KES)">
                      <input type="number" min="0" className={fieldClass} value={newConsumable.price_per_unit} onChange={(e) => setNewConsumable({ ...newConsumable, price_per_unit: e.target.value })} />
                    </Field>
                  </div>
                  <SubmitButton loading={isSubmitting} label="Save stock item" />
                </form>
              )}

              {modal === 'asset' && (
                <form onSubmit={handleAddAsset} className="p-5 space-y-4">
                  <Field label="Asset name" required>
                    <input className={fieldClass} value={newAsset.name} onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })} placeholder="e.g. Company van" required />
                  </Field>
                  <Field label="Condition">
                    <select className={fieldClass} value={newAsset.condition} onChange={(e) => setNewAsset({ ...newAsset, condition: e.target.value })}>
                      {ASSET_CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label="Assigned to (optional)">
                    <input className={fieldClass} value={newAsset.assigned_to} onChange={(e) => setNewAsset({ ...newAsset, assigned_to: e.target.value })} placeholder="Staff name or Store" />
                  </Field>
                  <Field label="Purchase price (KES)">
                    <input type="number" min="0" className={fieldClass} value={newAsset.purchase_price} onChange={(e) => setNewAsset({ ...newAsset, purchase_price: e.target.value })} />
                  </Field>
                  <SubmitButton loading={isSubmitting} label="Save asset" />
                </form>
              )}

              {modal === 'dispense' && (
                <form onSubmit={handleDispense} className="p-5 space-y-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
                    Stock is issued to a collector for a specific estate route.
                  </p>
                  <Field label="Collector" required>
                    {collectors.length > 0 ? (
                      <select
                        className={fieldClass}
                        value={newDispense.collector}
                        onChange={(e) => handleCollectorSelect(e.target.value)}
                        required
                      >
                        <option value="">Select collector</option>
                        {collectors.map((name) => <option key={name} value={name}>{name}</option>)}
                      </select>
                    ) : (
                      <>
                        <input className={fieldClass} value={collectorManual} onChange={(e) => setCollectorManual(e.target.value)} placeholder="Collector name" required />
                        <p className="text-xs text-gray-500 mt-1">
                          <Link to="/team" className="text-emerald-600 font-medium">Add collectors</Link>
                          {' '}in Team & Risk to auto-link estates.
                        </p>
                      </>
                    )}
                  </Field>
                  <Field label="Estate / route" required>
                    {estates.length > 0 ? (
                      <select
                        className={fieldClass}
                        value={newDispense.estate_id}
                        onChange={(e) => setNewDispense({ ...newDispense, estate_id: e.target.value })}
                        required
                      >
                        <option value="">Select estate</option>
                        {estates.map((est) => (
                          <option key={est.id} value={est.id}>{est.name}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm text-amber-600 dark:text-amber-400">
                        <Link to="/estates" className="font-semibold underline">Add an estate</Link> first to assign dispenses.
                      </p>
                    )}
                  </Field>
                  <Field label="Stock item" required>
                    <select className={fieldClass} value={newDispense.item} onChange={(e) => setNewDispense({ ...newDispense, item: e.target.value })} required>
                      <option value="">Select item</option>
                      {consumables.map((item) => (
                        <option key={item.id} value={item.name}>{item.name} ({item.quantity} {item.unit})</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Quantity" required>
                    <input type="number" min="1" className={fieldClass} value={newDispense.quantity} onChange={(e) => setNewDispense({ ...newDispense, quantity: e.target.value })} required />
                  </Field>
                  <SubmitButton loading={isSubmitting} label="Record dispense" icon={Truck} />
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

function TableSection({ title, subtitle, isLoading, empty, emptyAction, emptyLabel, children }) {
  return (
    <div className="bg-white/80 dark:bg-[#1E293B]/30 backdrop-blur-xl border border-gray-200/60 dark:border-slate-700/50 rounded-2xl shadow-xl overflow-hidden">
      <div className="p-5 border-b border-gray-200/60 dark:border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
        </div>
        {emptyAction && !isLoading && (
          <button type="button" onClick={emptyAction} className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
            <Plus size={16} /> Add
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="py-16 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Loading…</p>
          </div>
        ) : empty ? (
          <div className="py-12 px-6 text-center text-sm text-gray-500">
            <p>{emptyLabel || 'Nothing here yet.'}</p>
            {emptyAction && (
              <button type="button" onClick={emptyAction} className="mt-4 inline-flex items-center gap-2 text-emerald-600 font-semibold">
                <Plus size={16} /> {emptyLabel?.includes('Add') ? emptyLabel : 'Add item'}
              </button>
            )}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function Field({ label, children, required }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
        {label}{required && ' *'}
      </label>
      {children}
    </div>
  );
}

function SubmitButton({ loading, label, icon: Icon }) {
  return (
    <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-2.5 rounded-xl font-semibold disabled:opacity-50">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-4 w-4" /> : null}
      {loading ? 'Saving…' : label}
    </button>
  );
}

export default Inventory;
