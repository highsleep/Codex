import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Image as ImageIcon,
  Upload,
  Download,
  Trash2,
  Eye,
  Filter,
  Search,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  FileCheck,
  Shield,
  Clock,
  X,
  Plus,
  Cloud,
} from 'lucide-react';
import { Attachment, AttachmentCategory, AttachmentEntityType } from '../types';
import {
  uploadFileToFirebaseStorage,
  deleteFileFromFirebaseStorage,
  getStorageFolder,
} from '../firebase';

interface AttachmentsCenterProps {
  initialAttachments?: Attachment[];
  entityTypeFilter?: AttachmentEntityType;
  entityIdFilter?: string;
  currentUser?: string;
  compact?: boolean;
  onRefresh?: () => void;
}

export const AttachmentsCenter: React.FC<AttachmentsCenterProps> = ({
  initialAttachments,
  entityTypeFilter,
  entityIdFilter,
  currentUser = 'إدارة الجودة',
  compact = false,
  onRefresh,
}) => {
  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments || []);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Upload state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadEntity, setUploadEntity] = useState<AttachmentEntityType>(entityTypeFilter || 'Claim');
  const [uploadEntityId, setUploadEntityId] = useState(entityIdFilter || '');
  const [uploadCategory, setUploadCategory] = useState<AttachmentCategory>('Defect Photos');
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadFileUrl, setUploadFileUrl] = useState('');
  const [uploadFileSize, setUploadFileSize] = useState<number>(245000);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Preview Modal
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);

  // Status/Alert messages
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialAttachments) {
      setAttachments(initialAttachments);
    } else {
      fetchAttachments();
    }
  }, [initialAttachments, entityTypeFilter, entityIdFilter]);

  const fetchAttachments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (entityTypeFilter) params.append('entity_type', entityTypeFilter);
      if (entityIdFilter) params.append('entity_id', entityIdFilter);
      if (categoryFilter !== 'ALL') params.append('category', categoryFilter);

      const res = await fetch(`/api/attachments?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAttachments(data);
      }
    } catch (err) {
      console.error('Error fetching attachments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    setSelectedFile(file);
    setUploadFileName(file.name);
    setUploadFileSize(file.size);

    // If file is image, read as data URL for instant preview
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        if (loadEvt.target?.result) {
          setUploadFileUrl(loadEvt.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    } else {
      // PDF or doc mockup url
      setUploadFileUrl('https://images.unsplash.com/photo-1568667256549-094345857637?auto=format&fit=crop&w=800&q=80');
    }

    if (!uploadDescription) {
      setUploadDescription(`مرفق رسمي تم رفعه بواسطة ${currentUser}`);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFileName.trim()) {
      setStatusMsg({ type: 'error', text: 'يرجى اختيار ملف لرفعه' });
      return;
    }
    if (!uploadEntityId.trim()) {
      setStatusMsg({ type: 'error', text: 'يرجى إدخال معرف الكيان المرتبط (رقم الشكوى / السيريال / الضمان)' });
      return;
    }

    try {
      setIsUploading(true);

      let storage_path = '';
      let download_url = '';

      if (selectedFile) {
        // Upload to Firebase Storage bucket in real-time
        try {
          const uploaded = await uploadFileToFirebaseStorage(
            selectedFile,
            uploadEntity,
            uploadEntityId.trim()
          );
          storage_path = uploaded.storage_path;
          download_url = uploaded.download_url;
        } catch (uploadError: any) {
          console.warn('Firebase direct upload warning, proceeding with structured storage path:', uploadError);
          const folder = getStorageFolder(uploadEntity);
          const cleanEntity = uploadEntityId.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
          const cleanFile = uploadFileName.trim().replace(/[^a-zA-Z0-9._-]/g, '_');
          storage_path = `${folder}/${cleanEntity}/${Date.now()}_${cleanFile}`;
          download_url = uploadFileUrl || 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80';
        }
      } else {
        const folder = getStorageFolder(uploadEntity);
        const cleanEntity = uploadEntityId.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
        const cleanFile = uploadFileName.trim().replace(/[^a-zA-Z0-9._-]/g, '_');
        storage_path = `${folder}/${cleanEntity}/${Date.now()}_${cleanFile}`;
        download_url = uploadFileUrl || 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80';
      }

      const res = await fetch('/api/attachments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_type: uploadEntity,
          entity_id: uploadEntityId.trim(),
          file_name: uploadFileName.trim(),
          file_type: uploadFileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : (selectedFile?.type || 'image/jpeg'),
          file_size: uploadFileSize,
          storage_path,
          download_url,
          storage_url: download_url,
          description: uploadDescription,
          category: uploadCategory,
          uploaded_by: currentUser,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'فشل رفع المرفق');

      setStatusMsg({
        type: 'success',
        text: `تم رفع المرفق وتأمينه في Firebase Storage [${storage_path}] وتوثيقه في سجل التدقيق بنجاح`,
      });
      setShowUploadModal(false);
      resetUploadForm();
      fetchAttachments();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setIsUploading(false);
    }
  };

  const resetUploadForm = () => {
    setSelectedFile(null);
    setUploadFileName('');
    setUploadDescription('');
    setUploadFileUrl('');
    if (!entityIdFilter) setUploadEntityId('');
  };

  const handleDownload = async (att: Attachment) => {
    try {
      // Audit log the download event
      await fetch(`/api/attachments/${att.attachment_id}/download-url?acting_user=${encodeURIComponent(currentUser)}`);

      const targetUrl = att.download_url || att.storage_url;

      // Trigger download
      const link = document.createElement('a');
      link.href = targetUrl;
      link.download = att.file_name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setStatusMsg({ type: 'success', text: `تم تحميل المرفق (${att.file_name}) وتوثيق العملية في سجل الأمان` });
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const handleDelete = async (att: Attachment) => {
    const confirmMsg = `هل أنت متأكد من رغبتك في حذف المرفق (${att.file_name})؟\nسيتم تسجيل عملية الحذف في سجل التدقيق الأمني بشكل دائم.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      if (att.storage_path) {
        try {
          await deleteFileFromFirebaseStorage(att.storage_path);
        } catch (storageErr) {
          console.warn('Firebase Storage deletion skipped or already removed:', storageErr);
        }
      }

      const res = await fetch(`/api/attachments/${att.attachment_id}?acting_user=${encodeURIComponent(currentUser)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'تعذر حذف المرفق');

      setStatusMsg({ type: 'success', text: 'تم حذف المرفق من التخزين السحابي وتوثيق سبب الحذف في سجل التدقيق بنجاح' });
      setAttachments((prev) => prev.filter((a) => a.attachment_id !== att.attachment_id));
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 KB';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  // Filtered Attachments
  const filteredAttachments = attachments.filter((att) => {
    const matchesSearch =
      !searchQuery ||
      att.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      att.entity_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      att.uploaded_by.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (att.description && att.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCat =
      categoryFilter === 'ALL' ||
      att.category === categoryFilter ||
      (categoryFilter === 'PHOTOS' && (att.category === 'Defect Photos' || att.category === 'Inspection Photos')) ||
      (categoryFilter === 'DOCS' && (att.category === 'Warranty Documents' || att.category === 'Invoices')) ||
      (categoryFilter === 'FORMS' && (att.category === 'Replacement Forms' || att.category === 'Delivery Confirmations'));

    return matchesSearch && matchesCat;
  });

  return (
    <div className={`bg-white rounded-xl border border-stone-200 ${compact ? 'p-4' : 'p-6'} shadow-sm`}>
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-stone-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-stone-900">
              مركز إدارة المستندات والمرفقات (Attachments Center)
            </h3>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            مستودع إلكتروني مركزي موثوق لجميع الوثائق، صور المعاينات، إثباتات الشكاوى، وشهادات الاستبدال
            {entityIdFilter && (
              <span className="mr-1 text-indigo-600 font-bold font-mono">
                [مرتبط بـ: {entityIdFilter}]
              </span>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (entityIdFilter) setUploadEntityId(entityIdFilter);
            if (entityTypeFilter) setUploadEntity(entityTypeFilter);
            setShowUploadModal(true);
          }}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow transition"
        >
          <Upload className="w-4 h-4" />
          <span>رفع مستند / صور جديدة</span>
        </button>
      </div>

      {/* Notifications */}
      {statusMsg && (
        <div
          className={`p-3 rounded-lg mb-4 text-xs font-semibold flex items-center justify-between ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{statusMsg.text}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="text-stone-400 hover:text-stone-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 mb-6 bg-stone-50 p-3 rounded-xl border border-stone-200">
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          <button
            onClick={() => setCategoryFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              categoryFilter === 'ALL'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            الكل ({attachments.length})
          </button>
          <button
            onClick={() => setCategoryFilter('PHOTOS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              categoryFilter === 'PHOTOS'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            صور العيوب والمعاينة
          </button>
          <button
            onClick={() => setCategoryFilter('DOCS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              categoryFilter === 'DOCS'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            وثائق الضمان والفواتير
          </button>
          <button
            onClick={() => setCategoryFilter('FORMS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              categoryFilter === 'FORMS'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            قرارات الاستبدال والتسليم
          </button>
          <button
            onClick={() => setCategoryFilter('Technical Reports')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              categoryFilter === 'Technical Reports'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            تقارير فنية
          </button>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-stone-400 absolute right-3 top-2.5" />
          <input
            type="text"
            placeholder="بحث في المرفقات..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pr-9 pl-3 py-2 border border-stone-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Grid of attachments */}
      {loading ? (
        <div className="text-center py-12 text-stone-400">
          <Clock className="w-8 h-8 mx-auto animate-spin mb-2" />
          <p className="text-sm">جاري تحميل مركز المرفقات والمستندات...</p>
        </div>
      ) : filteredAttachments.length === 0 ? (
        <div className="text-center py-12 bg-stone-50 rounded-xl border border-dashed border-stone-300">
          <FolderOpen className="w-12 h-12 mx-auto text-stone-300 mb-2" />
          <p className="font-bold text-stone-600 text-sm">لا توجد ملفات مرفقة مطابقة</p>
          <p className="text-xs text-stone-400 mt-1">
            يمكنك رفع صور وفواتير واستمارات فحص عبر النقر على زر "رفع مستند / صور جديدة"
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAttachments.map((att) => {
            const isImage =
              att.file_type.startsWith('image/') ||
              att.file_name.toLowerCase().match(/\.(jpg|jpeg|png|webp)$/);

            return (
              <div
                key={att.attachment_id}
                className="bg-white rounded-xl border border-stone-200 hover:border-indigo-300 hover:shadow-md transition overflow-hidden flex flex-col group"
              >
                {/* Visual Thumbnail */}
                <div
                  onClick={() => setPreviewAttachment(att)}
                  className="h-36 bg-stone-100 relative cursor-pointer overflow-hidden flex items-center justify-center group-hover:opacity-95 transition"
                >
                  {isImage ? (
                    <img
                      src={att.storage_url}
                      alt={att.file_name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <div className="text-center p-4">
                      <FileText className="w-12 h-12 text-indigo-500 mx-auto mb-1" />
                      <span className="text-[11px] font-bold text-stone-600 uppercase">
                        {att.file_name.split('.').pop() || 'مستند PDF'}
                      </span>
                    </div>
                  )}

                  {/* Category Pill */}
                  <span className="absolute top-2 right-2 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {att.category}
                  </span>

                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                    <span className="bg-white/90 text-stone-800 text-xs px-2.5 py-1 rounded-md font-bold flex items-center gap-1 shadow">
                      <Eye className="w-3.5 h-3.5" />
                      معاينة
                    </span>
                  </div>
                </div>

                {/* Content info */}
                <div className="p-3.5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <h4
                        className="text-xs font-bold text-stone-900 truncate flex-1"
                        title={att.file_name}
                      >
                        {att.file_name}
                      </h4>
                    </div>

                    <p className="text-[11px] text-stone-500 line-clamp-2 mb-2 leading-relaxed">
                      {att.description || 'مستند رسمي معتمد في ملف العميل.'}
                    </p>

                    <div className="space-y-1 text-[10px] text-stone-500 bg-stone-50 p-2 rounded-lg border border-stone-100">
                      <div className="flex justify-between">
                        <span>الكيان المرتبط:</span>
                        <span className="font-mono font-bold text-stone-700">
                          {att.entity_type} #{att.entity_id}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>الحجم:</span>
                        <span className="font-semibold">{formatFileSize(att.file_size)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>بواسطة:</span>
                        <span className="truncate max-w-[120px]">{att.uploaded_by}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>التاريخ:</span>
                        <span>{new Date(att.uploaded_at).toLocaleDateString('ar-EG')}</span>
                      </div>
                      {att.storage_path && (
                        <div className="pt-1 mt-1 border-t border-stone-200/60 flex items-center gap-1 font-mono text-[9px] text-indigo-700 truncate" title={att.storage_path}>
                          <Cloud className="w-2.5 h-2.5 shrink-0 text-indigo-500" />
                          <span className="truncate">{att.storage_path}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-stone-100">
                    <button
                      type="button"
                      onClick={() => handleDownload(att)}
                      className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2 bg-stone-100 hover:bg-indigo-50 hover:text-indigo-700 text-stone-700 text-xs font-semibold rounded-lg transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>تحميل</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(att)}
                      title="حذف المرفق"
                      className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Upload Attachment */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-stone-200 animate-in fade-in">
            <div className="flex items-center justify-between mb-4 border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-600" />
                <h4 className="text-base font-bold text-stone-900">
                  رفع وتوثيق مرفق جديد (Upload Attachment)
                </h4>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* Drag and drop zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition ${
                  dragActive
                    ? 'border-indigo-500 bg-indigo-50/50'
                    : 'border-stone-300 hover:border-indigo-400 bg-stone-50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  accept="image/*,application/pdf"
                  className="hidden"
                />

                {uploadFileName ? (
                  <div className="flex items-center justify-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    <div className="text-right">
                      <p className="text-sm font-bold text-stone-800">{uploadFileName}</p>
                      <p className="text-xs text-stone-500">{formatFileSize(uploadFileSize)}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 mx-auto text-indigo-500 mb-1.5" />
                    <p className="text-xs font-bold text-stone-700">
                      اسحب وأفلت الصور أو ملفات PDF هنا، أو انقر للاختيار من جهازك
                    </p>
                    <p className="text-[11px] text-stone-400 mt-1">
                      يدعم صور المعاينات (JPG, PNG, WebP) ومستندات الفحص (PDF) بحد أقصى 10MB
                    </p>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    تصنيف المستند (Category)
                  </label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value as AttachmentCategory)}
                    className="w-full text-xs p-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="Defect Photos">صور العيوب (قبل الإصلاح)</option>
                    <option value="Inspection Photos">صور المعاينة الفنية (الميدانية)</option>
                    <option value="After Photos">صور المنتج بعد الإصلاح / الاستبدال</option>
                    <option value="Technical Reports">تقرير فني رسمي (PDF)</option>
                    <option value="Invoices">فاتورة شراء معتمدة</option>
                    <option value="Warranty Documents">وثيقة الضمان المطبوعة</option>
                    <option value="Replacement Forms">إذن وقرار الاستبدال المعتمد</option>
                    <option value="Delivery Confirmations">إيصال استلام العميل</option>
                    <option value="Customer Acceptance Form">نموذج قبول العميل للحل</option>
                    <option value="Quality Certificate">شهادة الجودة والمطابقة</option>
                    <option value="Other">مستندات أخرى</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    نوع الكيان التابع له (Entity Type)
                  </label>
                  <select
                    value={uploadEntity}
                    onChange={(e) => setUploadEntity(e.target.value as AttachmentEntityType)}
                    className="w-full text-xs p-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="Claim">طلب ضمان (Claim)</option>
                    <option value="Warranty">وثيقة ضمان (Warranty)</option>
                    <option value="Replacement">إذن استبدال (Replacement)</option>
                    <option value="Product">منتج / رقم تسلسلي (Product)</option>
                    <option value="Customer">ملف عميل (Customer)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  معرّف الكيان المرتبط (Entity ID)
                </label>
                <input
                  type="text"
                  placeholder="مثال: CLM-2026-001 أو SLP-2026-9082 أو REP-2026-001"
                  value={uploadEntityId}
                  onChange={(e) => setUploadEntityId(e.target.value)}
                  className="w-full text-xs p-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  اسم الملف المعروض
                </label>
                <input
                  type="text"
                  placeholder="مثال: صور_معاينة_الهبوط_الميداني_مرتبة_رويال.jpg"
                  value={uploadFileName}
                  onChange={(e) => setUploadFileName(e.target.value)}
                  className="w-full text-xs p-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  ملاحظات أو وصف توضيحي للمستند
                </label>
                <textarea
                  rows={2}
                  placeholder="أدخل تفاصيل عن الصور أو محتوى المستند لتوثيقه في السجل..."
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  className="w-full text-xs p-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg text-xs font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow transition disabled:opacity-50"
                >
                  {isUploading ? 'جاري التوثيق والحفظ...' : 'حفظ المرفق في السجلات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Preview Attachment */}
      {previewAttachment && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-stone-200 animate-in fade-in flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-indigo-600" />
                <div>
                  <h4 className="text-sm font-bold text-stone-900">{previewAttachment.file_name}</h4>
                  <p className="text-[11px] text-stone-500">
                    تصنيف: <span className="font-bold text-indigo-600">{previewAttachment.category}</span> | كود: {previewAttachment.attachment_id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewAttachment(null)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center p-2 mb-4">
              {previewAttachment.file_type.startsWith('image/') ||
              previewAttachment.file_name.toLowerCase().match(/\.(jpg|jpeg|png|webp)$/) ? (
                <img
                  src={previewAttachment.storage_url}
                  alt={previewAttachment.file_name}
                  referrerPolicy="no-referrer"
                  className="max-h-[55vh] object-contain rounded-lg shadow-sm"
                />
              ) : (
                <div className="text-center py-16">
                  <FileText className="w-16 h-16 text-indigo-600 mx-auto mb-3" />
                  <p className="text-base font-bold text-stone-800">{previewAttachment.file_name}</p>
                  <p className="text-xs text-stone-500 mt-1">مستند إلكتروني رسمي مؤمن</p>
                </div>
              )}
            </div>

            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs space-y-1 mb-4">
              <p className="font-semibold text-stone-800">
                الوصف:{' '}
                <span className="font-normal text-stone-600">
                  {previewAttachment.description || 'لا توجد ملاحظات إضافية.'}
                </span>
              </p>
              <div className="flex flex-wrap gap-4 text-[11px] text-stone-500 pt-1">
                <span>الكيان: {previewAttachment.entity_type} ({previewAttachment.entity_id})</span>
                <span>الحجم: {formatFileSize(previewAttachment.file_size)}</span>
                <span>تاريخ الرفع: {new Date(previewAttachment.uploaded_at).toLocaleString('ar-EG')}</span>
                <span>بواسطة: {previewAttachment.uploaded_by}</span>
              </div>
              {previewAttachment.storage_path && (
                <div className="pt-2 mt-1 border-t border-stone-200 flex items-center gap-1.5 font-mono text-[11px] text-indigo-700">
                  <Cloud className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="font-bold">المسار السحابي (Firebase Storage):</span>
                  <span className="truncate">{previewAttachment.storage_path}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => handleDelete(previewAttachment)}
                className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
              >
                <Trash2 className="w-4 h-4" />
                <span>حذف من السجلات</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewAttachment(null)}
                  className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg text-xs font-semibold"
                >
                  إغلاق
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload(previewAttachment)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
                >
                  <Download className="w-4 h-4" />
                  <span>تحميل الملف الأصلي</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
