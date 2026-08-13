import React, { useState } from 'react';
import { 
  Gauge, 
  Search, 
  Filter, 
  Download, 
  Zap, 
  Flame, 
  Building2, 
  Calendar, 
  X, 
  ZoomIn,
  Eye,
  FileSpreadsheet
} from 'lucide-react';
import { ActiveTab, MeterRecord } from '../types';
import { getCompanies, getMeterRecords } from '../services/storage';

interface AdminMeterManagementProps {
  setActiveTab: (tab: ActiveTab) => void;
}

export const AdminMeterManagement: React.FC<AdminMeterManagementProps> = ({ setActiveTab }) => {
  const records = getMeterRecords();

  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [activePhoto, setActivePhoto] = useState<string | null>(null);

  const filteredRecords = records.filter(r => {
    if (companyFilter !== 'all' && r.companyId !== companyFilter) return false;
    if (typeFilter !== 'all' && r.meterType !== typeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchComp = r.companyName.toLowerCase().includes(q);
      const matchType = r.meterType.toLowerCase().includes(q);
      const matchNotes = (r.notes || '').toLowerCase().includes(q);
      if (!matchComp && !matchType && !matchNotes) return false;
    }
    return true;
  });

  const handleDownloadImage = (record: MeterRecord) => {
    const link = document.createElement('a');
    link.href = record.photoUrl;
    link.download = `Sayac_Okuma_${record.companyName.replace(/\s+/g, '_')}_${record.meterType}_${record.uploadDate.slice(0,10)}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-6 animate-fade-in py-4">
      
      {/* Lightbox Modal */}
      {activePhoto && (
        <div 
          className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setActivePhoto(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh] bg-slate-900 rounded-2xl p-2">
            <img src={activePhoto} alt="Sayaç Okuma Tam Görüntü" className="max-w-full max-h-[80vh] object-contain rounded-xl" />
            <button
              onClick={() => setActivePhoto(null)}
              className="absolute top-4 right-4 p-2 bg-slate-800 text-white rounded-full hover:bg-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Yönetici Sayaç Yönetimi</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/30">
              PRD Bölüm 3.22
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Yüklenen elektrik ve doğalgaz sayaç fotoğraflarını, sayısal değerleri ve şirket tüketim geçmişini inceleyin.
          </p>
        </div>

        <button
          onClick={() => setActiveTab('meter-upload')}
          className="px-4 py-2.5 rounded-xl gradient-accent text-white text-xs font-bold shadow-glow-brand transition-all flex items-center space-x-2"
        >
          <Gauge className="w-4 h-4" />
          <span>Yeni Sayaç Yükle</span>
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
        
        {/* Keyword search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Şirket, not ara..."
            className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl pl-9 pr-3 py-2.5 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        {/* Company filter */}
        <select
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:border-emerald-500 focus:outline-none"
        >
          <option value="all">Tüm Şirketler</option>
          {getCompanies().map(c => <option key={c.id} value={c.id}>{c.name} ({c.building} — {c.floor} — {c.officeNumber})</option>)}
        </select>

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:border-emerald-500 focus:outline-none"
        >
          <option value="all">Tüm Sayaç Türleri</option>
          <option value="Electricity">Elektrik</option>
          <option value="Natural Gas">Doğalgaz</option>
        </select>

      </div>

      {/* Meter Records Grid (PRD 4.18) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRecords.length === 0 ? (
          <div className="col-span-full glass-panel p-12 text-center text-slate-500 rounded-3xl">
            Filtrelerinizle eşleşen sayaç kaydı bulunamadı.
          </div>
        ) : (
          filteredRecords.map((record) => (
            <div key={record.id} className="glass-panel rounded-3xl border border-slate-800 overflow-hidden space-y-4 hover:border-emerald-500/50 transition-all group">
              
              {/* Photo Preview Container */}
              <div 
                className="relative aspect-video bg-slate-900 cursor-pointer overflow-hidden"
                onClick={() => setActivePhoto(record.photoUrl)}
              >
                <img src={record.photoUrl} alt="Sayaç Okuma" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <ZoomIn className="w-6 h-6 text-white" />
                </div>
                <div className="absolute top-3 left-3">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center space-x-1 ${
                    record.meterType === 'Electricity' ? 'bg-amber-500/90 text-white' : 'bg-rose-600/90 text-white'
                  }`}>
                    {record.meterType === 'Electricity' ? <Zap className="w-3 h-3" /> : <Flame className="w-3 h-3" />}
                    <span>{record.meterType === 'Electricity' ? 'Elektrik' : 'Doğalgaz'}</span>
                  </span>
                </div>
              </div>

              {/* Record Content Info */}
              <div className="p-5 pt-0 space-y-3">
                <div>
                  <h4 className="font-bold text-white text-sm">{record.companyName}</h4>
                  <p className="text-[11px] text-slate-400">{record.building} • {record.floor}</p>
                </div>

                {record.readingValue !== undefined && (
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">Kayıtlı Okuma:</span>
                    <span className="font-mono text-emerald-400 font-extrabold text-sm">
                      {record.readingValue} {record.meterType === 'Electricity' ? 'kWh' : 'm³'}
                    </span>
                  </div>
                )}

                {record.notes && (
                  <p className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 line-clamp-2">
                    {record.notes}
                  </p>
                )}

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-800">
                  <span>{new Date(record.uploadDate).toLocaleDateString('tr-TR')}</span>
                  <button
                    onClick={() => handleDownloadImage(record)}
                    className="text-brand-400 font-semibold hover:underline flex items-center space-x-1"
                  >
                    <Download className="w-3 h-3" />
                    <span>Fotoğrafı İndir</span>
                  </button>
                </div>
              </div>

            </div>
          ))
        )}
      </div>

    </div>
  );
};
