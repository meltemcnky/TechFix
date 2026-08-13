import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Upload, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  Zap, 
  Wifi, 
  Droplet, 
  Wind, 
  ShieldAlert, 
  Sparkles, 
  HelpCircle, 
  ArrowLeft, 
  Image as ImageIcon,
  MessageSquare,
  FileText
} from 'lucide-react';
import { ActiveTab, CategoryType, Company, Report } from '../types';
import { getCompanies, checkDuplicateReport, createReport } from '../services/storage';
import { compressImageFile } from '../utils/imageCompressor';
import { STATUS_LABELS_TR, CATEGORY_LABELS_TR } from '../types';

interface CreateReportFormProps {
  setActiveTab: (tab: ActiveTab) => void;
  preselectedCompany?: Company | null;
  onReportCreated: (report: Report) => void;
}

const CATEGORY_ITEMS: { type: CategoryType; label: string; icon: React.ReactNode; color: string }[] = [
  { type: 'Air Conditioning', label: 'Klima', icon: <Wind className="w-5 h-5" />, color: 'text-sky-400 bg-sky-500/10' },
  { type: 'Electrical', label: 'Elektrik Arızası', icon: <Zap className="w-5 h-5" />, color: 'text-amber-400 bg-amber-500/10' },
  { type: 'Internet / Network', label: 'İnternet / Ağ', icon: <Wifi className="w-5 h-5" />, color: 'text-indigo-400 bg-indigo-500/10' },
  { type: 'Water & Plumbing', label: 'Su ve Tesisat', icon: <Droplet className="w-5 h-5" />, color: 'text-blue-400 bg-blue-500/10' },
  { type: 'Elevator', label: 'Asansör', icon: <Sparkles className="w-5 h-5" />, color: 'text-purple-400 bg-purple-500/10' },
  { type: 'Cleaning', label: 'Temizlik Hizmeti', icon: <Sparkles className="w-5 h-5" />, color: 'text-emerald-400 bg-emerald-500/10' },
  { type: 'Security', label: 'Güvenlik Talebi', icon: <ShieldAlert className="w-5 h-5" />, color: 'text-rose-400 bg-rose-500/10' },
  { type: 'Common Areas', label: 'Ortak Alanlar', icon: <Building2 className="w-5 h-5" />, color: 'text-teal-400 bg-teal-500/10' },
  { type: 'Equipment', label: 'Ekipman Tamiri', icon: <FileText className="w-5 h-5" />, color: 'text-amber-300 bg-amber-400/10' },
  { type: 'Suggestion', label: 'Öneri', icon: <MessageSquare className="w-5 h-5" />, color: 'text-blue-300 bg-blue-400/10' },
  { type: 'Request', label: 'Genel Talep', icon: <FileText className="w-5 h-5" />, color: 'text-slate-300 bg-slate-400/10' },
  { type: 'Other', label: 'Diğer', icon: <HelpCircle className="w-5 h-5" />, color: 'text-slate-400 bg-slate-500/10' },
];

export const CreateReportForm: React.FC<CreateReportFormProps> = ({
  setActiveTab,
  preselectedCompany,
  onReportCreated,
}) => {
  const companies = getCompanies();

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(
    preselectedCompany ? preselectedCompany.id : companies[0].id
  );
  const [category, setCategory] = useState<CategoryType>('Air Conditioning');
  const [description, setDescription] = useState<string>('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Duplicate warning state
  const [duplicateReport, setDuplicateReport] = useState<Report | null>(null);

  // Re-check duplicate whenever company or category changes
  useEffect(() => {
    if (selectedCompanyId && category) {
      const existing = checkDuplicateReport(selectedCompanyId, category);
      setDuplicateReport(existing);
    } else {
      setDuplicateReport(null);
    }
  }, [selectedCompanyId, category]);

  const selectedCompany = companies.find(c => c.id === selectedCompanyId) || companies[0];

  // Handle Photo Upload (Convert file to compressed Base64 Data URL)
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setErrorMsg(null);

    for (const file of Array.from(files)) {
      if (!file.type.match('image.*')) {
        setErrorMsg('Lütfen geçerli bir görsel dosyası seçin (JPG, PNG, WEBP).');
        continue;
      }

      try {
        const compressedBase64 = await compressImageFile(file);
        setPhotos(prev => [...prev, compressedBase64]);
      } catch (err: any) {
        setErrorMsg(err.message || 'Yüklenen görsel işlenirken hata oluştu.');
      }
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Form Validations (PRD Section 3.6 & 7.4)
    if (!selectedCompanyId) {
      setErrorMsg('Lütfen şirket konumunuzu seçin.');
      return;
    }
    if (!category) {
      setErrorMsg('Lütfen bir arıza kategorisi seçin.');
      return;
    }
    if (!description.trim() || description.trim().length < 5) {
      setErrorMsg('Lütfen detaylı bir arıza açıklaması girin (en az 5 karakter).');
      return;
    }

    setIsSubmitting(true);

    try {
      const newReport = createReport({
        companyId: selectedCompanyId,
        category,
        description: description.trim(),
        photos
      });

      onReportCreated(newReport);
      setActiveTab('success');
    } catch (err) {
      setErrorMsg('Bildiriminiz gönderilirken beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in py-4">
      
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('welcome')}
          className="flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Ana Sayfaya Dön</span>
        </button>

        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-brand-500/10 text-brand-400 text-xs font-medium">
          <Building2 className="w-3.5 h-3.5" />
          <span>Medeniyet Teknopark Dijital Form</span>
        </div>
      </div>

      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Arıza Bildirimi Oluştur</h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Hesap oluşturmanız gerekmez. Bina yönetim ekibini bilgilendirmek için lütfen arıza detaylarını girin.
        </p>
      </div>

      {/* Duplicate Warning Banner (Rule 9) */}
      {duplicateReport && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex items-start space-x-3 animate-fade-in">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-amber-300">Olası Mükerrer Bildirim Uyarısı</p>
            <p>
              <strong>{duplicateReport.companyName}</strong> için <strong>{CATEGORY_LABELS_TR[duplicateReport.category] || duplicateReport.category}</strong> kategorisinde yakın zamanda bir bildirim gönderilmiş. Takip kodu: <span className="font-mono bg-amber-950 px-1.5 py-0.5 rounded text-amber-300">{duplicateReport.trackingCode}</span> (Durum: {STATUS_LABELS_TR[duplicateReport.status] || duplicateReport.status}).
            </p>
            <p className="text-[11px] text-amber-400/80">
              Farklı bir sorunsa yine de gönderebilir veya mevcut takip kodunu kullanabilirsiniz.
            </p>
          </div>
        </div>
      )}

      {/* Error Message Alert */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 flex items-center space-x-3 animate-fade-in">
          <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span className="text-xs font-semibold">{errorMsg}</span>
        </div>
      )}

      {/* Main Form Card */}
      <form onSubmit={handleSubmit} className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-8">
        
        {/* Step 1: Location Selector */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
            <span className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-[10px]">1</span>
            <span>Şirket / Ofis Konumu Seçin</span>
          </label>

          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-sm rounded-xl px-4 py-3 focus:border-brand-500 focus:outline-none transition-colors"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.building}, {c.floor}, Ofis {c.officeNumber}
              </option>
            ))}
          </select>

          {selectedCompany && (
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-slate-300">{selectedCompany.name}</span>
              <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-[11px] text-brand-300">
                {selectedCompany.building} • {selectedCompany.floor} • Oda {selectedCompany.officeNumber}
              </span>
            </div>
          )}
        </div>

        {/* Step 2: Issue Category Picker */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
            <span className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-[10px]">2</span>
            <span>Arıza Kategorisi Seçin</span>
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {CATEGORY_ITEMS.map((item) => {
              const isSelected = category === item.type;
              return (
                <button
                  type="button"
                  key={item.type}
                  onClick={() => setCategory(item.type)}
                  className={`p-3 rounded-xl border text-left flex flex-col items-start justify-between space-y-2 transition-all ${
                    isSelected
                      ? 'bg-brand-500/20 border-brand-500 shadow-glow-brand ring-1 ring-brand-500'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${item.color}`}>
                    {item.icon}
                  </div>
                  <span className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 3: Issue Description */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-[10px]">3</span>
              <span>Arıza Açıklaması</span>
            </label>
            <span className="text-[11px] text-slate-500">{description.length} / 500 karakter</span>
          </div>

          <textarea
            rows={4}
            maxLength={500}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Lütfen sorunu açıkça tanımlayın (ör. 'Sunucu odasındaki klima soğutma yapmıyor', 'Lavabonun yanında su sızıntısı var' vb.)..."
            className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-sm rounded-xl p-4 focus:border-brand-500 focus:outline-none transition-colors placeholder:text-slate-600"
            required
          />
        </div>

        {/* Step 4: Optional Photo Upload (PRD Section 3.5) */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-[10px]">4</span>
              <span>Fotoğraf Yükle (İsteğe Bağlı)</span>
            </span>
            <span className="text-[10px] text-slate-400 font-normal">Formatlar: JPG, PNG, WEBP</span>
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {photos.map((photo, index) => (
              <div key={index} className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden border border-slate-700 group">
                <img src={photo} alt={`Yükleme ${index + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(index)}
                  className="absolute top-1 right-1 p-1 bg-rose-600/90 text-white rounded-full opacity-90 hover:opacity-100 transition-opacity"
                  title="Fotoğrafı kaldır"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {photos.length < 4 && (
              <label className="aspect-video bg-slate-900/60 border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors p-2 text-center group">
                <Upload className="w-5 h-5 text-slate-400 group-hover:text-brand-400 mb-1" />
                <span className="text-[11px] font-semibold text-slate-300 group-hover:text-white">Fotoğraf Ekle</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* Submit / Cancel Actions */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={() => setActiveTab('welcome')}
            className="px-5 py-3 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 text-xs font-semibold transition-all"
          >
            İptal
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 rounded-xl gradient-accent text-white text-xs font-bold shadow-glow-brand hover:opacity-95 disabled:opacity-50 transition-all flex items-center space-x-2"
          >
            {isSubmitting ? (
              <span>Gönderiliyor...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Bildirimi Gönder</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
