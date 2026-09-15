import React, { useState, useEffect } from 'react';
import { GoogleAuthUser, SheetConfig } from '../types';
import {
  requestGoogleLogin,
  createSupermarketSheet,
  listUserSpreadsheets,
  loadSheetItems,
  populateInitialSheetData,
} from '../services/sheetsService';
import {
  FileSpreadsheet,
  CheckCircle2,
  ExternalLink,
  PlusCircle,
  FolderOpen,
  HelpCircle,
  X,
  Smartphone,
  Sparkles,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { InventoryItem } from '../types';

interface SheetsConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: GoogleAuthUser | null;
  onUserAuth: (user: GoogleAuthUser) => void;
  sheetConfig: SheetConfig | null;
  onSelectSheet: (config: SheetConfig, items?: InventoryItem[]) => void;
  currentLocalItems: InventoryItem[];
}

export const SheetsConnectModal: React.FC<SheetsConnectModalProps> = ({
  isOpen,
  onClose,
  user,
  onUserAuth,
  sheetConfig,
  onSelectSheet,
  currentLocalItems,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'existing' | 'manual' | 'appsheet-guide'>('create');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [spreadsheetsList, setSpreadsheetsList] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [manualSheetInput, setManualSheetInput] = useState('');
  const [newSheetTitle, setNewSheetTitle] = useState('سوبرماركت - سجل المخزون والجرد');
  const [uploadExistingItems, setUploadExistingItems] = useState(true);

  useEffect(() => {
    if (isOpen && user && activeTab === 'existing') {
      loadDriveSpreadsheets();
    }
  }, [isOpen, user, activeTab]);

  const handleLogin = () => {
    setErrorMsg(null);
    requestGoogleLogin(
      (authUser) => {
        onUserAuth(authUser);
        setSuccessMsg(`مرحباً ${authUser.name}! تم تسجيل الدخول بنجاح.`);
      },
      (err) => {
        setErrorMsg(err);
      }
    );
  };

  const loadDriveSpreadsheets = async () => {
    if (!user?.accessToken) return;
    setLoadingFiles(true);
    setErrorMsg(null);
    try {
      const files = await listUserSpreadsheets(user.accessToken);
      setSpreadsheetsList(files);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'فشل جلب ملفات Google Drive');
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleCreateNewSheet = async () => {
    if (!user?.accessToken) {
      setErrorMsg('يرجى تسجيل الدخول بحساب Google أولاً');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const config = await createSupermarketSheet(user.accessToken, newSheetTitle.trim());

      // If user has local items, upload them as initial rows
      if (uploadExistingItems && currentLocalItems.length > 0) {
        await populateInitialSheetData(user.accessToken, config.spreadsheetId, currentLocalItems);
      }

      onSelectSheet(config);
      setSuccessMsg('تم إنشاء جدول Google Sheets بنجاح وتهيئته بالأعمدة الثمانية!');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'فشل إنشاء الجدول');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectExisting = async (fileId: string, fileName: string) => {
    if (!user?.accessToken) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const { items, sheetTitle } = await loadSheetItems(user.accessToken, fileId);
      const config: SheetConfig = {
        spreadsheetId: fileId,
        spreadsheetName: fileName,
        sheetName: sheetTitle,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${fileId}/edit`,
        lastSyncedAt: new Date().toLocaleTimeString('ar-EG'),
      };
      onSelectSheet(config, items);
      setSuccessMsg(`تم ربط الجدول "${fileName}" بنجاح وجلب ${items.length} صنف!`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'فشل قراءة بيانات الجدول المحدد');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectManualId = async () => {
    if (!user?.accessToken) {
      setErrorMsg('يرجى تسجيل الدخول بحساب Google أولاً');
      return;
    }
    const input = manualSheetInput.trim();
    if (!input) {
      setErrorMsg('يرجى إدخال رابط أو معرف Google Sheet');
      return;
    }

    let fileId = input;
    // Extract ID if full URL pasted
    const match = input.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      fileId = match[1];
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const { items, sheetTitle } = await loadSheetItems(user.accessToken, fileId);
      const config: SheetConfig = {
        spreadsheetId: fileId,
        spreadsheetName: 'جدول المخزون المربوط',
        sheetName: sheetTitle,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${fileId}/edit`,
        lastSyncedAt: new Date().toLocaleTimeString('ar-EG'),
      };
      onSelectSheet(config, items);
      setSuccessMsg(`تم ربط الجدول بنجاح وجلب ${items.length} صنف!`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'تعذر قراءة هذا الجدول. تأكد من صحة الرابط والصلاحيات.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="sheets-connect-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/75 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150"
    >
      <div
        id="sheets-connect-modal-content"
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden text-stone-800 my-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-emerald-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700/80 flex items-center justify-center shadow-inner text-emerald-100">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>ربط وإدارة Google Sheets</span>
                <span className="text-[10px] bg-emerald-600/80 px-2 py-0.5 rounded-full font-normal">مزامنة سحابية</span>
              </h3>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                تحديث لحظي للمخزون وجرد الأرفف متوافق مع AppSheet
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white hover:bg-emerald-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Auth Banner */}
        <div className="px-6 py-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
          {user ? (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs overflow-hidden border border-emerald-300">
                {user.picture ? (
                  <img src={user.picture} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  user.name.charAt(0)
                )}
              </div>
              <div>
                <div className="text-xs font-semibold text-stone-800 flex items-center gap-1.5">
                  <span>{user.name}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                </div>
                <div className="text-[11px] text-stone-500 font-mono">{user.email}</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <div className="text-xs text-stone-600">
                قم بتسجيل الدخول بحساب Google لربط ملفات Google Drive وGoogle Sheets
              </div>
              <button
                type="button"
                onClick={handleLogin}
                className="px-4 py-1.5 bg-white border border-stone-300 hover:border-emerald-500 text-xs font-semibold text-stone-800 rounded-xl shadow-xs flex items-center gap-2 transition-all hover:shadow-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>تسجيل الدخول بـ Google</span>
              </button>
            </div>
          )}

          {sheetConfig && (
            <div className="flex items-center gap-2">
              <a
                href={sheetConfig.spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg px-2.5 py-1 flex items-center gap-1 hover:bg-emerald-100 transition-colors"
              >
                <span>فتح الجدول في تاب جديد</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* Feedback alerts */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="px-6 pt-4 border-b border-stone-200 flex items-center gap-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'create'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>إنشاء شيت مخزون جديد</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('existing');
              if (user) loadDriveSpreadsheets();
            }}
            className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'existing'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <span>اختيار شيت من Google Drive</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'manual'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>ربط برابط / معرف الشيت</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('appsheet-guide')}
            className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'appsheet-guide'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>دليل AppSheet الميداني</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'create' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="sheet-title" className="block text-xs font-semibold text-stone-700 mb-1">
                  اسم ملف Google Sheets الجديد
                </label>
                <input
                  id="sheet-title"
                  type="text"
                  value={newSheetTitle}
                  onChange={(e) => setNewSheetTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* 8 Columns Preview */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <span className="block text-xs font-bold text-stone-700 mb-2">
                  الأعمدة الثمانية المعتمدة تلقائياً في الصف الأول (Row 1):
                </span>
                <div className="grid grid-cols-4 gap-1.5 text-[11px] text-stone-600">
                  <span className="bg-white px-2 py-1 rounded border border-stone-200">1. رقم الباركود</span>
                  <span className="bg-white px-2 py-1 rounded border border-stone-200">2. اسم المنتج</span>
                  <span className="bg-white px-2 py-1 rounded border border-stone-200">3. الصنف / القسم</span>
                  <span className="bg-white px-2 py-1 rounded border border-stone-200">4. الكمية بالمخزن</span>
                  <span className="bg-white px-2 py-1 rounded border border-stone-200">5. الكمية بالصالة</span>
                  <span className="bg-white px-2 py-1 rounded border border-stone-200">6. تاريخ الإنتاج</span>
                  <span className="bg-white px-2 py-1 rounded border border-stone-200">7. تاريخ انتهاء الصلاحية</span>
                  <span className="bg-white px-2 py-1 rounded border border-stone-200">8. التنبيهات والحالة</span>
                </div>
              </div>

              {/* Upload sample items checkbox */}
              <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-700">
                <input
                  type="checkbox"
                  checked={uploadExistingItems}
                  onChange={(e) => setUploadExistingItems(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-stone-300"
                />
                <span>تضمين وحفظ الأصناف الحالية في التطبيق مباشرة داخل الشيت الجديد</span>
              </label>

              <button
                type="button"
                disabled={loading || !user}
                onClick={handleCreateNewSheet}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                <span>
                  {user ? 'إنشاء الشيت الآن في حسابي على Google Drive' : 'يرجى تسجيل الدخول أولاً للإنشاء'}
                </span>
              </button>
            </div>
          )}

          {activeTab === 'existing' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-stone-600">
                <span>جداول Google Sheets الموجودة في Google Drive:</span>
                <button
                  type="button"
                  onClick={loadDriveSpreadsheets}
                  disabled={loadingFiles || !user}
                  className="text-emerald-700 hover:underline font-semibold"
                >
                  تحديث القائمة
                </button>
              </div>

              {!user && (
                <div className="p-6 text-center text-xs text-stone-500 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                  سجل دخولك بحساب Google بالأعلى لعرض ملفات Google Sheets الخاصة بك.
                </div>
              )}

              {loadingFiles && (
                <div className="py-8 flex items-center justify-center gap-2 text-stone-500 text-xs">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                  <span>جاري قراءة ملفات Google Drive...</span>
                </div>
              )}

              {user && !loadingFiles && spreadsheetsList.length === 0 && (
                <div className="p-6 text-center text-xs text-stone-500 bg-stone-50 rounded-xl">
                  لم يتم العثور على جداول Google Sheets، يمكنك إنشاء جدول جديد من التاب الأول.
                </div>
              )}

              <div className="max-h-60 overflow-y-auto space-y-2">
                {spreadsheetsList.map((file) => (
                  <div
                    key={file.id}
                    className="p-3 bg-stone-50 hover:bg-emerald-50/70 border border-stone-200 hover:border-emerald-300 rounded-xl flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-xs font-semibold text-stone-800">{file.name}</span>
                    </div>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleSelectExisting(file.id, file.name)}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors"
                    >
                      ربط وقراءة البيانات
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'manual' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="manual-sheet-id" className="block text-xs font-semibold text-stone-700 mb-1">
                  معرف أو رابط جدول Google Sheets
                </label>
                <input
                  id="manual-sheet-id"
                  type="text"
                  value={manualSheetInput}
                  onChange={(e) => setManualSheetInput(e.target.value)}
                  placeholder="مثال: https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5n... أو المعرف فقط"
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono"
                />
                <span className="text-[11px] text-stone-400 mt-1 block">
                  يمكنك نسخ رابط الملف من شريط العنوان في متصفحك ولصقه هنا مباشرة.
                </span>
              </div>

              <button
                type="button"
                disabled={loading || !user}
                onClick={handleConnectManualId}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>ربط هذا الجدول وقراءة الأصناف</span>
              </button>
            </div>
          )}

          {activeTab === 'appsheet-guide' && (
            <div className="space-y-4 text-xs text-stone-700 leading-relaxed">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span>
                  هذا التطبيق يقوم بالمزامنة السريعة المباشرة مع نفس شيت جوجل الذي صممته لـ <strong>Google AppSheet</strong>! إليك تذكير سريع بالخطوات لاستخدامه على الهاتف بأعلى كفاءة:
                </span>
              </div>

              <ol className="space-y-3 pr-4 list-decimal marker:text-emerald-700 marker:font-bold">
                <li>
                  <strong>فتح الشيت في المتصفح:</strong> اذهب إلى القائمة العلوية واضغط على <code>Extensions (الإضافات)</code> ثم <code>AppSheet &gt; Create an app</code>.
                </li>
                <li>
                  <strong>تفعيل ماسح الباركود بالكاميرا في AppSheet:</strong> من القائمة الجانبية في AppSheet اذهب إلى <code>Data &gt; Columns</code>، ثم عند عمود <code>رقم الباركود</code> غيّر النوع إلى <code>Barcode</code>.
                </li>
                <li>
                  <strong>التثبيت على الهاتف:</strong> نزل تطبيق AppSheet من متجر Google Play وسجل دخولك بنفس الإيميل، وستجد تطبيق المخزون جاهزاً للعمل بين الممرات!
                </li>
              </ol>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-stone-50 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>
              {sheetConfig ? `الجدول النشط: ${sheetConfig.spreadsheetName}` : 'يعمل حالياً في الوضع المحلي السريع'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xl font-medium transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
