import React, { useState, useEffect, useMemo, useRef } from 'react';
import { InventoryItem, SheetConfig, GoogleAuthUser, FilterStatus, INVENTORY_CATEGORIES } from './types';
import { INITIAL_INVENTORY, calculateStatus } from './data/initialData';
import {
  initializeTokenClient,
  loadSheetItems,
  updateSheetItemRow,
  appendSheetItem,
} from './services/sheetsService';
import { InventoryStats } from './components/InventoryStats';
import { InventoryItemCard } from './components/InventoryItemCard';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { ItemFormModal } from './components/ItemFormModal';
import { QuickTransferModal } from './components/QuickTransferModal';
import { SheetsConnectModal } from './components/SheetsConnectModal';
import {
  Barcode,
  Search,
  Plus,
  FileSpreadsheet,
  RefreshCw,
  SlidersHorizontal,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Package,
  Layers,
  Sparkles,
  Download,
} from 'lucide-react';
import confetti from 'canvas-confetti';

const LOCAL_STORAGE_KEY = 'supermarket_inventory_items_v1';
const LOCAL_STORAGE_SHEET_KEY = 'supermarket_sheet_config_v1';
const LOCAL_STORAGE_USER_KEY = 'supermarket_google_user_v1';

export default function App() {
  // Items state
  const [items, setItems] = useState<InventoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse saved items', e);
    }
    return INITIAL_INVENTORY;
  });

  // Sheet config state
  const [sheetConfig, setSheetConfig] = useState<SheetConfig | null>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_SHEET_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse sheet config', e);
    }
    return null;
  });

  // Google user state
  const [googleUser, setGoogleUser] = useState<GoogleAuthUser | null>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
      if (saved) {
        const parsed: GoogleAuthUser = JSON.parse(saved);
        if (parsed.expiresAt && parsed.expiresAt > Date.now()) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse google user', e);
    }
    return null;
  });

  // Filters and UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<'expiry' | 'name' | 'shopQty' | 'warehouseQty'>('expiry');

  // Modals state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isItemFormOpen, setIsItemFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferringItem, setTransferringItem] = useState<InventoryItem | null>(null);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);

  // Syncing & notification states
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [highlightedBarcode, setHighlightedBarcode] = useState<string | null>(null);

  const toastTimerRef = useRef<number | null>(null);

  // Save items to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Failed to save items to localStorage', e);
    }
  }, [items]);

  // Save sheetConfig to localStorage
  useEffect(() => {
    if (sheetConfig) {
      localStorage.setItem(LOCAL_STORAGE_SHEET_KEY, JSON.stringify(sheetConfig));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_SHEET_KEY);
    }
  }, [sheetConfig]);

  // Save googleUser to localStorage
  useEffect(() => {
    if (googleUser) {
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(googleUser));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    }
  }, [googleUser]);

  // Initialize Google Token Client on mount
  useEffect(() => {
    initializeTokenClient(
      (user) => {
        setGoogleUser(user);
        showToast(`مرحباً ${user.name}! تم الربط بحسابك`, 'success');
      },
      (err) => {
        console.warn('Google client init error', err);
      }
    );
  }, []);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage({ text, type });
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Synchronize with Google Sheet
  const handleSyncFromSheet = async () => {
    if (!sheetConfig || !googleUser?.accessToken) {
      setIsSheetsModalOpen(true);
      return;
    }

    setIsSyncing(true);
    try {
      const { items: fetchedItems, sheetTitle } = await loadSheetItems(
        googleUser.accessToken,
        sheetConfig.spreadsheetId,
        sheetConfig.sheetName
      );

      if (fetchedItems.length > 0) {
        setItems(fetchedItems);
        setSheetConfig((prev) =>
          prev
            ? {
                ...prev,
                sheetName: sheetTitle,
                lastSyncedAt: new Date().toLocaleTimeString('ar-EG'),
              }
            : null
        );
        showToast(`تمت المزامنة بنجاح! تم جلب ${fetchedItems.length} صنف من Google Sheets.`, 'success');
      } else {
        showToast('الجدول فارغ، تم الإبقاء على الأصناف المحلية.', 'info');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'فشلت المزامنة';
      showToast(msg, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle barcode scanned from camera or quick test
  const handleBarcodeScanned = (scannedCode: string) => {
    setSearchQuery(scannedCode);
    setHighlightedBarcode(scannedCode);

    const found = items.find((i) => i.barcode.trim() === scannedCode.trim());
    if (found) {
      showToast(`تم العثور على الصنف: ${found.itemName}`, 'success');
      // Scroll to card
      setTimeout(() => {
        const el = document.getElementById(`inventory-card-${found.id}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 200);
    } else {
      // Prompt to add new item with this barcode
      showToast(`باركود جديد غير مسجل (${scannedCode}). فتح شاشة الإضافة...`, 'info');
      setEditingItem({
        id: `new-${Date.now()}`,
        barcode: scannedCode,
        itemName: '',
        category: INVENTORY_CATEGORIES[0],
        warehouseQty: 10,
        shopQty: 5,
        productionDate: new Date().toISOString().split('T')[0],
        expiryDate: new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().split('T')[0],
        status: 'valid',
      });
      setIsItemFormOpen(true);
    }

    // Reset highlight glow after 4 seconds
    setTimeout(() => {
      setHighlightedBarcode(null);
    }, 4000);
  };

  // Save new or edited item
  const handleSaveItem = async (itemData: Partial<InventoryItem>) => {
    let targetItem: InventoryItem;

    if (itemData.id && items.some((i) => i.id === itemData.id)) {
      // Update existing item
      const updatedList = items.map((item) => {
        if (item.id === itemData.id) {
          targetItem = {
            ...item,
            ...itemData,
            ...calculateStatus(itemData.expiryDate || item.expiryDate, itemData.shopQty ?? item.shopQty),
          } as InventoryItem;
          return targetItem;
        }
        return item;
      });
      setItems(updatedList);
      showToast('تم تحديث بيانات الصنف بنجاح', 'success');

      // Sync to Google Sheet if connected and has rowIndex
      if (sheetConfig && googleUser?.accessToken && targetItem!.rowIndex) {
        try {
          await updateSheetItemRow(
            googleUser.accessToken,
            sheetConfig.spreadsheetId,
            targetItem!,
            sheetConfig.sheetName
          );
          showToast('تم تحديث الصنف في Google Sheets لحظياً!', 'success');
        } catch (err) {
          console.warn('Sheet sync update error', err);
        }
      }
    } else {
      // Add new item
      const newItemId = `item-${Date.now()}`;
      const calc = calculateStatus(itemData.expiryDate || '', itemData.shopQty || 0);
      const newItem: InventoryItem = {
        id: newItemId,
        barcode: itemData.barcode || '',
        itemName: itemData.itemName || '',
        category: itemData.category || INVENTORY_CATEGORIES[0],
        warehouseQty: itemData.warehouseQty || 0,
        shopQty: itemData.shopQty || 0,
        productionDate: itemData.productionDate || '',
        expiryDate: itemData.expiryDate || '',
        status: calc.status,
        statusText: calc.statusText,
        notes: itemData.notes || '',
        rowIndex: items.length + 2,
      };

      setItems((prev) => [newItem, ...prev]);
      showToast('تمت إضافة المنتج الجديد إلى المخزون', 'success');

      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.8 },
      });

      // Append to Google Sheet if connected
      if (sheetConfig && googleUser?.accessToken) {
        try {
          const newRowIndex = await appendSheetItem(
            googleUser.accessToken,
            sheetConfig.spreadsheetId,
            newItem,
            sheetConfig.sheetName
          );
          if (newRowIndex) {
            newItem.rowIndex = newRowIndex;
          }
          showToast('تمت إضافة الصنف في Google Sheets بنجاح!', 'success');
        } catch (err) {
          console.warn('Sheet append error', err);
        }
      }
    }
  };

  // Quick adjust Shop Qty (+1 / -1)
  const handleQuickAdjustShopQty = async (item: InventoryItem, delta: number) => {
    const newShopQty = Math.max(0, item.shopQty + delta);
    const { status, statusText } = calculateStatus(item.expiryDate, newShopQty);

    const updatedItem: InventoryItem = {
      ...item,
      shopQty: newShopQty,
      status,
      statusText,
    };

    setItems((prev) => prev.map((i) => (i.id === item.id ? updatedItem : i)));

    // Sync to Google Sheet
    if (sheetConfig && googleUser?.accessToken && item.rowIndex) {
      try {
        await updateSheetItemRow(
          googleUser.accessToken,
          sheetConfig.spreadsheetId,
          updatedItem,
          sheetConfig.sheetName
        );
      } catch (e) {
        console.warn('Failed to sync shop qty adjustment', e);
      }
    }
  };

  // Quick Transfer between Warehouse and Shop floor
  const handleUpdateQuantities = async (
    item: InventoryItem,
    newWarehouseQty: number,
    newShopQty: number
  ) => {
    const { status, statusText } = calculateStatus(item.expiryDate, newShopQty);
    const updatedItem: InventoryItem = {
      ...item,
      warehouseQty: newWarehouseQty,
      shopQty: newShopQty,
      status,
      statusText,
    };

    setItems((prev) => prev.map((i) => (i.id === item.id ? updatedItem : i)));
    showToast(`تم تحديث كميات ${item.itemName} بنجاح`, 'success');

    if (sheetConfig && googleUser?.accessToken && item.rowIndex) {
      try {
        await updateSheetItemRow(
          googleUser.accessToken,
          sheetConfig.spreadsheetId,
          updatedItem,
          sheetConfig.sheetName
        );
        showToast('تم التحديث في Google Sheets لحظياً', 'success');
      } catch (e) {
        console.warn('Failed to sync transfer to sheet', e);
      }
    }
  };

  // Delete item
  const handleDeleteItem = (item: InventoryItem) => {
    if (window.confirm(`هل أنت متأكد من حذف "${item.itemName}" من قائمة المخزون؟`)) {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      showToast(`تم حذف الصنف ${item.itemName}`, 'info');
    }
  };

  // Reset to initial sample data
  const handleResetData = () => {
    if (window.confirm('هل تريد استعادة بيانات السوبرماركت التجريبية الأصلية؟')) {
      setItems(INITIAL_INVENTORY);
      showToast('تمت استعادة البيانات التجريبية', 'info');
    }
  };

  // Export inventory to CSV
  const handleExportCSV = () => {
    const headers = [
      'رقم الباركود',
      'اسم المنتج',
      'الصنف / القسم',
      'الكمية بالمخزن',
      'الكمية بالصالة',
      'تاريخ الإنتاج',
      'تاريخ انتهاء الصلاحية',
      'التنبيهات والحالة',
    ];

    const rows = items.map((i) => [
      `"${i.barcode}"`,
      `"${i.itemName}"`,
      `"${i.category}"`,
      i.warehouseQty,
      i.shopQty,
      `"${i.productionDate}"`,
      `"${i.expiryDate}"`,
      `"${i.statusText || ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `جرد_مخزون_السوبرماركت_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('تم تصدير ملف CSV بنجاح', 'success');
  };

  // Filtered and Sorted items
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        // Status filter
        if (statusFilter !== 'all' && item.status !== statusFilter) {
          return false;
        }
        // Category filter
        if (selectedCategory !== 'all' && item.category !== selectedCategory) {
          return false;
        }
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = item.itemName.toLowerCase().includes(q);
          const matchBarcode = item.barcode.includes(q);
          const matchCategory = item.category.toLowerCase().includes(q);
          const matchNotes = item.notes?.toLowerCase().includes(q);
          return matchName || matchBarcode || matchCategory || matchNotes;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'expiry') {
          if (!a.expiryDate) return 1;
          if (!b.expiryDate) return -1;
          return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
        }
        if (sortBy === 'shopQty') return a.shopQty - b.shopQty;
        if (sortBy === 'warehouseQty') return a.warehouseQty - b.warehouseQty;
        if (sortBy === 'name') return a.itemName.localeCompare(b.itemName, 'ar');
        return 0;
      });
  }, [items, statusFilter, selectedCategory, searchQuery, sortBy]);

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 flex flex-col font-['Cairo',sans-serif]">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          {/* Logo & Supermarket Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <Barcode className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold text-stone-900 tracking-tight">
                  إدارة مخزون السوبرماركت
                </h1>
                <span className="hidden sm:inline-flex text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                  متوافق مع AppSheet
                </span>
              </div>
              <p className="text-[11px] text-stone-500 hidden sm:block">
                مزامنة حية مع Google Sheets • مسح باركود وتنبيهات صلاحية فورية
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Google Sheets Status button */}
            <button
              type="button"
              onClick={() => setIsSheetsModalOpen(true)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border shadow-2xs ${
                sheetConfig
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-white hover:bg-stone-50 text-stone-700 border-stone-300'
              }`}
            >
              <FileSpreadsheet className={`w-4 h-4 ${sheetConfig ? 'text-emerald-600' : 'text-stone-500'}`} />
              <span className="hidden md:inline">
                {sheetConfig ? sheetConfig.spreadsheetName : 'ربط مع Google Sheets'}
              </span>
              <span className="md:hidden">شيت جوجل</span>
              {sheetConfig && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
            </button>

            {/* Sync Now button if connected */}
            {sheetConfig && (
              <button
                type="button"
                onClick={handleSyncFromSheet}
                disabled={isSyncing}
                title="تحديث البيانات من Google Sheets الآن"
                className="p-2 text-stone-500 hover:text-emerald-700 hover:bg-stone-100 rounded-xl transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-emerald-600' : ''}`} />
              </button>
            )}

            {/* Live Camera Scanner Button */}
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="px-3.5 py-1.5 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all hover:shadow"
            >
              <Barcode className="w-4 h-4 text-emerald-400" />
              <span>مسح الباركود</span>
            </button>

            {/* Add Item Button */}
            <button
              type="button"
              onClick={() => {
                setEditingItem(null);
                setIsItemFormOpen(true);
              }}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all hover:shadow"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">إضافة صنف</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
        {/* Toast Alert Notification */}
        {toastMessage && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center justify-between shadow-md animate-in slide-in-from-top duration-200 ${
              toastMessage.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-700'
                : toastMessage.type === 'error'
                ? 'bg-red-600 text-white border-red-700'
                : 'bg-stone-800 text-white border-stone-900'
            }`}
          >
            <div className="flex items-center gap-2">
              {toastMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-200" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-300" />
              )}
              <span className="font-medium">{toastMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="p-1 hover:bg-black/20 rounded-lg text-white/80"
            >
              ✕
            </button>
          </div>
        )}

        {/* Google Sheet Connection Banner when active */}
        {sheetConfig && (
          <div className="bg-emerald-950 text-emerald-100 px-4 py-2.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs border border-emerald-800/60">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span>
                مرتبط بـ Google Sheet: <strong className="text-white font-semibold">{sheetConfig.spreadsheetName}</strong>
              </span>
              {sheetConfig.lastSyncedAt && (
                <span className="text-emerald-300/80 text-[11px]">
                  (آخر مزامنة: {sheetConfig.lastSyncedAt})
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <a
                href={sheetConfig.spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-700 text-emerald-100 rounded-lg flex items-center gap-1 font-medium transition-colors"
              >
                <span>فتح الملف في Google Sheets</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <button
                type="button"
                onClick={() => setIsSheetsModalOpen(true)}
                className="px-2.5 py-1 bg-emerald-900 hover:bg-emerald-800 text-emerald-200 rounded-lg font-medium transition-colors"
              >
                إعدادات الربط
              </button>
            </div>
          </div>
        )}

        {/* Inventory High-Level Metric Cards */}
        <InventoryStats
          items={items}
          currentStatusFilter={statusFilter}
          onSelectStatusFilter={setStatusFilter}
        />

        {/* Search & Filter Toolbar */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Search Bar with Camera button inside */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث باسم المنتج، رقم الباركود، أو القسم..."
                className="w-full pr-10 pl-24 py-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder:text-stone-400"
              />
              <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-1 text-stone-400 hover:text-stone-600 text-xs rounded"
                  >
                    مسح
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  title="مسح بالكاميرا"
                  className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors"
                >
                  <Barcode className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 text-xs text-stone-600">
                <SlidersHorizontal className="w-3.5 h-3.5 text-stone-400" />
                <span className="text-[11px] font-medium">ترتيب:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="bg-transparent border-none text-xs text-stone-800 font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="expiry">الأقرب انتهاءً</option>
                  <option value="shopQty">الأقل كمية بالصالة</option>
                  <option value="warehouseQty">الأقل بالمخزن</option>
                  <option value="name">اسم المنتج (أ-ي)</option>
                </select>
              </div>

              {/* Export CSV */}
              <button
                type="button"
                onClick={handleExportCSV}
                title="تصدير شيت إكسيل CSV"
                className="p-2 text-stone-600 hover:text-emerald-700 hover:bg-stone-100 border border-stone-200 rounded-xl transition-colors"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Category Chips Scrollbar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all ${
                selectedCategory === 'all'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              جميع الأقسام ({items.length})
            </button>
            {INVENTORY_CATEGORIES.map((cat) => {
              const count = items.filter((i) => i.category === cat).length;
              if (count === 0 && selectedCategory !== cat) return null;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-emerald-700 text-white shadow-xs font-semibold'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                  }`}
                >
                  <span>{cat}</span>
                  <span className="mr-1 text-[11px] opacity-75">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Filters Display */}
        {(statusFilter !== 'all' || selectedCategory !== 'all' || searchQuery) && (
          <div className="flex items-center justify-between text-xs text-stone-600 bg-stone-200/60 px-4 py-2 rounded-xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span>الفلاتر النشطة:</span>
              {statusFilter !== 'all' && (
                <span className="px-2 py-0.5 rounded-md bg-stone-900 text-white text-[11px]">
                  الحالة: {statusFilter === 'expired' ? 'منتهي الصلاحية' : statusFilter === 'expiring_soon' ? 'قريب الانتهاء' : statusFilter === 'low_stock' ? 'نقص الصالة' : 'سليم'}
                </span>
              )}
              {selectedCategory !== 'all' && (
                <span className="px-2 py-0.5 rounded-md bg-stone-900 text-white text-[11px]">
                  القسم: {selectedCategory}
                </span>
              )}
              {searchQuery && (
                <span className="px-2 py-0.5 rounded-md bg-stone-900 text-white text-[11px]">
                  بحث: "{searchQuery}"
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('all');
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="text-emerald-700 hover:underline font-semibold"
            >
              إلغاء جميع الفلاتر
            </button>
          </div>
        )}

        {/* Items Grid */}
        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredItems.map((item) => (
              <InventoryItemCard
                key={item.id}
                item={item}
                isHighlighted={item.barcode === highlightedBarcode}
                onEdit={(it) => {
                  setEditingItem(it);
                  setIsItemFormOpen(true);
                }}
                onQuickTransfer={(it) => {
                  setTransferringItem(it);
                  setIsTransferOpen(true);
                }}
                onQuickAdjustShopQty={handleQuickAdjustShopQty}
                onDelete={handleDeleteItem}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
              <Package className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-stone-800">لا توجد أصناف تطابق هذا البحث</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
              جرّب تغيير كلمات البحث أو إلغاء فلتر الصلاحية، أو أضف هذا الصنف الجديد إلى جدول المخزون.
            </p>
            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setSelectedCategory('all');
                }}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-xs font-semibold text-stone-700 rounded-xl transition-colors"
              >
                عرض كل الأصناف
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingItem(searchQuery ? {
                    id: `new-${Date.now()}`,
                    barcode: searchQuery,
                    itemName: '',
                    category: INVENTORY_CATEGORIES[0],
                    warehouseQty: 10,
                    shopQty: 5,
                    productionDate: new Date().toISOString().split('T')[0],
                    expiryDate: new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().split('T')[0],
                    status: 'valid',
                  } : null);
                  setIsItemFormOpen(true);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة صنف جديد</span>
              </button>
            </div>
          </div>
        )}

        {/* Quick AppSheet Instructions Footer Card */}
        <div className="bg-gradient-to-r from-emerald-900 to-stone-900 text-white p-5 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-sm">التكامل مع Google Sheets & AppSheet</h3>
            </div>
            <button
              type="button"
              onClick={() => setIsSheetsModalOpen(true)}
              className="text-xs font-semibold px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
            >
              فتح دليل الربط السحابي
            </button>
          </div>
          <p className="text-xs text-emerald-100/80 leading-relaxed max-w-3xl">
            كل تعديل في الكميات وتواريخ الصلاحية ينعكس مباشرة على الأعمدة الثمانية في ملف <strong>Google Sheets</strong> الخاص بك، مما يتيح لك فتح التطبيق عبر متصفح الويب أو من تطبيق <strong>AppSheet</strong> الميداني أمام الأرفف في ممرات السوبرماركت.
          </p>
          <div className="flex items-center gap-4 text-[11px] text-stone-300 pt-1 border-t border-white/10">
            <button
              type="button"
              onClick={handleResetData}
              className="hover:text-emerald-300 transition-colors underline"
            >
              استعادة البيانات التجريبية
            </button>
            <span>•</span>
            <span>النسخة 1.0 • جرد ومخزون الأرفف</span>
          </div>
        </div>
      </main>

      {/* Modals */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScanned}
        sampleBarcodes={items.map((i) => ({ barcode: i.barcode, name: i.itemName }))}
      />

      <ItemFormModal
        isOpen={isItemFormOpen}
        onClose={() => {
          setIsItemFormOpen(false);
          setEditingItem(null);
        }}
        initialItem={editingItem}
        onSave={handleSaveItem}
        onOpenScanner={() => {
          setIsItemFormOpen(false);
          setIsScannerOpen(true);
        }}
      />

      <QuickTransferModal
        item={transferringItem}
        isOpen={isTransferOpen}
        onClose={() => {
          setIsTransferOpen(false);
          setTransferringItem(null);
        }}
        onUpdateQuantities={handleUpdateQuantities}
      />

      <SheetsConnectModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
        user={googleUser}
        onUserAuth={(user) => setGoogleUser(user)}
        sheetConfig={sheetConfig}
        onSelectSheet={(config, sheetItems) => {
          setSheetConfig(config);
          if (sheetItems && sheetItems.length > 0) {
            setItems(sheetItems);
          }
          showToast(`تم ربط ${config.spreadsheetName} بنجاح!`, 'success');
        }}
        currentLocalItems={items}
      />
    </div>
  );
}
