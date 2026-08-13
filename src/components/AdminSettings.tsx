import React from 'react';
import { 
  ShieldCheck, 
  KeyRound, 
  RotateCcw, 
  CheckCircle2, 
  Layers, 
  Lock
} from 'lucide-react';
import { ActiveTab, CATEGORY_LABELS_TR } from '../types';
import { SEED_CATEGORIES, resetSeedData } from '../services/storage';

interface AdminSettingsProps {
  setActiveTab: (tab: ActiveTab) => void;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({ setActiveTab }) => {

  const handleReset = () => {
    if (window.confirm('Sistem verilerini Teknopark başlangıç veri setine sıfırlamak istediğinizden emin misiniz?')) {
      resetSeedData();
      window.location.reload();
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in py-4">
      
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Sistem Tercihleri ve Ayarlar</h1>
        <p className="text-xs text-slate-400 mt-1">
          Yönetici güvenlik erişim parametrelerini, sistem kategorilerini ve veri seçeneklerini yönetin.
        </p>
      </div>

      {/* Security Access Status (PRD 4.11) */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Yönetici Güvenlik Politikası</h3>
            <p className="text-xs text-slate-400">SHA-256 Kriptografik Hash Doğrulama Aktif</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 text-xs text-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Kimlik Doğrulama Yöntemi:</span>
            <span className="font-mono text-emerald-400 font-bold">SHA-256 Kriptografik Hash</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Oturum Türü:</span>
            <span className="font-mono text-brand-300">Geçici İmzalı Token (sessionStorage)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Oturum Durumu:</span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[11px] flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400 inline mr-1" />
              <span>Kimlik Doğrulandı</span>
            </span>
          </div>
        </div>
      </div>

      {/* Predefined Categories Reference */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-brand-500/20 text-brand-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Arıza Kategorileri Genel Bakış</h3>
            <p className="text-xs text-slate-400">Teknopark genelinde aktif önceden tanımlı bildirim kategorileri</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {SEED_CATEGORIES.map(cat => (
            <span key={cat} className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs font-medium">
              {CATEGORY_LABELS_TR[cat] || cat}
            </span>
          ))}
        </div>
      </div>

      {/* Seed Data Controls */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-rose-900/40 bg-rose-950/10 space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-rose-200 text-base">Sistem Veri Sıfırlama</h3>
            <p className="text-xs text-rose-300/70">Sistem belleğini Medeniyet Teknopark varsayılan demo durumuna geri yükle</p>
          </div>
        </div>

        <button
          onClick={handleReset}
          className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-glow-rose transition-all flex items-center space-x-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Tüm Demo Verilerini Sıfırla</span>
        </button>
      </div>

    </div>
  );
};
