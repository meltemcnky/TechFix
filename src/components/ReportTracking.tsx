import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  Calendar, 
  MessageSquare, 
  FileText, 
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  Image as ImageIcon
} from 'lucide-react';
import { ActiveTab, Report, ReportStatus, CATEGORY_LABELS_TR, STATUS_LABELS_TR } from '../types';
import { getReportByTrackingCode, getReports } from '../services/storage';

interface ReportTrackingProps {
  setActiveTab: (tab: ActiveTab) => void;
  initialTrackingCode?: string;
}

const LIFECYCLE_STEPS: { status: ReportStatus; label: string; desc: string }[] = [
  { status: 'New', label: 'Bildirim Alındı', desc: 'Sisteme kaydedildi' },
  { status: 'Under Review', label: 'İnceleniyor', desc: 'Yönetici değerlendirmesi' },
  { status: 'Assigned', label: 'Atandı', desc: 'Teknisyen atandı' },
  { status: 'In Progress', label: 'İşlemde', desc: 'Bakım devam ediyor' },
  { status: 'Resolved', label: 'Çözüldü', desc: 'Sorun giderildi' },
  { status: 'Archived', label: 'Arşivlendi', desc: 'Kapatıldı ve saklandı' },
];

export const ReportTracking: React.FC<ReportTrackingProps> = ({
  setActiveTab,
  initialTrackingCode = '',
}) => {
  const [searchInput, setSearchInput] = useState<string>(initialTrackingCode);
  const [searchedReport, setSearchedReport] = useState<Report | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  useEffect(() => {
    if (initialTrackingCode) {
      handleSearch(initialTrackingCode);
    }
  }, [initialTrackingCode]);

  const handleSearch = (codeToSearch?: string) => {
    const query = codeToSearch !== undefined ? codeToSearch : searchInput;
    if (!query.trim()) return;

    const report = getReportByTrackingCode(query.trim());
    setSearchedReport(report || null);
    setHasSearched(true);
  };

  const sampleRecentCodes = getReports().slice(0, 3);

  const getStepStatusIndex = (status: ReportStatus) => {
    switch (status) {
      case 'New': return 0;
      case 'Under Review': return 1;
      case 'Assigned': return 2;
      case 'In Progress': return 3;
      case 'Resolved': return 4;
      case 'Archived': return 5;
      default: return 0;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in py-4">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('welcome')}
          className="flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Ana Sayfaya Dön</span>
        </button>

        <span className="text-xs text-slate-400 font-mono">Salt Okunur Takip Arayüzü</span>
      </div>

      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Arıza Durumu Takibi</h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Canlı durumu görüntülemek için benzersiz takip kodunuzu girin (ör. <code className="text-brand-300 font-mono">TFX-2026-000153</code>)
        </p>
      </div>

      {/* Search Bar Input */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-700 shadow-xl">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
          className="flex flex-col sm:flex-row items-center gap-3"
        >
          <div className="relative flex-1 w-full">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Takip kodunu girin (TFX-2026-XXXXXX)..."
              className="w-full bg-slate-900 border border-slate-700 text-white font-mono text-sm rounded-xl pl-11 pr-4 py-3 focus:border-brand-500 focus:outline-none placeholder:font-sans placeholder:text-slate-600"
            />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-3 rounded-xl gradient-accent text-white text-xs font-bold shadow-glow-brand hover:opacity-95 transition-all flex items-center justify-center space-x-2"
          >
            <span>Durumu Kontrol Et</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick sample chips for easy demo testing */}
        {sampleRecentCodes.length > 0 && !hasSearched && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500 text-[11px]">Örnek kodları deneyin:</span>
            {sampleRecentCodes.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setSearchInput(r.trackingCode);
                  handleSearch(r.trackingCode);
                }}
                className="px-2.5 py-1 bg-slate-900 border border-slate-800 text-brand-300 font-mono rounded-lg hover:border-brand-500/50 text-[11px] transition-colors"
              >
                {r.trackingCode} ({CATEGORY_LABELS_TR[r.category] || r.category})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search Result Output */}
      {hasSearched && (
        <>
          {searchedReport ? (
            <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-8 animate-fade-in">
              
              {/* Report Header summary */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xl font-bold text-white">{searchedReport.trackingCode}</span>
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-full status-badge-${
                      searchedReport.status === 'New' ? 'new' :
                      searchedReport.status === 'Under Review' ? 'review' :
                      searchedReport.status === 'Assigned' ? 'assigned' :
                      searchedReport.status === 'In Progress' ? 'progress' :
                      searchedReport.status === 'Resolved' ? 'resolved' : 'archived'
                    }`}>
                      {STATUS_LABELS_TR[searchedReport.status] || searchedReport.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 flex items-center space-x-2">
                    <Building2 className="w-3.5 h-3.5 text-brand-400" />
                    <span>{searchedReport.companyName} ({searchedReport.building}, {searchedReport.floor}, Oda {searchedReport.officeNumber})</span>
                  </p>
                </div>

                <div className="text-left sm:text-right text-xs text-slate-400 space-y-1">
                  <p className="flex items-center sm:justify-end space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Gönderilme: {new Date(searchedReport.submissionDate).toLocaleDateString('tr-TR')}</span>
                  </p>
                  {searchedReport.resolutionDate && (
                    <p className="text-emerald-400 font-medium">
                      Çözülme: {new Date(searchedReport.resolutionDate).toLocaleDateString('tr-TR')}
                    </p>
                  )}
                </div>
              </div>

              {/* Status Timeline Stepper */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Yaşam Döngüsü İlerleme Çizelgesi
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {LIFECYCLE_STEPS.map((step, idx) => {
                    const currentIdx = getStepStatusIndex(searchedReport.status);
                    const isCompleted = idx <= currentIdx;
                    const isCurrent = idx === currentIdx;

                    return (
                      <div
                        key={step.status}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          isCurrent
                            ? 'bg-brand-500/20 border-brand-500 text-white shadow-glow-brand'
                            : isCompleted
                            ? 'bg-slate-900/80 border-slate-700 text-slate-200'
                            : 'bg-slate-900/30 border-slate-800/50 text-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-center mb-1.5">
                          {isCompleted ? (
                            <CheckCircle2 className={`w-4 h-4 ${isCurrent ? 'text-brand-400' : 'text-emerald-400'}`} />
                          ) : (
                            <Clock className="w-4 h-4 text-slate-600" />
                          )}
                        </div>
                        <p className="text-[11px] font-bold truncate">{step.label}</p>
                        <p className="text-[9px] text-slate-400 mt-0.5">{step.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Public Resolution / Admin Updates Section */}
              {searchedReport.publicNotes && (
                <div className="p-4 rounded-2xl bg-brand-500/10 border border-brand-500/30 text-brand-200 space-y-2">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="w-4 h-4 text-brand-400" />
                    <span className="text-xs font-bold text-brand-300">Bina Bakım Notu</span>
                  </div>
                  <p className="text-xs leading-relaxed">{searchedReport.publicNotes}</p>
                </div>
              )}

              {/* Report Category & Description */}
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">Arıza Kategorisi:</span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 text-xs font-bold">
                      {CATEGORY_LABELS_TR[searchedReport.category] || searchedReport.category}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block mb-1">Arıza Açıklaması:</span>
                    <p className="text-xs text-slate-200 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                      {searchedReport.description}
                    </p>
                  </div>
                </div>

                {/* Photos if attached */}
                {searchedReport.photos && searchedReport.photos.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-400 flex items-center space-x-1">
                      <ImageIcon className="w-3.5 h-3.5 text-brand-400" />
                      <span>Ekli Fotoğraflar ({searchedReport.photos.length})</span>
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {searchedReport.photos.map((photo, i) => (
                        <div key={i} className="aspect-video bg-slate-900 rounded-xl overflow-hidden border border-slate-800">
                          <img src={photo} alt="Arıza Eki" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Timeline events log */}
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Durum Değişiklik Geçmişi
                </h4>
                <div className="space-y-2">
                  {searchedReport.timeline.map((event) => (
                    <div key={event.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs flex items-start justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white">{STATUS_LABELS_TR[event.status] || event.status}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                            İşlem: {event.actor === 'User' ? 'Kullanıcı' : event.actor === 'Administrator' ? 'Yönetici' : event.actor}
                          </span>
                        </div>
                        {event.note && <p className="text-slate-400 text-[11px]">{event.note}</p>}
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {new Date(event.date).toLocaleString('tr-TR')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            <div className="glass-panel p-8 rounded-3xl border border-slate-800 text-center space-y-3 animate-fade-in">
              <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
              <h3 className="text-lg font-bold text-white">Takip Kodu Bulunamadı</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                <code className="text-rose-300 font-mono">{searchInput}</code> koduyla eşleşen bir bildirim bulunamadı. Lütfen takip kodu formatını kontrol edin (ör. TFX-2026-XXXXXX).
              </p>
            </div>
          )}
        </>
      )}

    </div>
  );
};
