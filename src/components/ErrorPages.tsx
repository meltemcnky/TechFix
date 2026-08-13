import React from 'react';
import { 
  AlertTriangle, 
  WifiOff, 
  Lock, 
  FileQuestion, 
  Home, 
  RotateCcw,
  ArrowLeft
} from 'lucide-react';
import { ActiveTab } from '../types';

interface ErrorPageProps {
  type: '404' | '500' | 'offline' | 'denied';
  setActiveTab: (tab: ActiveTab) => void;
}

export const ErrorPages: React.FC<ErrorPageProps> = ({ type, setActiveTab }) => {
  const getErrorDetails = () => {
    switch (type) {
      case '404':
        return {
          icon: <FileQuestion className="w-12 h-12 text-brand-400" />,
          title: 'Sayfa Bulunamadı (404)',
          message: 'Aradığınız ekran veya kaynak mevcut değil veya taşınmış olabilir.',
          code: 'ERR_404_SAYFA_BULUNAMADI'
        };
      case '500':
        return {
          icon: <AlertTriangle className="w-12 h-12 text-rose-400" />,
          title: 'Dahili Sistem Hatası (500)',
          message: 'Bina yönetim sunucusunda beklenmeyen bir işlem hatası oluştu.',
          code: 'ERR_500_DAHILI_SUNUCU_HATASI'
        };
      case 'offline':
        return {
          icon: <WifiOff className="w-12 h-12 text-amber-400" />,
          title: 'Çevrimdışı / Bağlantı Kesildi',
          message: 'Lütfen ağ bağlantınızı kontrol edin. TechFix çevrimiçi olduğunuzda otomatik olarak yeniden bağlanacaktır.',
          code: 'ERR_CEVRIMDISI_AG_YOK'
        };
      case 'denied':
        return {
          icon: <Lock className="w-12 h-12 text-purple-400" />,
          title: 'Erişim Reddedildi',
          message: 'Kontrol merkezi modüllerine erişmek için yönetici kimlik doğrulaması gereklidir.',
          code: 'ERR_403_ERISIM_REDDEDILDI'
        };
    }
  };

  const details = getErrorDetails();

  return (
    <div className="max-w-md mx-auto py-12 text-center space-y-6 animate-fade-in">
      <div className="w-24 h-24 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto shadow-2xl">
        {details.icon}
      </div>

      <div className="space-y-2">
        <span className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-widest">
          {details.code}
        </span>
        <h1 className="text-2xl font-extrabold text-white">{details.title}</h1>
        <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
          {details.message}
        </p>
      </div>

      <div className="pt-2 flex items-center justify-center space-x-3">
        <button
          onClick={() => setActiveTab('welcome')}
          className="px-5 py-3 rounded-xl gradient-accent text-white text-xs font-bold shadow-glow-brand flex items-center space-x-2"
        >
          <Home className="w-4 h-4" />
          <span>Ana Sayfaya Dön</span>
        </button>

        <button
          onClick={() => window.location.reload()}
          className="px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center space-x-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Yenile</span>
        </button>
      </div>
    </div>
  );
};
