import React, { useState } from 'react';
import { 
  Gauge, 
  Building2, 
  Upload, 
  X, 
  CheckCircle2, 
  Zap, 
  Flame, 
  ArrowLeft, 
  FileText,
  AlertTriangle
} from 'lucide-react';
import { ActiveTab, MeterType } from '../types';
import { getCompanies, createMeterRecord } from '../services/storage';
import { compressImageFile } from '../utils/imageCompressor';

interface MeterUploadFormProps {
  setActiveTab: (tab: ActiveTab) => void;
}

export const MeterUploadForm: React.FC<MeterUploadFormProps> = ({ setActiveTab }) => {
  const companies = getCompanies();

  const [companyId, setCompanyId] = useState<string>(companies[0].id);
  const [meterType, setMeterType] = useState<MeterType>('Electricity');
  const [readingValue, setReadingValue] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match('image.*')) {
      setErrorMsg('Lütfen geçerli bir sayaç fotoğrafı seçin (JPG, PNG, WEBP).');
      return;
    }

    try {
      const compressedBase64 = await compressImageFile(file);
      setPhotoUrl(compressedBase64);
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Yüklenen sayaç görseli işlenirken hata oluştu.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!companyId) {
      setErrorMsg('Lütfen bir Teknopark şirket konumu seçin.');
      return;
    }
    if (!photoUrl) {
      setErrorMsg('Lütfen sayaç göstergesinin net bir fotoğrafını yükleyin.');
      return;
    }

    setIsSubmitting(true);

    try {
      createMeterRecord({
        companyId,
        meterType,
        photoUrl,
        readingValue: readingValue ? parseFloat(readingValue) : undefined,
        notes: notes.trim() ? notes.trim() : undefined
      });

      setSuccess(true);
    } catch (err) {
      setErrorMsg('Sayaç kaydı yüklenirken hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCompany = companies.find(c => c.id === companyId) || companies[0];

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in py-4">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('welcome')}
          className="flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Ana Sayfaya Dön</span>
        </button>

        <span className="text-xs text-emerald-400 font-semibold flex items-center space-x-1">
          <Gauge className="w-3.5 h-3.5" />
          <span>Sayaç Okuma Modülü (PRD 3.21)</span>
        </span>
      </div>

      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Sayaç Fotoğrafı Yükle</h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Yetkili personel, bina faturalama ve tüketim analizi için elektrik ve doğalgaz sayaç okumalarını yükleyebilir.
        </p>
      </div>

      {success ? (
        <div className="glass-panel p-8 rounded-3xl border border-emerald-500/40 text-center space-y-6 animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-glow-emerald">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white">Sayaç Okuma Başarıyla Gönderildi!</h3>
            <p className="text-xs text-slate-300">
              <strong>{selectedCompany.name}</strong> için {meterType === 'Electricity' ? 'Elektrik' : 'Doğalgaz'} sayaç kaydı yönetici veritabanına kaydedildi.
            </p>
          </div>

          <div className="pt-4 flex items-center justify-center space-x-3">
            <button
              onClick={() => {
                setSuccess(false);
                setPhotoUrl('');
                setReadingValue('');
                setNotes('');
              }}
              className="px-5 py-2.5 rounded-xl gradient-accent text-white text-xs font-bold shadow-glow-brand"
            >
              Başka Sayaç Yükle
            </button>
            <button
              onClick={() => setActiveTab('welcome')}
              className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:text-white"
            >
              Ana Sayfaya Dön
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
          
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 flex items-center space-x-3 text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Company Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Şirket / Konum
            </label>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-sm rounded-xl px-4 py-3 focus:border-emerald-500 focus:outline-none"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.building}, {c.floor}, Ofis {c.officeNumber}
                </option>
              ))}
            </select>
          </div>

          {/* Meter Type Radio Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Sayaç Türü
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setMeterType('Electricity')}
                className={`p-4 rounded-2xl border text-left flex items-center space-x-3 transition-all ${
                  meterType === 'Electricity'
                    ? 'bg-amber-500/20 border-amber-500 text-white shadow-glow-brand'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-xs">Elektrik Sayacı</p>
                  <p className="text-[10px] text-slate-400">kWh okuma</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMeterType('Natural Gas')}
                className={`p-4 rounded-2xl border text-left flex items-center space-x-3 transition-all ${
                  meterType === 'Natural Gas'
                    ? 'bg-rose-500/20 border-rose-500 text-white shadow-glow-rose'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-xs">Doğalgaz Sayacı</p>
                  <p className="text-[10px] text-slate-400">m³ okuma</p>
                </div>
              </button>
            </div>
          </div>

          {/* Meter Photo Upload */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
              <span>Sayaç Fotoğrafı (Zorunlu)</span>
              <span className="text-[10px] text-slate-400 font-normal">Rakamlar net görünmeli</span>
            </label>

            {photoUrl ? (
              <div className="relative aspect-video bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 group">
                <img src={photoUrl} alt="Sayaç Önizleme" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotoUrl('')}
                  className="absolute top-2 right-2 p-1.5 bg-rose-600/90 text-white rounded-full hover:bg-rose-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="aspect-video bg-slate-900/60 border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-2xl flex flex-col items-center justify-center cursor-pointer p-4 text-center transition-colors group">
                <Upload className="w-8 h-8 text-slate-400 group-hover:text-emerald-400 mb-2" />
                <span className="text-xs font-bold text-white">Sayaç Fotoğrafını Buraya Tıklayın veya Sürükleyin</span>
                <span className="text-[11px] text-slate-500 mt-1">JPG, PNG, WEBP desteklenir</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Optional Reading Value */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Sayısal Okuma Değeri (İsteğe Bağlı)
            </label>
            <input
              type="number"
              step="0.1"
              value={readingValue}
              onChange={(e) => setReadingValue(e.target.value)}
              placeholder="ör. 04892.5"
              className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-xl px-4 py-3 focus:border-emerald-500 focus:outline-none font-mono"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Notlar (İsteğe Bağlı)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="İsteğe bağlı not ekleyin (ör. üç aylık denetim notu)..."
              className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl p-3 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={() => setActiveTab('welcome')}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:text-white"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-glow-emerald transition-all"
            >
              {isSubmitting ? 'Yükleniyor...' : 'Sayaç Okumasını Gönder'}
            </button>
          </div>

        </form>
      )}

    </div>
  );
};
