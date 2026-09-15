import React from 'react';
import { InventoryItem } from '../types';
import {
  Barcode,
  Store,
  Warehouse,
  ArrowLeftRight,
  Edit2,
  Trash2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  Plus,
  Minus,
} from 'lucide-react';

interface InventoryItemCardProps {
  item: InventoryItem;
  onEdit: (item: InventoryItem) => void;
  onQuickTransfer: (item: InventoryItem) => void;
  onQuickAdjustShopQty: (item: InventoryItem, delta: number) => void;
  onDelete: (item: InventoryItem) => void;
  isHighlighted?: boolean;
}

export const InventoryItemCard: React.FC<InventoryItemCardProps> = ({
  item,
  onEdit,
  onQuickTransfer,
  onQuickAdjustShopQty,
  onDelete,
  isHighlighted = false,
}) => {
  const getStatusBadge = () => {
    switch (item.status) {
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300">
            <AlertOctagon className="w-3 h-3 text-red-600" />
            <span>منتهي الصلاحية</span>
          </span>
        );
      case 'expiring_soon':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            <span>يوشك على الانتهاء</span>
          </span>
        );
      case 'low_stock':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300">
            <AlertTriangle className="w-3 h-3 text-blue-600" />
            <span>نقص في الصالة</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>سليم ومتاح</span>
          </span>
        );
    }
  };

  return (
    <div
      id={`inventory-card-${item.id}`}
      className={`relative bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs hover:shadow-md ${
        isHighlighted
          ? 'ring-2 ring-emerald-500 border-emerald-400 bg-emerald-50/20'
          : item.status === 'expired'
          ? 'border-red-200 hover:border-red-300'
          : item.status === 'expiring_soon'
          ? 'border-amber-200 hover:border-amber-300'
          : 'border-stone-200 hover:border-stone-300'
      }`}
    >
      {/* Top Bar: Barcode, Category & Status Badge */}
      <div className="p-4 pb-3 border-b border-stone-100 flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-stone-100 text-stone-700">
              {item.category}
            </span>
            {getStatusBadge()}
          </div>
          <h4 className="text-sm font-bold text-stone-900 leading-snug truncate pt-1">
            {item.itemName}
          </h4>
          <div className="flex items-center gap-1 text-xs text-stone-500 font-mono">
            <Barcode className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span className="font-semibold text-stone-600">{item.barcode}</span>
            {item.notes && (
              <span className="text-[11px] text-stone-400 font-sans truncate mr-2">
                • {item.notes}
              </span>
            )}
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onEdit(item)}
            title="تعديل تفاصيل الصنف"
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(item)}
            title="حذف من المخزون"
            className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stock Quantities & Dates Grid */}
      <div className="p-4 pt-3 space-y-3">
        {/* Quantities Row */}
        <div className="grid grid-cols-2 gap-2">
          {/* Shop Floor Quantity */}
          <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/80 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1 text-[11px] text-stone-500">
                <Store className="w-3 h-3 text-emerald-600" />
                <span>الرف بالصالة</span>
              </div>
              <div className="text-lg font-bold font-mono text-stone-900 mt-0.5">
                {item.shopQty} <span className="text-[10px] font-normal text-stone-500">قطعة</span>
              </div>
            </div>
            {/* Quick +/- 1 buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onQuickAdjustShopQty(item, -1)}
                disabled={item.shopQty <= 0}
                title="تقليل قطعة واحدة من الصالة"
                className="w-6 h-6 rounded bg-white hover:bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-700 disabled:opacity-30 disabled:pointer-events-none"
              >
                <Minus className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => onQuickAdjustShopQty(item, 1)}
                title="إضافة قطعة واحدة إلى الصالة"
                className="w-6 h-6 rounded bg-white hover:bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-700"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Warehouse Quantity */}
          <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/80 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1 text-[11px] text-stone-500">
                <Warehouse className="w-3 h-3 text-stone-600" />
                <span>المستودع</span>
              </div>
              <div className="text-lg font-bold font-mono text-stone-800 mt-0.5">
                {item.warehouseQty} <span className="text-[10px] font-normal text-stone-500">قطعة</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onQuickTransfer(item)}
              title="نقل وتزويد سريع من المخزن للصالة"
              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors"
            >
              <ArrowLeftRight className="w-3 h-3" />
              <span>نقل</span>
            </button>
          </div>
        </div>

        {/* Expiry Dates & Alert Text */}
        <div className="flex items-center justify-between text-[11px] pt-1 text-stone-500">
          <div className="flex items-center gap-1 font-mono">
            <Calendar className="w-3 h-3 text-stone-400" />
            <span>صلاحية:</span>
            <span className={`font-semibold ${item.status === 'expired' ? 'text-red-600' : 'text-stone-700'}`}>
              {item.expiryDate || 'غير محدد'}
            </span>
          </div>
          {item.statusText && (
            <span className="text-[11px] text-stone-600 truncate max-w-[170px]">
              {item.statusText}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
