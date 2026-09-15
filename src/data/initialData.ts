import { InventoryItem } from '../types';

export function calculateStatus(
  expiryDateStr: string,
  shopQty: number
): { status: InventoryItem['status']; statusText: string } {
  if (!expiryDateStr) {
    if (shopQty <= 3) return { status: 'low_stock', statusText: 'نقص حاد في الصالة' };
    return { status: 'valid', statusText: 'سليم ومتاح' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const exp = new Date(expiryDateStr);
  exp.setHours(0, 0, 0, 0);

  const diffTime = exp.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { status: 'expired', statusText: `منتهي الصلاحية (منذ ${Math.abs(diffDays)} يوم)` };
  } else if (diffDays <= 15) {
    return { status: 'expiring_soon', statusText: `يوشك على الانتهاء (${diffDays} يوم متبقي)` };
  } else if (shopQty <= 3) {
    return { status: 'low_stock', statusText: 'يحتاج تزويد الصالة من المخزن' };
  }

  return { status: 'valid', statusText: 'سليم ومتاح' };
}

// Generate dates relative to today
const now = new Date();
const formatDate = (d: Date) => d.toISOString().split('T')[0];

const dateMinus = (days: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  return formatDate(d);
};

const datePlus = (days: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  return formatDate(d);
};

export const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: 'item-1',
    barcode: '6281007010115',
    itemName: 'حليب المراعي كامل الدسم 1 لتر',
    category: 'ألبان وأجبان',
    warehouseQty: 48,
    shopQty: 8,
    productionDate: dateMinus(20),
    expiryDate: datePlus(7), // Expiring soon
    status: 'expiring_soon',
    statusText: 'يوشك على الانتهاء (7 أيام متبقية)',
    notes: 'الرف الأوسط - ثلاجة الألبان 2',
    rowIndex: 2,
  },
  {
    id: 'item-2',
    barcode: '6221008000421',
    itemName: 'جبنة دومتي فيتا بلس 500 جم',
    category: 'ألبان وأجبان',
    warehouseQty: 24,
    shopQty: 2, // Low stock on shelf
    productionDate: dateMinus(60),
    expiryDate: datePlus(120),
    status: 'low_stock',
    statusText: 'يحتاج تزويد الصالة من المخزن',
    notes: 'باقي علبتين فقط بالصالة',
    rowIndex: 3,
  },
  {
    id: 'item-3',
    barcode: '6221155021894',
    itemName: 'تونة صن شاين قطع سهلة الفتح 185 جم',
    category: 'معلبات وبقوليات',
    warehouseQty: 80,
    shopQty: 25,
    productionDate: dateMinus(180),
    expiryDate: datePlus(360),
    status: 'valid',
    statusText: 'سليم ومتاح',
    notes: 'ستاند العروض أمام الممر 3',
    rowIndex: 4,
  },
  {
    id: 'item-4',
    barcode: '6223000551029',
    itemName: 'زبادي نستله طبيعي 105 جم',
    category: 'ألبان وأجبان',
    warehouseQty: 12,
    shopQty: 0,
    productionDate: dateMinus(25),
    expiryDate: dateMinus(2), // Expired
    status: 'expired',
    statusText: 'منتهي الصلاحية (سحب فوري للمرتجعات)',
    notes: 'يجب عزل الصنف للمورد',
    rowIndex: 5,
  },
  {
    id: 'item-5',
    barcode: '6281006540026',
    itemName: 'أرز أبو كاس بسمتي هندي 5 كجم',
    category: 'أرز ومكرونة',
    warehouseQty: 35,
    shopQty: 10,
    productionDate: dateMinus(90),
    expiryDate: datePlus(500),
    status: 'valid',
    statusText: 'سليم ومتاح',
    notes: 'ممر البقوليات والأرز 1',
    rowIndex: 6,
  },
  {
    id: 'item-6',
    barcode: '7622210609312',
    itemName: 'بسكويت أوريو شوكولاتة 12 قطعة',
    category: 'مخبوزات وحلويات',
    warehouseQty: 60,
    shopQty: 14,
    productionDate: dateMinus(45),
    expiryDate: datePlus(10), // Expiring soon
    status: 'expiring_soon',
    statusText: 'يوشك على الانتهاء (10 أيام متبقية)',
    notes: 'ستاند الكاشير 1',
    rowIndex: 7,
  },
  {
    id: 'item-7',
    barcode: '5449000000996',
    itemName: 'كوكاكولا كانز 330 مل',
    category: 'مشروبات وعصائر',
    warehouseQty: 120,
    shopQty: 36,
    productionDate: dateMinus(30),
    expiryDate: datePlus(240),
    status: 'valid',
    statusText: 'سليم ومتاح',
    notes: 'ثلاجة المشروبات الرئيسية',
    rowIndex: 8,
  },
  {
    id: 'item-8',
    barcode: '6221155000103',
    itemName: 'زيت ذرة عافية نقي 1.6 لتر',
    category: 'زيوت وسمن',
    warehouseQty: 40,
    shopQty: 1,
    productionDate: dateMinus(80),
    expiryDate: datePlus(300),
    status: 'low_stock',
    statusText: 'يحتاج تزويد الصالة من المخزن',
    notes: 'نفد من الرف الرئيسي',
    rowIndex: 9,
  },
];
