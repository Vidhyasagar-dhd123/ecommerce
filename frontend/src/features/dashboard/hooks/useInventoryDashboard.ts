import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  fetchWarehouseInventory,
  fetchWarehouseStats,
  adjustStock,
  transferStock,
  fetchStockTransactions,
  fetchWarehouses,
  fetchVendors,
  createVendor,
  fetchImports,
  createImport,
  receiveImport,
  fetchAllVariants,
} from '../api/inventoryApi';
import type {
  WarehouseInventoryItem,
  StockAdjustPayload,
  StockTransferPayload,
  CreateVendorPayload,
  CreateImportPayload,
  InventoryTab,
} from '../model/inventoryTypes';

export function useInventoryDashboard() {
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();

  const warehouseId =
    user?.warehouseId ??
    (user as any)?.employee_profile?.warehouse_id ??
    (user as any)?.warehouse_id ??
    null;

  const [activeTab, setActiveTab] = useState<InventoryTab>('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyNeedsReorder, setOnlyNeedsReorder] = useState(false);

  // Modals state
  const [adjustTarget, setAdjustTarget] = useState<WarehouseInventoryItem | null>(null);
  const [transferTarget, setTransferTarget] = useState<WarehouseInventoryItem | null>(null);
  const [isInitiateImportOpen, setIsInitiateImportOpen] = useState(false);
  const [isCreateVendorOpen, setIsCreateVendorOpen] = useState(false);

  // 1. Warehouse Stats Query
  const statsQuery = useQuery({
    queryKey: ['inventory-stats', user?.userId, warehouseId],
    queryFn: () => fetchWarehouseStats(warehouseId),
    enabled: Boolean(warehouseId),
    refetchInterval: 15000,
  });

  // 2. Inventory Items Query
  const inventoryQuery = useQuery({
    queryKey: ['inventory-items', user?.userId, warehouseId, onlyNeedsReorder],
    queryFn: () =>
      fetchWarehouseInventory({
        warehouse_id: warehouseId ?? undefined,
        needs_reorder: onlyNeedsReorder || undefined,
      }),
    enabled: Boolean(warehouseId),
    refetchInterval: 20000,
  });

  // 3. Transactions / Audit Query
  const transactionsQuery = useQuery({
    queryKey: ['inventory-transactions', user?.userId, warehouseId],
    queryFn: () =>
      fetchStockTransactions({
        warehouse_id: warehouseId ?? undefined,
      }),
    enabled: Boolean(warehouseId),
    refetchInterval: 20000,
  });

  // 4. Warehouses Query (for inter-warehouse transfer destination choices)
  const warehousesQuery = useQuery({
    queryKey: ['all-warehouses'],
    queryFn: () => fetchWarehouses(),
    staleTime: 60000,
  });

  // 5. Vendors Query
  const vendorsQuery = useQuery({
    queryKey: ['inventory-vendors'],
    queryFn: () => fetchVendors(),
    staleTime: 60000,
  });

  // 6. Imports Query
  const importsQuery = useQuery({
    queryKey: ['inventory-imports', user?.userId, warehouseId],
    queryFn: () => fetchImports(),
    refetchInterval: 20000,
  });

  // 7. All Product Variants Query (for goods import & transfer selector)
  const variantsQuery = useQuery({
    queryKey: ['all-product-variants'],
    queryFn: () => fetchAllVariants(),
    staleTime: 60000,
  });

  // ── Mutations ─────────────────────────────────────────────

  // Stock Adjustment Mutation
  const adjustMutation = useMutation({
    mutationFn: (payload: StockAdjustPayload) => adjustStock(payload),
    onSuccess: (tx) => {
      toast.success(
        `Stock adjusted (${tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity} units for ${tx.variant_sku})`
      );
      setAdjustTarget(null);
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || err?.message || 'Stock adjustment failed');
    },
  });

  // Stock Transfer Mutation
  const transferMutation = useMutation({
    mutationFn: (payload: StockTransferPayload) => transferStock(payload),
    onSuccess: (data) => {
      toast.success(data.message || `Transferred ${data.quantity || 'items'} successfully!`);
      setTransferTarget(null);
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || err?.message || 'Transfer failed');
    },
  });

  // Receive Vendor Import Mutation
  const receiveImportMutation = useMutation({
    mutationFn: (importId: number) => receiveImport(importId),
    onSuccess: () => {
      toast.success('Goods received into warehouse stock successfully!');
      queryClient.invalidateQueries({ queryKey: ['inventory-imports'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || err?.message || 'Receiving goods failed');
    },
  });

  // Create Vendor Profile Mutation
  const createVendorMutation = useMutation({
    mutationFn: (payload: CreateVendorPayload) => createVendor(payload),
    onSuccess: (vendor) => {
      toast.success(`Supplier "${vendor.name}" registered successfully!`);
      setIsCreateVendorOpen(false);
      queryClient.invalidateQueries({ queryKey: ['inventory-vendors'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || err?.message || 'Failed to register vendor');
    },
  });

  // Initiate Goods Import Mutation (Warehouse-Initiated)
  const createImportMutation = useMutation({
    mutationFn: (payload: CreateImportPayload) => createImport(payload),
    onSuccess: (imp) => {
      toast.success(`Goods Import #${imp.id} initiated! Awaiting supplier shipment.`);
      setIsInitiateImportOpen(false);
      queryClient.invalidateQueries({ queryKey: ['inventory-imports'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || err?.message || 'Failed to initiate goods import');
    },
  });

  // Filtered inventory list by search
  const rawInventory = inventoryQuery.data ?? [];
  const filteredInventory = rawInventory.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.variant_sku.toLowerCase().includes(q) ||
      String(item.id).includes(q) ||
      item.warehouse_name.toLowerCase().includes(q)
    );
  });

  return {
    user,
    warehouseId,
    warehouseName: user?.warehouseName || 'Assigned Warehouse',
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    onlyNeedsReorder,
    setOnlyNeedsReorder,

    // Modal targets
    adjustTarget,
    setAdjustTarget,
    transferTarget,
    setTransferTarget,
    isInitiateImportOpen,
    setIsInitiateImportOpen,
    isCreateVendorOpen,
    setIsCreateVendorOpen,

    // Queries data & states
    stats: statsQuery.data,
    isLoadingStats: statsQuery.isLoading,
    inventory: filteredInventory,
    allInventoryCount: rawInventory.length,
    rawInventory,
    isLoadingInventory: inventoryQuery.isLoading,
    isRefetchingInventory: inventoryQuery.isRefetching,
    refetchInventory: inventoryQuery.refetch,

    transactions: transactionsQuery.data ?? [],
    isLoadingTransactions: transactionsQuery.isLoading,

    warehouses: warehousesQuery.data ?? [],
    vendors: vendorsQuery.data ?? [],
    imports: importsQuery.data ?? [],
    isLoadingImports: importsQuery.isLoading,
    variants: variantsQuery.data ?? [],

    // Actions
    adjustMutation,
    transferMutation,
    receiveImportMutation,
    createVendorMutation,
    createImportMutation,
    logout,
  };
}
