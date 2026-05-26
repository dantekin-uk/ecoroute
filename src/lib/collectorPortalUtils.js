/** Shared helpers for collector portal (admin desktop + field mobile) */

export function formatHouseId(tenant) {
  return tenant.door_number
    ? `${tenant.block_number}-${tenant.door_number}`
    : tenant.block_number;
}

export function mapTenantsToHouses(tenants, estateId) {
  return tenants
    .filter((t) => t.estate_id === estateId)
    .map((t) => ({
      id: formatHouseId(t),
      tenantId: t.id,
      balance: Number(t.current_balance),
      name: t.tenant_name,
      rate: Number(t.monthly_rate),
    }))
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}

export function computeCollectorStats(transactions, collectorName, tenantsForEstate = []) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let collectedToday = 0;
  let cashInHand = 0;
  let logsToday = 0;

  (transactions || []).forEach((tx) => {
    if (tx.collector_name !== collectorName) return;
    if (tx.payment_method?.startsWith('Incident')) return;

    const isPending = tx.payment_method?.includes('(Pending)');
    const amount = Number(tx.amount || 0);
    const txDate = new Date(tx.created_at);
    txDate.setHours(0, 0, 0, 0);

    if (txDate.getTime() === today.getTime()) {
      logsToday += 1;
      if (!isPending) collectedToday += amount;
    }
    if (tx.payment_method?.includes('Cash') && isPending) {
      cashInHand += amount;
    }
  });

  const pendingDoors = tenantsForEstate.filter((h) => h.balance < 0).length;
  const totalDoors = tenantsForEstate.length;
  const doneDoors = totalDoors - pendingDoors;
  const routeProgress = totalDoors > 0 ? Math.round((doneDoors / totalDoors) * 100) : 0;

  return { collectedToday, cashInHand, logsToday, pendingDoors, totalDoors, doneDoors, routeProgress };
}
