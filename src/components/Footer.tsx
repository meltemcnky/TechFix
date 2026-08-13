import React from 'react';
import { Building2, Shield, Heart } from 'lucide-react';
import { ActiveTab } from '../types';

interface FooterProps {
  setActiveTab: (tab: ActiveTab) => void;
}

export const Footer: React.FC<FooterProps> = ({ setActiveTab }) => {
  return (
    <footer className="border-t border-slate-800/80 bg-[#080C14] text-slate-400 py-10 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg gradient-accent flex items-center justify-center">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg text-white">TechFix Platform</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Medeniyet Teknopark için özel olarak geliştirilmiş Akıllı Bina Arıza Yönetim Platformu. İletişimi kolaylaştırır, bakım operasyonlarını hızlandırır ve dijital arıza takibi sağlar.
            </p>
            <div className="flex items-center space-x-2 text-[11px] text-slate-500">
              <Shield className="w-3.5 h-3.5 text-brand-400" />
              <span>Medeniyet Teknopark PRD v1.0 gereksinimlerine uygun</span>
            </div>
          </div>

          {/* User Quick Actions */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Kiracı Hizmetleri</h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <button onClick={() => setActiveTab('create-report')} className="hover:text-brand-400 transition-colors">
                  Arıza Bildirimi Oluştur
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('track')} className="hover:text-brand-400 transition-colors">
                  Bildirimi Takip Et
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('meter-upload')} className="hover:text-brand-400 transition-colors">
                  Sayaç Fotoğrafı Yükle
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('welcome')} className="hover:text-brand-400 transition-colors">
                  QR Erişim Simülatörü
                </button>
              </li>
            </ul>
          </div>

          {/* Admin & System links */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Yönetim</h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <button onClick={() => setActiveTab('admin-dashboard')} className="hover:text-amber-400 transition-colors">
                  Yönetici Kontrol Merkezi
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('admin-reports')} className="hover:text-amber-400 transition-colors">
                  Arıza Raporları Arşivi
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('admin-meters')} className="hover:text-amber-400 transition-colors">
                  Sayaç Yönetimi
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('admin-settings')} className="hover:text-amber-400 transition-colors">
                  Sistem Ayarları
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 space-y-3 sm:space-y-0">
          <p>© {new Date().getFullYear()} Medeniyet Teknopark. Tüm hakları saklıdır.</p>
          <div className="flex items-center space-x-1 text-slate-500">
            <span>Özenle geliştirildi</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            <span className="text-slate-400 font-medium">Medeniyet Teknopark</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
