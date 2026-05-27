import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabase';
import { isToday } from '../lib/dateRange';
import { buildInventoryForecast, pickBestForecastItem } from '../lib/inventoryForecast';
import { useAuth } from '../context/AuthContext';

function mapConsumable(item) {
  return {
    ...item,
    criticalThreshold: item.critical_threshold,
    pricePerUnit: Number(item.price_per_unit || 0),
  };
}

function mapAsset(item) {
  return {
    ...item,
    assignedTo: item.assigned_to,
    purchasePrice: Number(item.purchase_price || 0),
  };
}

export function useSupabaseInventory() {
  const { currentUser } = useAuth();
  
  const [consumables, setConsumables] = useState([]);
  const [assets, setAssets] = useState([]);
  const [dispenseLogs, setDispenseLogs] = useState([]);
  const [collectorRecords, setCollectorRecords] = useState([]);
  const [estates, setEstates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);

  const fetchAllData = useCallback(async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    try {
      const [consumablesResult, assetsResult, logsResult, collectorsResult, estatesResult] = await Promise.all([
        supabase.from('consumables').select('*').eq('user_id', currentUser.id).order('name'),
        supabase.from('fixed_assets').select('*').eq('user_id', currentUser.id).order('name'),
        supabase.from('dispense_logs').select('*').eq('user_id', currentUser.id).order('timestamp', { ascending: false }),
        supabase.from('collectors').select('id, name, assigned_estate').eq('user_id', currentUser.id).order('name'),
        supabase.from('estates').select('id, name').eq('user_id', currentUser.id).order('name'),
      ]);

      const missing =
        consumablesResult.error?.code === 'PGRST205' ||
        assetsResult.error?.code === 'PGRST205' ||
        logsResult.error?.code === 'PGRST205';

      if (missing) {
        setTableMissing(true);
        setConsumables([]);
        setAssets([]);
        setDispenseLogs([]);
      } else {
        setTableMissing(false);
        setConsumables((consumablesResult.data || []).map(mapConsumable));
        setAssets((assetsResult.data || []).map(mapAsset));
        setDispenseLogs(logsResult.data || []);
      }

      if (!collectorsResult.error && collectorsResult.data) {
        setCollectorRecords(collectorsResult.data.filter((c) => c.name));
      } else {
        setCollectorRecords([]);
      }

      if (!estatesResult.error && estatesResult.data) {
        setEstates(estatesResult.data);
      } else {
        setEstates([]);
      }
    } catch (err) {
      console.error('Error fetching inventory data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    
    fetchAllData();

    const consumablesChannel = supabase
      .channel('consumables-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'consumables', filter: `user_id=eq.${currentUser.id}` }, () => fetchAllData())
      .subscribe();

    const assetsChannel = supabase
      .channel('assets-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fixed_assets', filter: `user_id=eq.${currentUser.id}` }, () => fetchAllData())
      .subscribe();

    const logsChannel = supabase
      .channel('dispense-logs-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dispense_logs', filter: `user_id=eq.${currentUser.id}` }, () => fetchAllData())
      .subscribe();

    const collectorsChannel = supabase
      .channel('collectors-inventory-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collectors', filter: `user_id=eq.${currentUser.id}` }, () => fetchAllData())
      .subscribe();

    const estatesChannel = supabase
      .channel('estates-inventory-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'estates', filter: `user_id=eq.${currentUser.id}` }, () => fetchAllData())
      .subscribe();

    return () => {
      supabase.removeChannel(consumablesChannel);
      supabase.removeChannel(assetsChannel);
      supabase.removeChannel(logsChannel);
      supabase.removeChannel(collectorsChannel);
      supabase.removeChannel(estatesChannel);
    };
  }, [currentUser, fetchAllData]);

  const collectors = useMemo(
    () => collectorRecords.map((c) => c.name),
    [collectorRecords],
  );

  const lowStockItems = useMemo(
    () => consumables.filter((c) => c.quantity <= c.criticalThreshold),
    [consumables],
  );

  const totalAssetValue = useMemo(
    () => assets.reduce((sum, a) => sum + a.purchasePrice, 0),
    [assets],
  );

  const totalConsumableValue = useMemo(
    () => consumables.reduce((sum, c) => sum + c.quantity * c.pricePerUnit, 0),
    [consumables],
  );

  const todaysDispenses = useMemo(
    () => dispenseLogs.filter((log) => isToday(log.timestamp)),
    [dispenseLogs],
  );

  const isEmpty = !isLoading && !tableMissing && consumables.length === 0 && assets.length === 0;

  const defaultForecastItem = useMemo(
    () => pickBestForecastItem(consumables, dispenseLogs),
    [consumables, dispenseLogs],
  );

  const buildForecast = useCallback(
    (itemName) => buildInventoryForecast(consumables, dispenseLogs, itemName),
    [consumables, dispenseLogs],
  );

  return {
    defaultForecastItem,
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
    refetch: fetchAllData,
    buildForecast,
  };
}
