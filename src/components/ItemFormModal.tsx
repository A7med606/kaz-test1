import React, { useState, useEffect } from 'react';
import { InventoryItem, INVENTORY_CATEGORIES } from '../types';
import { calculateStatus } from '../data/initialData';
import { X, Barcode, Save, Sparkles, AlertTriangle, Calendar, Layers, MapPin } from 'lucide-react';

interface ItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Partial<InventoryItem>) => Promise<void> | void;
  initialItem?: InventoryItem | null;
  onOpenScanner?: () => void;
  isSaving?: boolean;
}

export const ItemFormModal: React.FC<ItemFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialItem,
  onOpenScanner,
  isSaving = false,
}) => {
  const [barcode, setBarcode] = useState('');
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState<string>(INVENTORY_CATEGORIES[0]);
  const [warehouseQty, setWarehouseQty] = useState<number>(10);
  const [shopQty, setShopQty] = useState<number>(5);
  const [productionDate, setProductionDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (initialItem) {
      setBarcode(initialItem.barcode || '');
      setItemName(initialItem.itemName || '');
      setCategory(initialItem.category || INVENTORY_CATEGORIES[0]);
      setWarehouseQty(initialItem.warehouseQty ?? 0);
      setShopQty(initialItem.shopQty ?? 0);
      setProductionDate(initialItem.productionDate || '');
      setExpiryDate(initialItem.expiryDate || '');
      setNotes(initialItem.notes || '');
    } else {
      // Default new item values
      setBarcode('');
      setItemName('');
      setCategory(INVENTORY_CATEGORIES[0]);
      setWarehouseQty(20);
      setShopQty(5);
      const today = new Date();
      setProductionDate(today.toISOString().split('T')[0]);
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      setExpiryDate(nextYear.toISOString().split('T')[0]);
      setNotes('');
    }
    setValidationError(null);
  }, [initialItem, isOpen]);

  // Preview status dynamically
  const previewStatus = calculateStatus(expiryDate, shopQty);

  const generateRandomBarcode = () => {
    const random12 = '622' + Math.floor(1000000000 + Math.random() * 9000000000).toString().substring(0, 9);
    // Simple 13th check digit
    setBarcode(random12 + '1');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim()) {
      setValidationError('يرجى إدخال رقم الباركود');
      return;
    }
    if (!itemName.trim()) {
      setValidationError('يرجى إدخال اسم المنتج');
      return;
    }

    const updatedItemData: Partial<InventoryItem> = {
      ...(initialItem ? { id: initialItem.id, rowIndex: initialItem.rowIndex } : {}),
      barcode: barcode.trim(),
      itemName: itemName.trim(),
      category,
      warehouseQty: Math.max(0, Number(warehouseQty) || 0),
      shopQty: Math.max(0, Number(shopQty) || 0),
      productionDate,
      expiryDate,
      status: previewStatus.status,
      statusText: previewStatus.statusText,
      notes: notes.trim(),
    };

    try {
      await onSave(updatedItemData);
      onClose();
    } catch (err: unknown) {
      setValidationError(err instanceof Error ? err.message : 'حدث خطأ أثناء حفظ الصنف');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="item-form-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/75 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150"
    >
      <div
        id="item-form-modal-content"
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-6 text-stone-800"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50/80">
          <div>
            <h3 className="text-lg font-bold text-stone-900">
              {initialItem ? 'تعديل بيانات الصنف في المخزون' : 'إضافة منتج جديد للمخزن'}
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              متوافق مع أعمدة Google Sheets الثمانية وتطبيق AppSheet
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {validationError && (
            <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Barcode & Auto Generator */}
          <div>
            <label htmlFor="item-barcode" className="block text-xs font-semibold text-stone-700 mb-1">
              رقم الباركود (Barcode) <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Barcode className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="item-barcode"
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="مثال: 6281007010115"
                  className="w-full pr-9 pl-3 py-2 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
                  required
                />
              </div>
              {onOpenScanner && (
                <button
                  type="button"
                  onClick={onOpenScanner}
                  className="px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-medium hover:bg-emerald-100 flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <Barcode className="w-4 h-4" />
                  <span>مسح بالكاميرا</span>
                </button>
              )}
              <button
                type="button"
                onClick={generateRandomBarcode}
                title="توليد رقم باركود عشوائي تلقائي"
                className="px-2.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl text-xs transition-colors shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Item Name */}
          <div>
            <label htmlFor="item-name" className="block text-xs font-semibold text-stone-700 mb-1">
              اسم المنتج (Item Name) <span className="text-red-500">*</span>
            </label>
            <input
              id="item-name"
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="مثال: جبنة لافاش كيري 16 قطعة"
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              required
            />
          </div>

          {/* Category */}
          <div>
            <label htmlFor="item-category" className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-stone-400" />
              <span>الصنف / القسم (Category)</span>
            </label>
            <select
              id="item-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
            >
              {INVENTORY_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Quantities: Warehouse & Shop Floor */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200/80">
            <div>
              <label htmlFor="item-warehouse-qty" className="block text-xs font-semibold text-stone-700 mb-1">
                الكمية بالمخزن (Warehouse)
              </label>
              <input
                id="item-warehouse-qty"
                type="number"
                min="0"
                value={warehouseQty}
                onChange={(e) => setWarehouseQty(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-1.5 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
              />
              <span className="text-[10px] text-stone-400 mt-0.5 block">الكراتين والمخزون الاحتياطي</span>
            </div>

            <div>
              <label htmlFor="item-shop-qty" className="block text-xs font-semibold text-stone-700 mb-1">
                الكمية بالصالة (Shop Shelf)
              </label>
              <input
                id="item-shop-qty"
                type="number"
                min="0"
                value={shopQty}
                onChange={(e) => setShopQty(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-1.5 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
              />
              <span className="text-[10px] text-stone-400 mt-0.5 block">المعروض على الأرفف والثلاجات</span>
            </div>
          </div>

          {/* Dates: Production & Expiry */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="item-prod-date" className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-stone-400" />
                <span>تاريخ الإنتاج (Production Date)</span>
              </label>
              <input
                id="item-prod-date"
                type="date"
                value={productionDate}
                onChange={(e) => setProductionDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label htmlFor="item-exp-date" className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-stone-400" />
                <span>تاريخ الانتهاء (Expiry Date)</span>
              </label>
              <input
                id="item-exp-date"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Calculated Alert / Status Preview */}
          <div className="p-2.5 rounded-xl border border-stone-200 bg-stone-50 flex items-center justify-between text-xs">
            <span className="text-stone-500 font-medium">حالة الصنف المحسوبة:</span>
            <span
              className={`px-2.5 py-1 rounded-full font-semibold ${
                previewStatus.status === 'expired'
                  ? 'bg-red-100 text-red-700 border border-red-300'
                  : previewStatus.status === 'expiring_soon'
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : previewStatus.status === 'low_stock'
                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}
            >
              {previewStatus.statusText}
            </span>
          </div>

          {/* Shelf Location / Notes */}
          <div>
            <label htmlFor="item-notes" className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-stone-400" />
              <span>مكان الرف / ملاحظات التخزين</span>
            </label>
            <input
              id="item-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: الرف الثاني، ثلاجة اللحوم، ستاند العروض 4"
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'جاري الحفظ والمزامنة...' : initialItem ? 'حفظ التعديلات' : 'إضافة الصنف'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
