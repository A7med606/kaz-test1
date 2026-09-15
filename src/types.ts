export interface InventoryItem {
  id: string;
  barcode: string; // 1. رقم الباركود
  itemName: string; // 2. اسم المنتج
  category: string; // 3. الصنف / القسم
  warehouseQty: number; // 4. الكمية بالمخزن
  shopQty: number; // 5. الكمية بالصالة
  productionDate: string; // 6. تاريخ الإنتاج (YYYY-MM-DD)
  expiryDate: string; // 7. تاريخ انتهاء الصلاحية (YYYY-MM-DD)
  status: 'valid' | 'expiring_soon' | 'expired' | 'low_stock'; // 8. التنبيهات والحالة
  statusText?: string;
  notes?: string;
  rowIndex?: number; // Row index in Google Sheet (2-indexed)
  updatedAt?: string;
}

export interface SheetConfig {
  spreadsheetId: string;
  spreadsheetName: string;
  sheetName: string;
  spreadsheetUrl: string;
  lastSyncedAt?: string;
}

export interface GoogleAuthUser {
  email: string;
  name: string;
  picture?: string;
  accessToken: string;
  expiresAt: number;
}

export type FilterStatus = 'all' | 'expired' | 'expiring_soon' | 'low_stock' | 'valid';

export const INVENTORY_CATEGORIES = [
  'ألبان وأجبان',
  'مشروبات وعصائر',
  'معلبات وبقوليات',
  'مخبوزات وحلويات',
  'زيوت وسمن',
  'أرز ومكرونة',
  'مجمدات ولحوم',
  'منظفات وعناية',
  'تسالي ومقرمشات',
  'أخرى',
] as const;
