import React, { useState } from 'react';
import { ShieldCheck, Lock, X, AlertCircle, ArrowRight } from 'lucide-react';
import { loginAdmin } from '../services/authService';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [accessCode, setAccessCode] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!accessCode.trim()) {
      setErrorMsg('Lütfen yönetici erişim kodunuzu girin.');
      return;
    }

    setIsVerifying(true);

    try {
      const success = await loginAdmin(accessCode.trim());
      if (success) {
        setAccessCode('');
        onSuccess();
        onClose();
      } else {
        setErrorMsg('Geçersiz Yönetici Erişim Kodu. Erişim reddedildi.');
      }
    } catch (err) {
      setErrorMsg('Kimlik doğrulama hatası oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md glass-panel p-6 sm:p-8 rounded-3xl border border-slate-700 shadow-2xl space-y-6 relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto shadow-glow-brand">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">Yönetici Erişimi</h2>
            <p className="text-xs text-slate-400 mt-1">
              Kontrol merkezine giriş yapmak için yetkili yönetim erişim kodunuzu girin.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center space-x-2 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Erişim Kodu
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Yönetici kodunu girin..."
                className="w-full bg-slate-900 border border-slate-700 text-white font-mono text-sm rounded-xl pl-10 pr-4 py-3 focus:border-amber-500 focus:outline-none placeholder:font-sans placeholder:text-slate-600"
                autoFocus
              />
            </div>
          </div>

          <div className="pt-2 flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:text-white hover:border-slate-600"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isVerifying}
              className="flex-1 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-glow-brand transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>{isVerifying ? 'Doğrulanıyor...' : 'Yönetici Girişi'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
