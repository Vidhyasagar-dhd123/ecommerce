import { useInventoryDashboard } from '../hooks/useInventoryDashboard';
import { InventoryHeader } from '../components/InventoryHeader';
import { WarehouseInventoryTab } from '../components/WarehouseInventoryTab';
import { InterWarehouseTransfersTab } from '../components/InterWarehouseTransfersTab';
import { VendorImportsTab } from '../components/VendorImportsTab';
import { StockAuditTab } from '../components/StockAuditTab';
import { StockAdjustModal } from '../components/StockAdjustModal';
import { StockTransferModal } from '../components/StockTransferModal';
import { InitiateImportModal } from '../components/InitiateImportModal';
import { CreateVendorModal } from '../components/CreateVendorModal';

export function InventoryManagerDashboardPage() {
  const {
    user,
    warehouseId,
    warehouseName,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    onlyNeedsReorder,
    setOnlyNeedsReorder,

    adjustTarget,
    setAdjustTarget,
    transferTarget,
    setTransferTarget,
    isInitiateImportOpen,
    setIsInitiateImportOpen,
    isCreateVendorOpen,
    setIsCreateVendorOpen,

    stats,
    inventory,
    allInventoryCount,
    rawInventory,
    isLoadingInventory,
    isRefetchingInventory,
    refetchInventory,

    transactions,
    isLoadingTransactions,

    warehouses,
    vendors,
    imports,
    variants,

    adjustMutation,
    transferMutation,
    receiveImportMutation,
    createVendorMutation,
    createImportMutation,
  } = useInventoryDashboard();

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* ── Top Header with KPI stats ── */}
        <InventoryHeader
          warehouseName={warehouseName}
          warehouseId={warehouseId}
          employeeCode={(user as any)?.employee_code || 'EMP-INV'}
          username={user?.username || 'Inventory Manager'}
          stats={stats}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onRefresh={refetchInventory}
          isRefreshing={isRefetchingInventory}
        />

        {/* ── TAB 1: Warehouse Inventory ── */}
        {activeTab === 'inventory' && (
          <WarehouseInventoryTab
            inventory={inventory}
            allInventoryCount={allInventoryCount}
            isLoading={isLoadingInventory}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onlyNeedsReorder={onlyNeedsReorder}
            onOnlyNeedsReorderChange={setOnlyNeedsReorder}
            onAdjust={setAdjustTarget}
            onTransfer={setTransferTarget}
          />
        )}

        {/* ── TAB 2: Inter-Warehouse Transfers ── */}
        {activeTab === 'transfers' && (
          <InterWarehouseTransfersTab
            warehouseName={warehouseName}
            transactions={transactions}
            isLoading={isLoadingTransactions}
            onInitiateTransfer={() => setTransferTarget(rawInventory[0] || null)}
          />
        )}

        {/* ── TAB 3: Vendors & Inbound Imports ── */}
        {activeTab === 'vendors' && (
          <VendorImportsTab
            imports={imports}
            vendors={vendors}
            onReceive={(importId) => receiveImportMutation.mutate(importId)}
            isReceiving={receiveImportMutation.isPending}
            onInitiateImport={() => setIsInitiateImportOpen(true)}
            onAddVendor={() => setIsCreateVendorOpen(true)}
          />
        )}

        {/* ── TAB 4: Stock Audit Log ── */}
        {activeTab === 'audit' && (
          <StockAuditTab
            transactions={transactions}
            isLoading={isLoadingTransactions}
          />
        )}

        {/* ── MODALS ── */}
        {adjustTarget && (
          <StockAdjustModal
            item={adjustTarget}
            onClose={() => setAdjustTarget(null)}
            onSubmit={(data) => adjustMutation.mutate(data)}
            isPending={adjustMutation.isPending}
          />
        )}

        {transferTarget && (
          <StockTransferModal
            sourceItem={transferTarget}
            availableStockItems={rawInventory}
            sourceWarehouseId={warehouseId}
            warehouses={warehouses}
            onClose={() => setTransferTarget(null)}
            onSubmit={(data) => transferMutation.mutate(data)}
            isPending={transferMutation.isPending}
          />
        )}

        {isInitiateImportOpen && (
          <InitiateImportModal
            warehouseId={warehouseId}
            warehouseName={warehouseName}
            vendors={vendors}
            variants={variants}
            onClose={() => setIsInitiateImportOpen(false)}
            onSubmit={(data) => createImportMutation.mutate(data)}
            isPending={createImportMutation.isPending}
          />
        )}

        {isCreateVendorOpen && (
          <CreateVendorModal
            onClose={() => setIsCreateVendorOpen(false)}
            onSubmit={(data) => createVendorMutation.mutate(data)}
            isPending={createVendorMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}
