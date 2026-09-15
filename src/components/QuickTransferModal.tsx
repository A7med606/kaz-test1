import React, { useState } from 'react';
import { InventoryItem } from '../types';
import { ArrowLeftRight, X, Check, Store, Warehouse, Plus, Minus } from 'lucide-react';

interface QuickTransferModalProps {
  item: InventoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateQuantities: (item: InventoryItem, newWarehouseQty: number, newShopQty: number) => Promise<void> | void;
  isSaving?: boolean;
}

export const QuickTransferModal: React.FC<QuickTransferModalProps> = ({
  item,
  isOpen,
  onClose,
  onUpdateQuantities,
  isSaving = false,
}) => {
  const [transferAmount, setTransferAmount] = useState<number>(1);
  const [currentWarehouse, setCurrentWarehouse] = useState<number>(item?.warehouseQty || 0);
  const [currentShop, setCurrentShop] = useState<number>(item?.shopQty || 0);

  React.useEffect(() => {
    if (item) {
      setCurrentWarehouse(item.warehouseQty);
      setCurrentShop(item.shopQty);
      setTransferAmount(Math.min(5, Math.max(1, item.warehouseQty)));
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleTransferToShop = (amount: number) => {
    const actualAmount = Math.min(amount, currentWarehouse);
    if (actualAmount <= 0) return;
    setCurrentWarehouse((prev) => prev - actualAmount);
    setCurrentShop((prev) => prev + actualAmount);
  };

  const handleReturnToWarehouse = (amount: number) => {
    const actualAmount = Math.min(amount, currentShop);
    if (actualAmount <= 0) return;
    setCurrentShop((prev) => prev - actualAmount);
    setCurrentWarehouse((prev) => prev + actualAmount);
  };

  const handleSave = async () => {
    await onUpdateQuantities(item, currentWarehouse, currentShop);
    onClose();
  };

  return (
    <div
      id="quick-transfer-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/75 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        id="quick-transfer-modal-content"
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden text-stone-800"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 bg-stone-50/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">تعديل ونقل الكميات</h3>
              <p className="text-xs text-stone-500 truncate max-w-[220px]">{item.itemName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Stock Display */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs text-stone-500 mb-1">
                <Warehouse className="w-3.5 h-3.5 text-stone-600" />
                <span>الكمية بالمخزن</span>
              </div>
              <div className="text-2xl font-bold text-stone-800 font-mono">{currentWarehouse}</div>
              <div className="flex items-center justify-center gap-1 mt-2">
                <button
                  type="button"
                  onClick={() => setCurrentWarehouse((w) => Math.max(0, w - 1))}
                  className="w-7 h-7 bg-white hover:bg-stone-100 border border-stone-200 rounded-md flex items-center justify-center text-xs"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentWarehouse((w) => w + 1)}
                  className="w-7 h-7 bg-white hover:bg-stone-100 border border-stone-200 rounded-md flex items-center justify-center text-xs"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-700 mb-1">
                <Store className="w-3.5 h-3.5 text-emerald-600" />
                <span>الكمية بالصالة</span>
              </div>
              <div className="text-2xl font-bold text-emerald-900 font-mono">{currentShop}</div>
              <div className="flex items-center justify-center gap-1 mt-2">
                <button
                  type="button"
                  onClick={() => setCurrentShop((s) => Math.max(0, s - 1))}
                  className="w-7 h-7 bg-white hover:bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md flex items-center justify-center text-xs"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentShop((s) => s + 1)}
                  className="w-7 h-7 bg-white hover:bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md flex items-center justify-center text-xs"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Transfer Actions */}
          <div className="pt-2 border-t border-stone-100">
            <span className="block text-xs font-semibold text-stone-700 mb-2">
              تزويد الصالة من المخزن سريعاً (إعادة ترتيب الأرفف):
            </span>
            <div className="grid grid-cols-4 gap-2">
              {[1, 5, 10, 20].map((qty) => (
                <button
                  key={qty}
                  type="button"
                  disabled={currentWarehouse < qty}
                  onClick={() => handleTransferToShop(qty)}
                  className="py-2 text-xs bg-stone-100 hover:bg-emerald-100 hover:text-emerald-800 hover:border-emerald-300 border border-stone-200 rounded-lg font-medium transition-colors disabled:opacity-35 disabled:pointer-events-none"
                >
                  +{qty} للصالة
                </button>
              ))}
            </div>
          </div>

          {/* Barcode & Info */}
          <div className="text-xs text-stone-500 bg-stone-50 p-2.5 rounded-lg flex items-center justify-between">
            <span>الباركود: <span className="font-mono text-stone-700">{item.barcode}</span></span>
            <span>القسم: <span className="text-stone-700">{item.category}</span></span>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-800 rounded-xl"
            >
              إلغاء
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'جاري التحديث...' : 'تأكيد التعديل وتحديث الشيت'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
