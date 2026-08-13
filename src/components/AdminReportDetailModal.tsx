import React, { useState } from 'react';
import { 
  X, 
  Building2, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  ShieldCheck, 
  MessageSquare, 
  Trash2, 
  Archive, 
  Tag, 
  Image as ImageIcon,
  ZoomIn
} from 'lucide-react';
import { Report, ReportPriority, ReportStatus, VALID_STATUS_TRANSITIONS, STATUS_LABELS_TR, PRIORITY_LABELS_TR, CATEGORY_LABELS_TR } from '../types';
import { 
  updateReportStatus, 
  updateReportPriority, 
  updateReportAdminNotes, 
  deleteReport 
} from '../services/storage';

interface AdminReportDetailModalProps {
  report: Report | null;
  onClose: () => void;
  onReportUpdated: () => void;
}

const STATUS_OPTIONS: ReportStatus[] = [
  'New',
  'Under Review',
  'Assigned',
  'In Progress',
  'Resolved',
  'Archived'
];

const PRIORITY_OPTIONS: ReportPriority[] = ['Low', 'Medium', 'High', 'Critical'];

export const AdminReportDetailModal: React.FC<AdminReportDetailModalProps> = ({
  report,
  onClose,
  onReportUpdated,
}) => {
  if (!report) return null;

  const [status, setStatus] = useState<ReportStatus>(report.status);
  const [priority, setPriority] = useState<ReportPriority>(report.priority);
  const [adminNotes, setAdminNotes] = useState<string>(report.adminNotes || '');
  const [publicNotes, setPublicNotes] = useState<string>(report.publicNotes || '');
  const [activePhoto, setActivePhoto] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const allowedTransitions = VALID_STATUS_TRANSITIONS[report.status] || [];

  const handleSave = () => {
    setErrorMsg(null);
    try {
      // Update status if changed
      if (status !== report.status) {
        updateReportStatus(report.id, status, `Durum ${report.status} → ${status} olarak değiştirildi`, publicNotes);
      }
      // Update priority if changed
      if (priority !== report.priority) {
        updateReportPriority(report.id, priority);
      }
      // Update notes
      updateReportAdminNotes(report.id, adminNotes, publicNotes);

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
      onReportUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Rapor durumu güncellenirken hata oluştu.');
    }
  };

  const handleDelete = () => {
    if (window.confirm(`${report.trackingCode} numaralı raporu kalıcı olarak silmek istediğinizden emin misiniz?`)) {
      try {
        deleteReport(report.id);
        onReportUpdated();
        onClose();
      } catch (err: any) {
        setErrorMsg(err.message || 'Rapor silinirken hata oluştu.');
      }
    }
  };

  const handleArchive = () => {
    setErrorMsg(null);
    try {
      updateReportStatus(report.id, 'Archived', 'Rapor yönetici tarafından arşivlendi', undefined, true);
      onReportUpdated();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Rapor arşivlenirken hata oluştu.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      
      {/* Lightbox Zoom Modal for Images */}
      {activePhoto && (
        <div 
          className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setActivePhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl p-2 overflow-hidden">
            <img src={activePhoto} alt="Büyütülmüş arıza eki" className="max-w-full max-h-[80vh] object-contain rounded-xl" />
            <button
              onClick={() => setActivePhoto(null)}
              className="absolute top-4 right-4 p-2 bg-slate-800 text-white rounded-full hover:bg-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <div className="w-full max-w-4xl glass-panel p-6 sm:p-8 rounded-3xl border border-slate-700 shadow-2xl space-y-6 relative my-8">
        
        {/* Header Bar */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-3">
              <span className="font-mono text-2xl font-extrabold text-white">{report.trackingCode}</span>
              <span className={`px-3 py-1 rounded-full font-bold text-xs status-badge-${
                report.status === 'New' ? 'new' :
                report.status === 'Under Review' ? 'review' :
                report.status === 'Assigned' ? 'assigned' :
                report.status === 'In Progress' ? 'progress' :
                report.status === 'Resolved' ? 'resolved' : 'archived'
              }`}>
                {STATUS_LABELS_TR[report.status] || report.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center space-x-2">
              <Building2 className="w-3.5 h-3.5 text-brand-400" />
              <span>{report.companyName} ({report.building}, {report.floor}, Oda {report.officeNumber})</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Report Information */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Description */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Arıza Detayları</span>
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-slate-200 leading-relaxed">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
                  <span className="font-semibold text-slate-400">Kategori:</span>
                  <span className="font-bold text-brand-300">{CATEGORY_LABELS_TR[report.category] || report.category}</span>
                </div>
                <p>{report.description}</p>
              </div>
            </div>

            {/* Attached Photos */}
            {report.photos && report.photos.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1">
                  <ImageIcon className="w-3.5 h-3.5 text-brand-400" />
                  <span>Ekli Fotoğraflar ({report.photos.length})</span>
                </span>
                <div className="grid grid-cols-3 gap-3">
                  {report.photos.map((p, i) => (
                    <div 
                      key={i} 
                      onClick={() => setActivePhoto(p)}
                      className="aspect-video bg-slate-900 rounded-xl overflow-hidden border border-slate-800 relative group cursor-pointer"
                    >
                      <img src={p} alt="Ek" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <ZoomIn className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline Audit History */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Aktivite ve Durum Geçmişi</span>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {report.timeline.map((t) => (
                  <div key={t.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs flex items-start justify-between">
                    <div className="space-y-0.5">
                      <p className="font-bold text-white text-[11px]">{STATUS_LABELS_TR[t.status] || t.status} <span className="text-slate-500 font-normal">işlem: {t.actor === 'User' ? 'Kullanıcı' : t.actor === 'Administrator' ? 'Yönetici' : t.actor}</span></p>
                      {t.note && <p className="text-slate-400 text-[11px]">{t.note}</p>}
                    </div>
                    <span className="text-[10px] text-slate-500">{new Date(t.date).toLocaleString('tr-TR')}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: Admin Management Controls */}
          <div className="lg:col-span-5 glass-card p-5 rounded-2xl border border-slate-800 space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>Yönetici İşlem Paneli</span>
            </h3>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center space-x-2 text-xs animate-fade-in">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Update Status (PRD 3.10) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">Rapor Durumu</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ReportStatus)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs font-bold rounded-xl px-3 py-2.5 focus:border-amber-500 focus:outline-none"
              >
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS_TR[s]}</option>)}
              </select>
            </div>

            {/* Update Priority (PRD 3.12) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">Öncelik Seviyesi</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as ReportPriority)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs font-bold rounded-xl px-3 py-2.5 focus:border-amber-500 focus:outline-none"
              >
                {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{PRIORITY_LABELS_TR[p]}</option>)}
              </select>
            </div>

            {/* Private Administrator Notes (PRD 3.15) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block flex items-center justify-between">
                <span>Gizli Yönetici Notları</span>
                <span className="text-[10px] text-slate-500 font-normal">Yalnızca dahili kullanım</span>
              </label>
              <textarea
                rows={3}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="ör. Teknisyen bilgilendirildi, yedek parça bekleniyor..."
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl p-3 focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* Public Resolution Notes for User Tracking Page */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block flex items-center justify-between">
                <span>Kamuya Açık Bakım Güncellemesi</span>
                <span className="text-[10px] text-brand-400 font-normal">Takip sayfasında görünür</span>
              </label>
              <textarea
                rows={2}
                value={publicNotes}
                onChange={(e) => setPublicNotes(e.target.value)}
                placeholder="ör. Bakım ekibi 3. kata yönlendirildi..."
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl p-3 focus:border-brand-500 focus:outline-none"
              />
            </div>

            {/* Save & Secondary Actions */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <button
                onClick={handleSave}
                className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-glow-brand transition-all flex items-center justify-center space-x-2"
              >
                {isSaved ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <ShieldCheck className="w-4 h-4" />}
                <span>{isSaved ? 'Değişiklikler Kaydedildi!' : 'Yönetici Güncellemelerini Kaydet'}</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleArchive}
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white text-xs font-semibold flex items-center justify-center space-x-1 transition-all"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>Arşivle</span>
                </button>

                <button
                  onClick={handleDelete}
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 text-xs font-semibold flex items-center justify-center space-x-1 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Sil</span>
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
