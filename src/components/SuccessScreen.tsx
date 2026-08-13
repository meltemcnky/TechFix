import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  CheckCircle2, 
  Copy, 
  Check, 
  Search, 
  Home, 
  Building2, 
  Clock, 
  ShieldCheck, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { ActiveTab, Report, CATEGORY_LABELS_TR, STATUS_LABELS_TR } from '../types';

interface SuccessScreenProps {
  report: Report | null;
  setActiveTab: (tab: ActiveTab) => void;
  onSetTrackCode: (code: string) => void;
}

export const SuccessScreen: React.FC<SuccessScreenProps> = ({
  report,
  setActiveTab,
  onSetTrackCode,
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Fire festive confetti effect on mount
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {
      // fallback safe
    }
  }, []);

  if (!report) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-slate-400">Yakın zamanda gönderilmiş bir bildirim bulunamadı.</p>
        <button
          onClick={() => setActiveTab('welcome')}
          className="px-4 py-2 bg-brand-600 text-white text-xs font-semibold rounded-xl"
        >
          Ana Sayfaya Dön
        </button>
      </div>
    );
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(report.trackingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTrackReport = () => {
    onSetTrackCode(report.trackingCode);
    setActiveTab('track');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in py-6 text-center">
      
      {/* Success Icon Graphic */}
      <div className="mx-auto w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-glow-emerald animate-pulse-glow">
        <CheckCircle2 className="w-10 h-10" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl sm:text-4xl font-extrabold text-white">Bildirim Başarıyla Gönderildi!</h1>
        <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
          Bina arıza bildiriminiz Medeniyet Teknopark merkezi yönetim sistemine kaydedildi ve bina yöneticilerine iletildi.
        </p>
      </div>

      {/* Tracking Code Highlight Card */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-700 shadow-2xl space-y-6">
        <div className="space-y-1">
          <span className="text-[11px] font-bold tracking-wider uppercase text-brand-400">
            Benzersiz Takip Kodunuz
          </span>
          <p className="text-xs text-slate-400">Hesap olmadan istediğiniz zaman durumu kontrol etmek için bu kodu kaydedin veya kopyalayın</p>
        </div>

        <div className="flex items-center justify-center space-x-3 bg-slate-900/90 border border-brand-500/40 rounded-2xl p-4 shadow-inner">
          <span className="font-mono text-2xl sm:text-3xl font-extrabold tracking-wider text-white">
            {report.trackingCode}
          </span>
          <button
            onClick={handleCopyCode}
            className="p-2.5 rounded-xl bg-brand-500/20 text-brand-300 hover:bg-brand-500 hover:text-white transition-all border border-brand-500/30"
            title="Takip Kodunu Kopyala"
          >
            {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>

        {/* Report Details Summary Table */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-800 text-left text-xs">
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[10px]">Konum</span>
            <span className="font-semibold text-slate-200">{report.companyName}</span>
          </div>

          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[10px]">Kategori</span>
            <span className="font-semibold text-slate-200">{CATEGORY_LABELS_TR[report.category] || report.category}</span>
          </div>

          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
            <span className="text-slate-500 block text-[10px]">Durum</span>
            <span className="font-semibold text-sky-400">{STATUS_LABELS_TR[report.status] || report.status}</span>
          </div>
        </div>
      </div>

      {/* Primary Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={handleTrackReport}
          className="w-full sm:w-auto px-6 py-3.5 rounded-xl gradient-accent text-white font-bold text-xs shadow-glow-brand hover:opacity-95 transition-all flex items-center justify-center space-x-2"
        >
          <Search className="w-4 h-4" />
          <span>Bildirimi Canlı Takip Et</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          onClick={() => setActiveTab('welcome')}
          className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 font-semibold text-xs transition-all flex items-center justify-center space-x-2"
        >
          <Home className="w-4 h-4" />
          <span>Ana Sayfaya Dön</span>
        </button>
      </div>

    </div>
  );
};
