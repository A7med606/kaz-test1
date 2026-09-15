import { InventoryItem, SheetConfig, GoogleAuthUser } from '../types';
import { calculateStatus } from '../data/initialData';

// OAuth Client ID from project configuration
export const GOOGLE_CLIENT_ID =
  '633425464884-eh67ds29gmmnm44m8g9jf2k9s4dq77pl.apps.googleusercontent.com';

export const SHEET_COLUMNS = [
  'رقم الباركود',
  'اسم المنتج',
  'الصنف / القسم',
  'الكمية بالمخزن',
  'الكمية بالصالة',
  'تاريخ الإنتاج',
  'تاريخ انتهاء الصلاحية',
  'التنبيهات والحالة',
];

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: {
              access_token?: string;
              error?: string;
              expires_in?: number;
            }) => void;
          }) => {
            requestAccessToken: (options?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}

let tokenClientInstance: ReturnType<
  NonNullable<Window['google']>['accounts']['oauth2']['initTokenClient']
> | null = null;

export function initializeTokenClient(
  onSuccess: (user: GoogleAuthUser) => void,
  onError: (error: string) => void
) {
  if (typeof window === 'undefined' || !window.google?.accounts?.oauth2) {
    return false;
  }

  try {
    tokenClientInstance = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
      callback: async (response) => {
        if (response.error || !response.access_token) {
          onError(response.error || 'فشل الحصول على تصريح الوصول');
          return;
        }

        try {
          // Fetch user info with the token
          const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${response.access_token}` },
          });

          let email = 'user@gmail.com';
          let name = 'المستخدم';
          let picture: string | undefined;

          if (userInfoRes.ok) {
            const info = await userInfoRes.json();
            email = info.email || email;
            name = info.name || name;
            picture = info.picture;
          }

          const authUser: GoogleAuthUser = {
            email,
            name,
            picture,
            accessToken: response.access_token,
            expiresAt: Date.now() + (response.expires_in || 3600) * 1000,
          };

          onSuccess(authUser);
        } catch (e) {
          console.warn('Could not fetch userinfo, proceeding with access token', e);
          const authUser: GoogleAuthUser = {
            email: 'user@gmail.com',
            name: 'مستخدم جوجل',
            accessToken: response.access_token,
            expiresAt: Date.now() + 3600 * 1000,
          };
          onSuccess(authUser);
        }
      },
    });
    return true;
  } catch (err) {
    console.error('Error initializing TokenClient', err);
    return false;
  }
}

export function requestGoogleLogin(
  onSuccess: (user: GoogleAuthUser) => void,
  onError: (error: string) => void
) {
  if (!tokenClientInstance) {
    const initialized = initializeTokenClient(onSuccess, onError);
    if (!initialized) {
      onError('جاري تحميل مكتبة Google... يرجى المحاولة بعد قليل.');
      return;
    }
  }

  try {
    tokenClientInstance?.requestAccessToken({ prompt: 'consent' });
  } catch (e) {
    onError('حدث خطأ أثناء طلب الدخول عبر Google');
  }
}

/**
 * Fetch list of Google Spreadsheets in user's Google Drive
 */
export async function listUserSpreadsheets(accessToken: string): Promise<Array<{ id: string; name: string }>> {
  const url = `https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.spreadsheet'&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc&pageSize=15`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`خطأ في جلب ملفات Google Drive: ${err}`);
  }

  const data = await res.json();
  return (data.files || []).map((f: { id: string; name: string }) => ({
    id: f.id,
    name: f.name,
  }));
}

/**
 * Create a new Supermarket Inventory Spreadsheet with formatted headers
 */
export async function createSupermarketSheet(
  accessToken: string,
  title: string = 'سوبرماركت - سجل المخزون والجرد'
): Promise<SheetConfig> {
  const body = {
    properties: {
      title,
      defaultFormat: {
        textFormat: {
          fontFamily: 'Cairo',
        },
      },
    },
    sheets: [
      {
        properties: {
          title: 'المخزون',
          rightToLeft: true,
          gridProperties: {
            frozenRowCount: 1,
          },
        },
        data: [
          {
            startRow: 0,
            startColumn: 0,
            rowData: [
              {
                values: SHEET_COLUMNS.map((col) => ({
                  userEnteredValue: { stringValue: col },
                  userEnteredFormat: {
                    backgroundColor: { red: 0.1, green: 0.4, blue: 0.3 }, // Nice Emerald green
                    textFormat: {
                      bold: true,
                      foregroundColor: { red: 1, green: 1, blue: 1 },
                      fontSize: 11,
                    },
                    horizontalAlignment: 'CENTER',
                  },
                })),
              },
            ],
          },
        ],
      },
    ],
  };

  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`فشل إنشاء جدول Google Sheets: ${err}`);
  }

  const result = await res.json();
  const spreadsheetId = result.spreadsheetId;

  return {
    spreadsheetId,
    spreadsheetName: title,
    sheetName: 'المخزون',
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    lastSyncedAt: new Date().toLocaleTimeString('ar-EG'),
  };
}

/**
 * Read inventory items from Google Sheet
 */
export async function loadSheetItems(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string = 'المخزون'
): Promise<{ items: InventoryItem[]; sheetTitle: string }> {
  // First get metadata to know exact sheet name if different
  let resolvedSheetName = sheetName;
  try {
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (metaRes.ok) {
      const meta = await metaRes.json();
      if (meta.sheets && meta.sheets.length > 0) {
        resolvedSheetName = meta.sheets[0].properties.title;
      }
    }
  } catch (e) {
    console.warn('Could not read sheet metadata', e);
  }

  const range = `${resolvedSheetName}!A1:H200`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`خطأ في قراءة بيانات الجدول: ${err}`);
  }

  const data = await res.json();
  const rows = data.values || [];

  if (rows.length <= 1) {
    return { items: [], sheetTitle: resolvedSheetName };
  }

  // Row 0 is header; rows 1..N are data
  const items: InventoryItem[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    // Column order:
    // 0: Barcode, 1: Name, 2: Category, 3: Warehouse Qty, 4: Shop Qty, 5: Prod Date, 6: Expiry Date, 7: Status
    const barcode = String(row[0] || '').trim();
    const itemName = String(row[1] || '').trim();
    if (!barcode && !itemName) continue; // Skip empty rows

    const category = String(row[2] || 'أخرى').trim();
    const warehouseQty = parseInt(row[3], 10) || 0;
    const shopQty = parseInt(row[4], 10) || 0;
    const productionDate = String(row[5] || '').trim();
    const expiryDate = String(row[6] || '').trim();
    const currentStatusText = String(row[7] || '').trim();

    const { status, statusText } = calculateStatus(expiryDate, shopQty);

    items.push({
      id: `sheet-${i}-${barcode || Date.now()}`,
      barcode,
      itemName,
      category,
      warehouseQty,
      shopQty,
      productionDate,
      expiryDate,
      status,
      statusText: currentStatusText || statusText,
      rowIndex: i + 1, // 1-indexed row number in Google Sheets
    });
  }

  return { items, sheetTitle: resolvedSheetName };
}

/**
 * Update a specific row in Google Sheet
 */
export async function updateSheetItemRow(
  accessToken: string,
  spreadsheetId: string,
  item: InventoryItem,
  sheetName: string = 'المخزون'
): Promise<void> {
  if (!item.rowIndex) {
    throw new Error('رقم الصف غير معروف للتعديل');
  }

  const range = `${sheetName}!A${item.rowIndex}:H${item.rowIndex}`;
  const values = [
    [
      item.barcode,
      item.itemName,
      item.category,
      item.warehouseQty,
      item.shopQty,
      item.productionDate,
      item.expiryDate,
      item.statusText || calculateStatus(item.expiryDate, item.shopQty).statusText,
    ],
  ];

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`فشل تحديث الصنف في Google Sheets: ${err}`);
  }
}

/**
 * Append a new item row to Google Sheet
 */
export async function appendSheetItem(
  accessToken: string,
  spreadsheetId: string,
  item: InventoryItem,
  sheetName: string = 'المخزون'
): Promise<number> {
  const range = `${sheetName}!A:H`;
  const values = [
    [
      item.barcode,
      item.itemName,
      item.category,
      item.warehouseQty,
      item.shopQty,
      item.productionDate,
      item.expiryDate,
      item.statusText || calculateStatus(item.expiryDate, item.shopQty).statusText,
    ],
  ];

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`فشل إضافة الصنف إلى Google Sheets: ${err}`);
  }

  const result = await res.json();
  // Extract row index from updatedRange e.g. "المخزون!A10:H10"
  const match = result.updates?.updatedRange?.match(/A(\d+):/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Populate or upload initial items into the sheet
 */
export async function populateInitialSheetData(
  accessToken: string,
  spreadsheetId: string,
  items: InventoryItem[],
  sheetName: string = 'المخزون'
): Promise<void> {
  const range = `${sheetName}!A2:H${items.length + 1}`;
  const values = items.map((item) => [
    item.barcode,
    item.itemName,
    item.category,
    item.warehouseQty,
    item.shopQty,
    item.productionDate,
    item.expiryDate,
    item.statusText || calculateStatus(item.expiryDate, item.shopQty).statusText,
  ]);

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`فشل رفع البيانات الأولية إلى الجدول: ${err}`);
  }
}
