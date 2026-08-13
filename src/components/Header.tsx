import React, { useState } from 'react';
import { 
  Building2, 
  QrCode, 
  Search, 
  Gauge, 
  ShieldCheck, 
  Bell, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  X, 
  LogOut,
  Sparkles
} from 'lucide-react';
import { ActiveTab, NotificationItem } from '../types';
import { getNotifications, markNotificationRead, clearAllNotifications } from '../services/storage';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isAdminLoggedIn: boolean;
  onAdminLogout: () => void;
  onOpenAdminLogin: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isAdminLoggedIn,
  onAdminLogout,
  onOpenAdminLogin,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const notifications = getNotifications();
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = (n: NotificationItem) => {
    markNotificationRead(n.id);
    setShowNotifications(false);
    if (isAdminLoggedIn) {
      setActiveTab('admin-reports');
    } else {
      setActiveTab('track');
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo & Title */}
        <div 
          onClick={() => setActiveTab('welcome')}
          className="flex items-center space-x-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center shadow-glow-brand transition-transform group-hover:scale-105">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-brand-400 bg-clip-text text-transparent">
                TechFix
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
                v1.0 PRD
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium hidden sm:block">
              Medeniyet Teknopark Bina Yönetim Platformu
            </p>
          </div>
        </div>

        {/* Center Navigation links */}
        <nav className="hidden md:flex items-center space-x-1 bg-slate-900/60 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('welcome')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center space-x-1.5 ${
              activeTab === 'welcome'
                ? 'bg-brand-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ana Sayfa</span>
          </button>

          <button
            onClick={() => setActiveTab('create-report')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center space-x-1.5 ${
              activeTab === 'create-report'
                ? 'bg-brand-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Arıza Bildir</span>
          </button>

          <button
            onClick={() => setActiveTab('track')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center space-x-1.5 ${
              activeTab === 'track'
                ? 'bg-brand-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Durum Takibi</span>
          </button>

          <button
            onClick={() => setActiveTab('meter-upload')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center space-x-1.5 ${
              activeTab === 'meter-upload'
                ? 'bg-brand-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>Sayaç Okuma</span>
          </button>
        </nav>

        {/* Right Section Actions & Admin Controls */}
        <div className="flex items-center space-x-3">
          
          {/* Notifications Toggle */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all relative"
              title="Sistem Bildirimleri"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Popover */}
            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 sm:w-96 glass-panel rounded-2xl border border-slate-700 shadow-2xl p-4 z-50 animate-fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <Bell className="w-4 h-4 text-brand-400" />
                    <span className="font-semibold text-sm text-white">Bildirimler</span>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-brand-500/20 text-brand-400 rounded-full">
                        {unreadCount} yeni
                      </span>
                    )}
                  </div>
                  <button 
                    onClick={() => setShowNotifications(false)}
                    className="text-slate-400 hover:text-white p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto py-2 space-y-2">
                  {notifications.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 text-xs">
                      Şu anda bildirim bulunmuyor
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`p-3 rounded-xl cursor-pointer border transition-all ${
                          n.read ? 'bg-slate-900/40 border-slate-800/60 opacity-70' : 'bg-slate-800/80 border-slate-700 hover:border-brand-500/50'
                        }`}
                      >
                        <div className="flex items-start space-x-2.5">
                          {n.type === 'critical_issue' ? (
                            <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
                          ) : n.type === 'new_report' ? (
                            <CheckCircle2 className="w-4 h-4 text-brand-400 mt-0.5 flex-shrink-0" />
                          ) : (
                            <Clock className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-white truncate">{n.title}</p>
                            <p className="text-xs text-slate-300 line-clamp-2 mt-0.5">{n.message}</p>
                            <p className="text-[10px] text-slate-500 mt-1">
                              {new Date(n.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {notifications.length > 0 && (
                  <div className="pt-2 border-t border-slate-800 text-right">
                    <button
                      onClick={() => {
                        clearAllNotifications();
                        setShowNotifications(false);
                      }}
                      className="text-[11px] text-slate-400 hover:text-rose-400 font-medium transition-colors"
                    >
                      Tüm bildirimleri temizle
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Admin Login / Logout Switcher */}
          {isAdminLoggedIn ? (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveTab('admin-dashboard')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                  activeTab.startsWith('admin-')
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-glow-brand'
                    : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Yönetici Paneli</span>
              </button>
              <button
                onClick={onAdminLogout}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition-all"
                title="Yönetici Çıkışı"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAdminLogin}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-700 text-slate-200 hover:border-brand-500 hover:text-white transition-all flex items-center space-x-1.5"
            >
              <ShieldCheck className="w-4 h-4 text-brand-400" />
              <span>Yönetici Girişi</span>
            </button>
          )}

        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-800/80 bg-slate-950/90 py-2 px-2">
        <button
          onClick={() => setActiveTab('welcome')}
          className={`flex flex-col items-center space-y-0.5 text-[10px] font-medium ${
            activeTab === 'welcome' ? 'text-brand-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Ana Sayfa</span>
        </button>

        <button
          onClick={() => setActiveTab('create-report')}
          className={`flex flex-col items-center space-y-0.5 text-[10px] font-medium ${
            activeTab === 'create-report' ? 'text-brand-400 font-bold' : 'text-slate-400'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>Bildir</span>
        </button>

        <button
          onClick={() => setActiveTab('track')}
          className={`flex flex-col items-center space-y-0.5 text-[10px] font-medium ${
            activeTab === 'track' ? 'text-brand-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Takip</span>
        </button>

        <button
          onClick={() => setActiveTab('meter-upload')}
          className={`flex flex-col items-center space-y-0.5 text-[10px] font-medium ${
            activeTab === 'meter-upload' ? 'text-brand-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Gauge className="w-4 h-4" />
          <span>Sayaç</span>
        </button>

        {isAdminLoggedIn && (
          <button
            onClick={() => setActiveTab('admin-dashboard')}
            className={`flex flex-col items-center space-y-0.5 text-[10px] font-medium ${
              activeTab.startsWith('admin-') ? 'text-amber-400 font-bold' : 'text-slate-400'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Yönetici</span>
          </button>
        )}
      </div>
    </header>
  );
};
