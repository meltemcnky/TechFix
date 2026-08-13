import React, { useState } from 'react';
import { 
  Building2, 
  QrCode, 
  Search, 
  Gauge, 
  ShieldCheck, 
  Zap, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  Sparkles,
  ArrowRight,
  Shield,
  Layers,
  Wrench,
  FileCheck
} from 'lucide-react';
import { ActiveTab, Company } from '../types';
import { getCompanies } from '../services/storage';

interface WelcomeScreenProps {
  setActiveTab: (tab: ActiveTab) => void;
  onSelectCompanyForReport: (company: Company) => void;
  onOpenAdminLogin: () => void;
  isAdminLoggedIn: boolean;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  setActiveTab,
  onSelectCompanyForReport,
  onOpenAdminLogin,
  isAdminLoggedIn,
}) => {
  const companies = getCompanies();
  const [selectedDemoCompany, setSelectedDemoCompany] = useState<string>(companies[0]?.id || 'comp-1');

  const handleSimulateQrScan = () => {
    const company = companies.find(c => c.id === selectedDemoCompany) || companies[0];
    onSelectCompanyForReport(company);
    setActiveTab('create-report');
  };

  return (
    <div className="space-y-16 animate-fade-in py-4">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl glass-panel border border-slate-800 p-8 sm:p-12 text-center md:text-left">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-brand-400" />
              <span>Medeniyet Teknopark Dijital Platformu</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Anlık Bina <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-brand-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
                Arıza Yönetimi
              </span>
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl">
              Bina bakım, elektrik arızası, tesisat, klima ve ekipman sorunlarını kapı QR kodunu tarayarak hesap oluşturmadan 60 saniyeden kısa sürede bildirin.
            </p>

            {/* Quick Actions Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => setActiveTab('create-report')}
                className="px-6 py-3.5 rounded-xl gradient-accent text-white font-bold text-sm shadow-glow-brand hover:opacity-95 transition-all flex items-center space-x-2 group"
              >
                <QrCode className="w-4 h-4" />
                <span>Arıza Bildirimi Oluştur</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => setActiveTab('track')}
                className="px-5 py-3.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 font-semibold text-sm hover:border-brand-500 hover:text-white transition-all flex items-center space-x-2"
              >
                <Search className="w-4 h-4 text-brand-400" />
                <span>Mevcut Bildirimi Takip Et</span>
              </button>

              <button
                onClick={() => setActiveTab('meter-upload')}
                className="px-4 py-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300 font-medium text-sm hover:border-slate-700 hover:text-white transition-all flex items-center space-x-2"
              >
                <Gauge className="w-4 h-4 text-emerald-400" />
                <span>Sayaç Okuma</span>
              </button>
            </div>

            {/* Micro stats banner */}
            <div className="pt-6 grid grid-cols-3 gap-4 border-t border-slate-800/80">
              <div>
                <p className="text-xl font-bold text-white">&lt; 60 sn</p>
                <p className="text-xs text-slate-400">Gönderim Süresi</p>
              </div>
              <div>
                <p className="text-xl font-bold text-white">Hesapsız</p>
                <p className="text-xs text-slate-400">Kayıt Gerekmez</p>
              </div>
              <div>
                <p className="text-xl font-bold text-white">%100 Dijital</p>
                <p className="text-xs text-slate-400">Takip Edilebilir Süreç</p>
              </div>
            </div>
          </div>

          {/* Interactive QR Code Scan Simulator Card */}
          <div className="lg:col-span-5">
            <div className="glass-card rounded-2xl p-6 border border-slate-700/80 shadow-2xl relative">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    QR Kapı Tarama Simülatörü
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-brand-500/20 text-brand-300 font-mono">
                  Teknopark QR v1
                </span>
              </div>

              <div className="py-5 text-center space-y-4">
                {/* QR Code graphic container */}
                <div className="mx-auto w-40 h-40 bg-white p-3 rounded-2xl shadow-glow-brand flex flex-col items-center justify-center border-4 border-slate-900">
                  <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900 fill-current">
                    <path d="M0,0 H30 V30 H0 Z M10,10 H20 V20 H10 Z M70,0 H100 V30 H70 Z M80,10 H90 V20 H80 Z M0,70 H30 V100 H0 Z M10,80 H20 V90 H10 Z M40,10 H60 V20 H40 Z M10,40 H20 V60 H10 Z M40,40 H60 V60 H40 Z M70,40 H80 V60 H70 Z M40,70 H50 V90 H40 Z M70,70 H100 V80 H70 Z M80,80 H90 V100 H80 Z" />
                  </svg>
                </div>

                <div className="space-y-2 max-w-xs mx-auto">
                  <label className="text-xs text-slate-400 font-medium block">
                    Teknopark ofis kapısındaki QR kodu taramayı simüle edin:
                  </label>
                  <select
                    value={selectedDemoCompany}
                    onChange={(e) => setSelectedDemoCompany(e.target.value)}
                    className="w-full text-xs bg-slate-900 border border-slate-700 text-slate-200 rounded-xl px-3 py-2.5 focus:border-brand-500 focus:outline-none"
                  >
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.building} — {c.floor} — {c.officeNumber})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleSimulateQrScan}
                  className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center space-x-2"
                >
                  <QrCode className="w-4 h-4" />
                  <span>QR Tara ve Bildirim Formunu Aç</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-400 text-center italic">
                QR tarama sonrası konum bilgisi otomatik doldurulmuş form açılır.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* 3 Steps Workflow Section */}
      <section className="space-y-6 text-center">
        <div>
          <h2 className="text-2xl font-bold text-white">TechFix Nasıl Çalışır?</h2>
          <p className="text-xs sm:text-sm text-slate-400">3 adımlı dijital arıza yaşam döngüsü</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-6 rounded-2xl text-left border border-slate-800 hover:border-brand-500/40 transition-all space-y-3">
            <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center font-bold text-lg">
              01
            </div>
            <h3 className="font-bold text-white text-base">QR Tara ve Gönder</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Şirket kapınızdaki QR kodu tarayın. Kategori seçin, arızayı tanımlayın, fotoğraf ekleyin ve gönderin.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl text-left border border-slate-800 hover:border-brand-500/40 transition-all space-y-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-lg">
              02
            </div>
            <h3 className="font-bold text-white text-base">Takip Kodu Alın</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Anında benzersiz bir takip kodu (ör. <code className="text-brand-300">TFX-2026-000153</code>) alın ve teknisyen değerlendirmesini canlı takip edin.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl text-left border border-slate-800 hover:border-brand-500/40 transition-all space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg">
              03
            </div>
            <h3 className="font-bold text-white text-base">Çözüm ve Arşivleme</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Teknisyenler sorunu çözer, çözüm notları kaydeder ve yöneticiler tüm işlem geçmişini merkezi arşive kaydeder.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Modules Grid */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Platform Modülleri</h2>
            <p className="text-xs sm:text-sm text-slate-400">Medeniyet Teknopark için tasarlanmış temel özellikler</p>
          </div>
          {isAdminLoggedIn ? (
            <button
              onClick={() => setActiveTab('admin-dashboard')}
              className="text-xs font-semibold text-amber-400 hover:underline flex items-center space-x-1"
            >
              <span>Kontrol Merkezine Git</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onOpenAdminLogin}
              className="text-xs font-semibold text-brand-400 hover:underline flex items-center space-x-1"
            >
              <span>Yönetici Girişi</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div 
            onClick={() => setActiveTab('create-report')}
            className="glass-card p-5 rounded-2xl cursor-pointer hover:border-brand-500/50 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <QrCode className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-white text-sm">QR Arıza Bildirimi</h4>
            <p className="text-xs text-slate-400 mt-1">
              Kategori seçimi, fotoğraf ekleme ve anlık mükerrer tespit.
            </p>
          </div>

          <div 
            onClick={() => setActiveTab('track')}
            className="glass-card p-5 rounded-2xl cursor-pointer hover:border-brand-500/50 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Search className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-white text-sm">Arıza Takibi</h4>
            <p className="text-xs text-slate-400 mt-1">
              Salt okunur durum zaman çizelgesi ve yönetici güncellemeleri.
            </p>
          </div>

          <div 
            onClick={() => setActiveTab('meter-upload')}
            className="glass-card p-5 rounded-2xl cursor-pointer hover:border-emerald-500/50 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Gauge className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-white text-sm">Sayaç Okuma</h4>
            <p className="text-xs text-slate-400 mt-1">
              Elektrik ve doğalgaz sayacı fotoğraf çekimi ve tüketim kaydı.
            </p>
          </div>

          <div 
            onClick={() => isAdminLoggedIn ? setActiveTab('admin-dashboard') : onOpenAdminLogin()}
            className="glass-card p-5 rounded-2xl cursor-pointer hover:border-amber-500/50 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-white text-sm">Yönetici Paneli</h4>
            <p className="text-xs text-slate-400 mt-1">
              Öncelik belirleme, durum yönetimi, grafik analizleri ve geçmiş kayıtları.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
};
