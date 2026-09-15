import React from 'react';
import { InventoryItem, FilterStatus } from '../types';
import { Package, Store, Warehouse, AlertOctagon, Clock, AlertTriangle } from 'lucide-react';

interface InventoryStatsProps {
  items: InventoryItem[];
  currentStatusFilter: FilterStatus;
  onSelectStatusFilter: (status: FilterStatus) => void;
}

export const InventoryStats: React.FC<InventoryStatsProps> = ({
  items,
  currentStatusFilter,
  onSelectStatusFilter,
}) => {
  const totalItems = items.length;
  const totalShopQty = items.reduce((acc, curr) => acc + curr.shopQty, 0);
  const totalWarehouseQty = items.reduce((acc, curr) => acc + curr.warehouseQty, 0);

  const expiredCount = items.filter((i) => i.status === 'expired').length;
  const expiringSoonCount = items.filter((i) => i.status === 'expiring_soon').length;
  const lowStockCount = items.filter((i) => i.status === 'low_stock').length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
      {/* Total Items */}
      <button
        type="button"
        onClick={() => onSelectStatusFilter('all')}
        className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between ${
          currentStatusFilter === 'all'
            ? 'bg-stone-900 text-white border-stone-900 shadow-md ring-2 ring-emerald-500/30'
            : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-800'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold opacity-75">إجمالي الأصناف</span>
          <Package className="w-4 h-4 opacity-70" />
        </div>
        <div className="text-xl font-bold font-mono mt-1.5">{totalItems}</div>
      </button>

      {/* Shop Floor Qty */}
      <div className="p-3 rounded-2xl bg-white border border-stone-200 text-right flex flex-col justify-between">
        <div className="flex items-center justify-between text-stone-500">
          <span className="text-[11px] font-semibold">المعروض بالصالة</span>
          <Store className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="text-xl font-bold text-emerald-700 font-mono mt-1.5">{totalShopQty}</div>
      </div>

      {/* Warehouse Qty */}
      <div className="p-3 rounded-2xl bg-white border border-stone-200 text-right flex flex-col justify-between">
        <div className="flex items-center justify-between text-stone-500">
          <span className="text-[11px] font-semibold">بالمستودع</span>
          <Warehouse className="w-4 h-4 text-stone-600" />
        </div>
        <div className="text-xl font-bold text-stone-800 font-mono mt-1.5">{totalWarehouseQty}</div>
      </div>

      {/* Expired Alerts (Critical Red) */}
      <button
        type="button"
        onClick={() => onSelectStatusFilter(currentStatusFilter === 'expired' ? 'all' : 'expired')}
        className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between ${
          currentStatusFilter === 'expired'
            ? 'bg-red-600 text-white border-red-600 shadow-md ring-2 ring-red-300'
            : expiredCount > 0
            ? 'bg-red-50/80 hover:bg-red-100 border-red-200 text-red-900'
            : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-700'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold">منتهي الصلاحية</span>
          <AlertOctagon className={`w-4 h-4 ${currentStatusFilter === 'expired' ? 'text-white' : 'text-red-600'}`} />
        </div>
        <div className="flex items-baseline justify-between mt-1.5">
          <span className="text-xl font-bold font-mono">{expiredCount}</span>
          {expiredCount > 0 && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-200/60 text-red-800">
              سحب فوري
            </span>
          )}
        </div>
      </button>

      {/* Expiring Soon (Warning Amber) */}
      <button
        type="button"
        onClick={() => onSelectStatusFilter(currentStatusFilter === 'expiring_soon' ? 'all' : 'expiring_soon')}
        className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between ${
          currentStatusFilter === 'expiring_soon'
            ? 'bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-300'
            : expiringSoonCount > 0
            ? 'bg-amber-50/80 hover:bg-amber-100 border-amber-200 text-amber-900'
            : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-700'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold">قريب الانتهاء</span>
          <Clock className={`w-4 h-4 ${currentStatusFilter === 'expiring_soon' ? 'text-white' : 'text-amber-600'}`} />
        </div>
        <div className="flex items-baseline justify-between mt-1.5">
          <span className="text-xl font-bold font-mono">{expiringSoonCount}</span>
          {expiringSoonCount > 0 && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-200/60 text-amber-800">
              عرض ترويجي
            </span>
          )}
        </div>
      </button>

      {/* Low Shelf Stock (Shop Refill Alert) */}
      <button
        type="button"
        onClick={() => onSelectStatusFilter(currentStatusFilter === 'low_stock' ? 'all' : 'low_stock')}
        className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between ${
          currentStatusFilter === 'low_stock'
            ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-300'
            : lowStockCount > 0
            ? 'bg-blue-50/80 hover:bg-blue-100 border-blue-200 text-blue-900'
            : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-700'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold">نقص بالأرفف</span>
          <AlertTriangle className={`w-4 h-4 ${currentStatusFilter === 'low_stock' ? 'text-white' : 'text-blue-600'}`} />
        </div>
        <div className="flex items-baseline justify-between mt-1.5">
          <span className="text-xl font-bold font-mono">{lowStockCount}</span>
          {lowStockCount > 0 && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-200/60 text-blue-800">
              تزويد الصالة
            </span>
          )}
        </div>
      </button>
    </div>
  );
};
