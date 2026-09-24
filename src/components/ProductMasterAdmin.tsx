import React, { useState, useEffect } from 'react';
import {
  Layers,
  Tag,
  Box,
  Cpu,
  Database,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  RefreshCw,
  FolderTree,
  Calendar,
  Code,
  Shield,
  FileSpreadsheet,
  AlertCircle,
  Sliders,
  Check,
  X
} from 'lucide-react';
import {
  AppUser,
  ProductCategoryMaster,
  BrandMaster,
  ModelMaster,
  ManufacturingSystemMaster,
  ProductMasterRecord,
  BOMHeader,
  BOMComponent,
  MaterialMaster
} from '../types';

interface ProductMasterAdminProps {
  currentUser?: AppUser | null;
}

export const ProductMasterAdmin: React.FC<ProductMasterAdminProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'categories' | 'brands' | 'models' | 'systems' | 'product_master' | 'bom'>('product_master');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Master Data Lists
  const [categories, setCategories] = useState<ProductCategoryMaster[]>([]);
  const [brands, setBrands] = useState<BrandMaster[]>([]);
  const [models, setModels] = useState<ModelMaster[]>([]);
  const [systems, setSystems] = useState<ManufacturingSystemMaster[]>([]);
  const [productMaster, setProductMaster] = useState<ProductMasterRecord[]>([]);
  const [bomHeaders, setBomHeaders] = useState<BOMHeader[]>([]);
  const [materials, setMaterials] = useState<MaterialMaster[]>([]);

  // Filter for Models Tab
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>('ALL');

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'ADD' | 'EDIT'>('ADD');
  const [editingItem, setEditingItem] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState({
    id: '',
    code: '',
    name: '',
    brand_id: '',
    category_id: '',
    model_id: '',
    manufacturing_system_id: '',
    warranty_years: 10,
    sap_material_code: '',
    notes: '',
    default_size: '180x200x30 سم',
  });

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [catRes, brdRes, modRes, sysRes, prmRes, bomRes, matRes] = await Promise.all([
        fetch('/api/product-categories').then(r => r.json()).catch(() => []),
        fetch('/api/brands').then(r => r.json()).catch(() => []),
        fetch('/api/models').then(r => r.json()).catch(() => []),
        fetch('/api/manufacturing-systems').then(r => r.json()).catch(() => []),
        fetch('/api/product-master').then(r => r.json()).catch(() => []),
        fetch('/api/bom-headers').then(r => r.json()).catch(() => []),
        fetch('/api/material-master').then(r => r.json()).catch(() => []),
      ]);

      setCategories(Array.isArray(catRes) ? catRes : []);
      setBrands(Array.isArray(brdRes) ? brdRes : []);
      setModels(Array.isArray(modRes) ? modRes : []);
      setSystems(Array.isArray(sysRes) ? sysRes : []);
      setProductMaster(Array.isArray(prmRes) ? prmRes : []);
      setBomHeaders(Array.isArray(bomRes) ? bomRes : []);
      setMaterials(Array.isArray(matRes) ? matRes : []);
    } catch (err) {
      showToast('خطأ في استرجاع البيانات الأساسية', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Handle status toggle (Disable / Reactivate)
  const handleToggleStatus = async (type: 'categories' | 'brands' | 'models' | 'systems' | 'product_master', id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const endpointMap = {
      categories: `/api/product-categories/${id}/status`,
      brands: `/api/brands/${id}/status`,
      models: `/api/models/${id}/status`,
      systems: `/api/manufacturing-systems/${id}/status`,
      product_master: `/api/product-master/${id}/status`,
    };

    try {
      const res = await fetch(endpointMap[type], {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(newStatus === 'ACTIVE' ? 'تمت إعادة التفعيل بنجاح' : 'تم تعطيل السجل بنجاح');
        fetchAllData();
      } else {
        showToast(data.error || 'فشلت عملية تغيير الحالة', 'error');
      }
    } catch (e) {
      showToast('خطأ في الاتصال بالخادم', 'error');
    }
  };

  // Open modal for Add
  const handleOpenAdd = () => {
    setModalMode('ADD');
    setEditingItem(null);
    setFormData({
      id: '',
      code: '',
      name: '',
      brand_id: brands[0]?.id || '',
      category_id: categories[0]?.id || '',
      model_id: models[0]?.id || '',
      manufacturing_system_id: systems[0]?.id || '',
      warranty_years: 10,
      sap_material_code: '',
      notes: '',
      default_size: '180x200x30 سم',
    });
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (item: any) => {
    setModalMode('EDIT');
    setEditingItem(item);
    setFormData({
      id: item.id || '',
      code: item.code || item.internal_product_code || '',
      name: item.name || item.model_name || '',
      brand_id: item.brand_id || brands[0]?.id || '',
      category_id: item.category_id || categories[0]?.id || '',
      model_id: item.model_id || models[0]?.id || '',
      manufacturing_system_id: item.manufacturing_system_id || systems[0]?.id || '',
      warranty_years: item.warranty_years || 10,
      sap_material_code: item.sap_material_code || '',
      notes: item.notes || '',
      default_size: item.default_size || '180x200x30 سم',
    });
    setIsModalOpen(true);
  };

  // Submit Modal
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let endpoint = '';
      let method = modalMode === 'ADD' ? 'POST' : 'PUT';
      let payload: any = {};

      if (activeTab === 'categories') {
        endpoint = modalMode === 'ADD' ? '/api/product-categories' : `/api/product-categories/${editingItem.id}`;
        payload = { code: formData.code, name: formData.name, notes: formData.notes };
      } else if (activeTab === 'brands') {
        endpoint = modalMode === 'ADD' ? '/api/brands' : `/api/brands/${editingItem.id}`;
        payload = { code: formData.code, name: formData.name, notes: formData.notes };
      } else if (activeTab === 'models') {
        endpoint = modalMode === 'ADD' ? '/api/models' : `/api/models/${editingItem.id}`;
        payload = {
          code: formData.code,
          name: formData.name,
          brand_id: formData.brand_id,
          warranty_years: Number(formData.warranty_years),
          notes: formData.notes,
        };
      } else if (activeTab === 'systems') {
        endpoint = modalMode === 'ADD' ? '/api/manufacturing-systems' : `/api/manufacturing-systems/${editingItem.id}`;
        payload = { code: formData.code, name: formData.name, notes: formData.notes };
      } else if (activeTab === 'product_master') {
        endpoint = modalMode === 'ADD' ? '/api/product-master' : `/api/product-master/${editingItem.id}`;
        payload = {
          category_id: formData.category_id,
          brand_id: formData.brand_id,
          model_id: formData.model_id,
          manufacturing_system_id: formData.manufacturing_system_id,
          sap_material_code: formData.sap_material_code,
          default_size: formData.default_size,
          warranty_years: Number(formData.warranty_years),
          notes: formData.notes,
        };
      }

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success || res.ok) {
        showToast(modalMode === 'ADD' ? 'تمت الإضافة بنجاح' : 'تم التحديث بنجاح');
        setIsModalOpen(false);
        fetchAllData();
      } else {
        showToast(data.error || 'حدث خطأ أثناء حفظ البيانات', 'error');
      }
    } catch (err) {
      showToast('خطأ في الاتصال بالخادم', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-xl border text-sm font-bold flex items-center gap-3 transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-800 text-white border-emerald-600'
              : 'bg-rose-800 text-white border-rose-600'
          }`}
        >
          {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-300" /> : <AlertCircle className="w-5 h-5 text-rose-300" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Module Title Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-[#E5E7EB] dark:border-slate-800 shadow-xs relative overflow-hidden transition-colors">
        <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-[#08152F] via-[#E53935] to-[#D4AF37]" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#08152F] dark:bg-slate-800 flex items-center justify-center text-[#D4AF37] shadow-sm">
              <Database className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
                  Phase 9 Rebuild
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                  SAP & Traceability Ready
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-[#08152F] dark:text-white font-['Cairo'] tracking-tight mt-1">
                إدارة البيانات الأساسية للمنتجات (Product Master)
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                الهيكل المعتمد للفئات، العلامات التجارية، الموديلات، أنظمة التصنيع، وجداول الماستر ومواد الإنتاج
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAllData}
              disabled={isLoading}
              className="h-9 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>تحديث</span>
            </button>

            {activeTab !== 'bom' && (
              <button
                onClick={handleOpenAdd}
                className="h-9 px-4 rounded-xl bg-[#E53935] hover:bg-red-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة سجل جديد</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-1.5 border border-[#E5E7EB] dark:border-slate-800 shadow-xs flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveTab('product_master')}
          className={`h-9 px-4 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'product_master'
              ? 'bg-[#08152F] text-[#D4AF37] shadow-xs'
              : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>سجل المنتجات الماستر ({productMaster.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`h-9 px-4 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'categories'
              ? 'bg-[#08152F] text-[#D4AF37] shadow-xs'
              : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>فئات المنتجات ({categories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('brands')}
          className={`h-9 px-4 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'brands'
              ? 'bg-[#08152F] text-[#D4AF37] shadow-xs'
              : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>العلامات التجارية ({brands.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('models')}
          className={`h-9 px-4 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'models'
              ? 'bg-[#08152F] text-[#D4AF37] shadow-xs'
              : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Box className="w-3.5 h-3.5" />
          <span>الموديلات ({models.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('systems')}
          className={`h-9 px-4 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'systems'
              ? 'bg-[#08152F] text-[#D4AF37] shadow-xs'
              : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>أنظمة التصنيع ({systems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('bom')}
          className={`h-9 px-4 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'bom'
              ? 'bg-[#08152F] text-[#D4AF37] shadow-xs'
              : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FolderTree className="w-3.5 h-3.5" />
          <span>هيكل المواد BOM و SAP ({bomHeaders.length})</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-[#E5E7EB] dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            placeholder="بحث بالاسم أو الكود..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9 pr-9 pl-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#E53935]"
          />
        </div>

        {activeTab === 'models' && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">العلامة التجارية:</span>
            <select
              value={selectedBrandFilter}
              onChange={(e) => setSelectedBrandFilter(e.target.value)}
              className="h-9 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200"
            >
              <option value="ALL">جميع العلامات التجارية</option>
              {brands.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* 1. PRODUCT MASTER DATABASE TAB */}
      {/* ================================================================= */}
      {activeTab === 'product_master' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E5E7EB] dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
            <div>
              <h3 className="text-sm font-black text-[#08152F] dark:text-white">سجل المنتجات الماستر المعتمد (Product Master Records)</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">الربط المتكامل بين الفئة، العلامة، الموديل، نظام التصنيع، وجاهزية كود SAP</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300">
              {productMaster.filter(p => p.status === 'ACTIVE').length} نشط
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-bold">
                  <th className="p-3">كود المنتج الماستر</th>
                  <th className="p-3">الفئة</th>
                  <th className="p-3">العلامة التجارية</th>
                  <th className="p-3">الموديل</th>
                  <th className="p-3">نظام التصنيع</th>
                  <th className="p-3">كود مادة SAP</th>
                  <th className="p-3">الضمان</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3">تاريخ التحديث</th>
                  <th className="p-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {productMaster
                  .filter(p =>
                    !searchTerm ||
                    p.product_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    p.internal_product_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (p.model_name && p.model_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                    (p.brand_name && p.brand_name.toLowerCase().includes(searchTerm.toLowerCase()))
                  )
                  .map(p => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="p-3 font-mono font-bold text-[#08152F] dark:text-white">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#E53935]">{p.internal_product_code}</span>
                          <span className="text-[10px] text-slate-400">({p.product_id})</span>
                        </div>
                      </td>
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{p.category_name || 'مرتبة'}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {p.brand_name || 'Sleepee'}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">{p.model_name}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          {p.manufacturing_system_name || 'ألماني'}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                        {p.sap_material_code ? (
                          <span className="text-emerald-700 dark:text-emerald-400 font-bold">{p.sap_material_code}</span>
                        ) : (
                          <span className="text-slate-400 italic">بانتظار الربط (SAP Ready)</span>
                        )}
                      </td>
                      <td className="p-3 font-mono font-bold text-amber-600">{p.warranty_years || 10} سنوات</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            p.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                          }`}
                        >
                          {p.status === 'ACTIVE' ? 'نشط' : 'معطل'}
                        </span>
                      </td>
                      <td className="p-3 text-[11px] text-slate-400 font-mono">
                        {p.updated_date ? p.updated_date.split('T')[0] : p.created_date?.split('T')[0]}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            title="تعديل السجل"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus('product_master', p.id, p.status)}
                            title={p.status === 'ACTIVE' ? 'تعطيل السجل' : 'إعادة التفعيل'}
                            className={`p-1.5 rounded-lg cursor-pointer ${
                              p.status === 'ACTIVE'
                                ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                                : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                            }`}
                          >
                            {p.status === 'ACTIVE' ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 2. CATEGORIES TAB */}
      {/* ================================================================= */}
      {activeTab === 'categories' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E5E7EB] dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
            <div>
              <h3 className="text-sm font-black text-[#08152F] dark:text-white">جدول فئات المنتجات (Product Category Master)</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">مرتبة، مخدة، خدادية، واقي مرتبة، سرير، إكسسوار مع دعم الإضافة والتعديل والتعطيل</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300">
              {categories.filter(c => c.status === 'ACTIVE').length} نشط
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-bold">
                  <th className="p-3">المعرف</th>
                  <th className="p-3">كود الفئة</th>
                  <th className="p-3">اسم الفئة</th>
                  <th className="p-3">ملاحظات</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3">تاريخ الإنشاء</th>
                  <th className="p-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {categories
                  .filter(c => !searchTerm || c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.code.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(c => (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="p-3 font-mono font-bold text-slate-400">{c.id}</td>
                      <td className="p-3 font-mono font-bold text-[#E53935]">{c.code}</td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">{c.name}</td>
                      <td className="p-3 text-slate-500 dark:text-slate-400">{c.notes || '—'}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            c.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                          }`}
                        >
                          {c.status === 'ACTIVE' ? 'نشط' : 'معطل'}
                        </span>
                      </td>
                      <td className="p-3 text-[11px] text-slate-400 font-mono">{c.created_at ? c.created_at.split('T')[0] : '—'}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(c)}
                            title="تعديل"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 dark:text-slate-300 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus('categories', c.id, c.status)}
                            title={c.status === 'ACTIVE' ? 'تعطيل الفئة' : 'إعادة التفعيل'}
                            className={`p-1.5 rounded-lg cursor-pointer ${
                              c.status === 'ACTIVE' ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            {c.status === 'ACTIVE' ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 3. BRANDS TAB */}
      {/* ================================================================= */}
      {activeTab === 'brands' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E5E7EB] dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
            <div>
              <h3 className="text-sm font-black text-[#08152F] dark:text-white">جدول العلامات التجارية (Brand Master)</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Sleepee, SH, Rich House, Comfort SH مع دعم العلامات الخاصة (Private-label) دون تعديل كود</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300">
              {brands.filter(b => b.status === 'ACTIVE').length} نشط
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-bold">
                  <th className="p-3">المعرف</th>
                  <th className="p-3">كود العلامة</th>
                  <th className="p-3">اسم العلامة التجارية</th>
                  <th className="p-3">ملاحظات</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3">تاريخ الإنشاء</th>
                  <th className="p-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {brands
                  .filter(b => !searchTerm || b.name.toLowerCase().includes(searchTerm.toLowerCase()) || b.code.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(b => (
                    <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="p-3 font-mono font-bold text-slate-400">{b.id}</td>
                      <td className="p-3 font-mono font-bold text-[#E53935]">{b.code}</td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">{b.name}</td>
                      <td className="p-3 text-slate-500 dark:text-slate-400">{b.notes || '—'}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            b.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                          }`}
                        >
                          {b.status === 'ACTIVE' ? 'نشط' : 'معطل'}
                        </span>
                      </td>
                      <td className="p-3 text-[11px] text-slate-400 font-mono">{b.created_at ? b.created_at.split('T')[0] : '—'}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(b)}
                            title="تعديل"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 dark:text-slate-300 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus('brands', b.id, b.status)}
                            title={b.status === 'ACTIVE' ? 'تعطيل العلامة' : 'إعادة التفعيل'}
                            className={`p-1.5 rounded-lg cursor-pointer ${
                              b.status === 'ACTIVE' ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            {b.status === 'ACTIVE' ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 4. MODELS TAB (Linked to Brand only) */}
      {/* ================================================================= */}
      {activeTab === 'models' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E5E7EB] dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
            <div>
              <h3 className="text-sm font-black text-[#08152F] dark:text-white">جدول الموديلات المربوطة بالعلامة التجارية (Model Master)</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">مرتبطة بالعلامة فقط بدون تصنيف إلزامي مقيد (لا يتم إجبار Foam/Medical/Bonnell/Pocket في الهيكل)</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300">
              {models.filter(m => m.status === 'ACTIVE').length} نشط
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-bold">
                  <th className="p-3">المعرف</th>
                  <th className="p-3">العلامة التجارية</th>
                  <th className="p-3">كود الموديل</th>
                  <th className="p-3">اسم الموديل</th>
                  <th className="p-3">سنوات الضمان الافتراضية</th>
                  <th className="p-3">ملاحظات</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {models
                  .filter(m => selectedBrandFilter === 'ALL' || m.brand_id === selectedBrandFilter)
                  .filter(m => !searchTerm || m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.code.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(m => {
                    const brandObj = brands.find(b => b.id === m.brand_id);
                    return (
                      <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="p-3 font-mono font-bold text-slate-400">{m.id}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {brandObj?.name || m.brand_id}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-[#E53935]">{m.code}</td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">{m.name}</td>
                        <td className="p-3 font-mono font-bold text-amber-600">{m.warranty_years || 10} سنوات</td>
                        <td className="p-3 text-slate-500 dark:text-slate-400">{m.notes || '—'}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              m.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                            }`}
                          >
                            {m.status === 'ACTIVE' ? 'نشط' : 'معطل'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(m)}
                              title="تعديل"
                              className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 dark:text-slate-300 cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus('models', m.id, m.status)}
                              title={m.status === 'ACTIVE' ? 'تعطيل الموديل' : 'إعادة التفعيل'}
                              className={`p-1.5 rounded-lg cursor-pointer ${
                                m.status === 'ACTIVE' ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'
                              }`}
                            >
                              {m.status === 'ACTIVE' ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 5. MANUFACTURING SYSTEMS TAB */}
      {/* ================================================================= */}
      {activeTab === 'systems' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E5E7EB] dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
            <div>
              <h3 className="text-sm font-black text-[#08152F] dark:text-white">جدول أنظمة التصنيع (Manufacturing System Master)</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">ألماني، أمريكي، أخرى مع إتاحة إضافة أي تكنولوجيا أو خط إنتاج مستقبلي</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300">
              {systems.filter(s => s.status === 'ACTIVE').length} نشط
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-bold">
                  <th className="p-3">المعرف</th>
                  <th className="p-3">كود النظام</th>
                  <th className="p-3">اسم نظام التصنيع</th>
                  <th className="p-3">ملاحظات فنية</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3">تاريخ الإنشاء</th>
                  <th className="p-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {systems
                  .filter(s => !searchTerm || s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.code.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(s => (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="p-3 font-mono font-bold text-slate-400">{s.id}</td>
                      <td className="p-3 font-mono font-bold text-[#E53935]">{s.code}</td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">{s.name}</td>
                      <td className="p-3 text-slate-500 dark:text-slate-400">{s.notes || '—'}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            s.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                          }`}
                        >
                          {s.status === 'ACTIVE' ? 'نشط' : 'معطل'}
                        </span>
                      </td>
                      <td className="p-3 text-[11px] text-slate-400 font-mono">{s.created_at ? s.created_at.split('T')[0] : '—'}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(s)}
                            title="تعديل"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 dark:text-slate-300 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus('systems', s.id, s.status)}
                            title={s.status === 'ACTIVE' ? 'تعطيل النظام' : 'إعادة التفعيل'}
                            className={`p-1.5 rounded-lg cursor-pointer ${
                              s.status === 'ACTIVE' ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            {s.status === 'ACTIVE' ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 6. BOM & SAP ARCHITECTURE PREVIEW TAB */}
      {/* ================================================================= */}
      {activeTab === 'bom' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E5E7EB] dark:border-slate-800 p-6 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <FolderTree className="w-6 h-6 text-[#E53935]" />
              <div>
                <h3 className="text-base font-black text-[#08152F] dark:text-white">معمارية شجرة المواد (BOM) والربط مع SAP S/4HANA</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">عقود البيانات النظيفة الجاهزة للتكامل مع وحدات PP و MM</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 text-[#08152F] dark:text-white font-bold text-xs mb-1">
                  <Code className="w-4 h-4 text-[#D4AF37]" />
                  <span>SAP Material Sync</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  حقول Material Code, Plant Code, Storage Location مهيأة في قاعدة البيانات ومربوطة بكل رقم تسلسلي وأمر إنتاج.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 text-[#08152F] dark:text-white font-bold text-xs mb-1">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  <span>BOM Header & Components</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  هيكل شجرة المواد (السوست، الإسفنج، القماش، الفوم) مربوط برقم المنتج الماستر مع معاملات الهالك (Scrap Factor).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 text-[#08152F] dark:text-white font-bold text-xs mb-1">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span>Traceability Foundation</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  الرقم التسلسلي يمثل هوية غير قابلة للتكرار تربط بين أمر الإنتاج، الموديل، تاريخ التصنيع، والضمان الرقمي.
                </p>
              </div>
            </div>
          </div>

          {/* Material Master Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E5E7EB] dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <h4 className="text-xs font-black text-[#08152F] dark:text-white">سجل المواد الخام ومكونات الإنتاج (Material Master)</h4>
              <span className="text-xs font-mono text-slate-500">{materials.length} مواد مسجلة</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-bold">
                    <th className="p-3">كود المادة</th>
                    <th className="p-3">اسم المادة الخام</th>
                    <th className="p-3">التصنيف</th>
                    <th className="p-3">كود SAP</th>
                    <th className="p-3">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {materials.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="p-3 font-mono font-bold text-[#E53935]">{m.code}</td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">{m.name}</td>
                      <td className="p-3 font-mono text-slate-600 dark:text-slate-400">{m.category}</td>
                      <td className="p-3 font-mono text-emerald-600 font-bold">{m.sap_material_code || '—'}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* ADD / EDIT MODAL */}
      {/* ================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 border border-[#E5E7EB] dark:border-slate-800 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-black text-[#08152F] dark:text-white">
                {modalMode === 'ADD' ? '➕ إضافة سجل جديد' : '✏️ تعديل بيانات السجل'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 flex items-center justify-center text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
              {/* Product Master Creation Form */}
              {activeTab === 'product_master' && (
                <>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">فئة المنتج:</label>
                    <select
                      value={formData.category_id}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-200"
                    >
                      {categories.filter(c => c.status === 'ACTIVE').map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">العلامة التجارية:</label>
                    <select
                      value={formData.brand_id}
                      onChange={(e) => {
                        const newBrandId = e.target.value;
                        const firstModel = models.find(m => m.brand_id === newBrandId)?.id || '';
                        setFormData({ ...formData, brand_id: newBrandId, model_id: firstModel });
                      }}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-200"
                    >
                      {brands.filter(b => b.status === 'ACTIVE').map(b => (
                        <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">الموديل (مرتبط بالعلامة فقط):</label>
                    <select
                      value={formData.model_id}
                      onChange={(e) => setFormData({ ...formData, model_id: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-200"
                    >
                      {models
                        .filter(m => m.brand_id === formData.brand_id && m.status === 'ACTIVE')
                        .map(m => (
                          <option key={m.id} value={m.id}>{m.name} ({m.code})</option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">نظام التصنيع:</label>
                    <select
                      value={formData.manufacturing_system_id}
                      onChange={(e) => setFormData({ ...formData, manufacturing_system_id: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-200"
                    >
                      {systems.filter(s => s.status === 'ACTIVE').map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">كود مادة SAP (اختياري):</label>
                    <input
                      type="text"
                      placeholder="SAP-MAT-..."
                      value={formData.sap_material_code}
                      onChange={(e) => setFormData({ ...formData, sap_material_code: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </>
              )}

              {/* Models Form */}
              {activeTab === 'models' && (
                <>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">العلامة التجارية التابع لها:</label>
                    <select
                      value={formData.brand_id}
                      onChange={(e) => setFormData({ ...formData, brand_id: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-200"
                    >
                      {brands.map(b => (
                        <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">اسم الموديل:</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: رويال بوكيت سبرينج"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">كود الموديل:</label>
                    <input
                      type="text"
                      required
                      placeholder="ROYAL_POCKET"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">سنوات الضمان:</label>
                    <input
                      type="number"
                      min="1"
                      max="25"
                      value={formData.warranty_years}
                      onChange={(e) => setFormData({ ...formData, warranty_years: Number(e.target.value) })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </>
              )}

              {/* Categories, Brands, Systems Forms */}
              {(activeTab === 'categories' || activeTab === 'brands' || activeTab === 'systems') && (
                <>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">الاسم بالعربية:</label>
                    <input
                      type="text"
                      required
                      placeholder="الاسم الرسمي..."
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">الكود المختصر (Code):</label>
                    <input
                      type="text"
                      required
                      placeholder="CODE_NAME"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">ملاحظات إضافية:</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#E53935] hover:bg-red-700 text-white font-bold shadow-xs cursor-pointer"
                >
                  {modalMode === 'ADD' ? 'حفظ السجل' : 'تحديث السجل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
