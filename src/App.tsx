import React, { useState, useEffect } from 'react';
import { ActiveTab, Company, Report } from './types';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { WelcomeScreen } from './components/WelcomeScreen';
import { CreateReportForm } from './components/CreateReportForm';
import { SuccessScreen } from './components/SuccessScreen';
import { ReportTracking } from './components/ReportTracking';
import { MeterUploadForm } from './components/MeterUploadForm';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminReportList } from './components/AdminReportList';
import { AdminReportDetailModal } from './components/AdminReportDetailModal';
import { AdminMeterManagement } from './components/AdminMeterManagement';
import { AdminSettings } from './components/AdminSettings';
import { AdminQrManagement } from './components/AdminQrManagement';
import { ErrorPages } from './components/ErrorPages';
import { initializeStorage } from './services/storage';
import { isAuthenticatedAdmin, logoutAdmin } from './services/authService';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('welcome');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => isAuthenticatedAdmin());
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState<boolean>(false);
  
  // Cross-screen payload states
  const [preselectedCompany, setPreselectedCompany] = useState<Company | null>(null);
  const [createdReport, setCreatedReport] = useState<Report | null>(null);
  const [trackingCodeSearch, setTrackingCodeSearch] = useState<string>('');
  const [selectedReportDetail, setSelectedReportDetail] = useState<Report | null>(null);

  useEffect(() => {
    initializeStorage();
    setIsAdminLoggedIn(isAuthenticatedAdmin());

    // Check if user scanned universal QR code URL (?action=create-report)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('action') === 'create-report') {
        setActiveTab('create-report');
      }
    }
  }, []);

  // Protect Admin tabs if not authenticated & handle smooth routing
  const handleTabChange = (tab: ActiveTab) => {
    if (tab.startsWith('admin-')) {
      if (!isAuthenticatedAdmin()) {
        setIsAdminLoggedIn(false);
        setIsAdminLoginModalOpen(true);
        return;
      }
      setIsAdminLoggedIn(true);
    }

    setActiveTab(tab);

    // Clean URL query param when user navigates away from create-report
    if (typeof window !== 'undefined' && window.history.pushState) {
      if (tab !== 'create-report') {
        const url = new URL(window.location.href);
        if (url.searchParams.has('action')) {
          url.searchParams.delete('action');
          window.history.pushState({}, '', url.pathname + url.search);
        }
      }
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAdminLoginSuccess = () => {
    setIsAdminLoggedIn(true);
    setActiveTab('admin-dashboard');
  };

  const handleAdminLogout = () => {
    logoutAdmin();
    setIsAdminLoggedIn(false);
    setActiveTab('welcome');
  };

  const isProtectedAdminTab = activeTab.startsWith('admin-');
  const hasValidAdminAuth = isAuthenticatedAdmin();

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F17] text-slate-100 font-sans selection:bg-brand-500 selection:text-white">
      
      {/* Top Header Navbar */}
      <Header
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        isAdminLoggedIn={isAdminLoggedIn && hasValidAdminAuth}
        onAdminLogout={handleAdminLogout}
        onOpenAdminLogin={() => setIsAdminLoginModalOpen(true)}
      />

      {/* Main Page Body Router View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {activeTab === 'welcome' && (
          <WelcomeScreen
            setActiveTab={handleTabChange}
            onSelectCompanyForReport={(comp) => setPreselectedCompany(comp)}
            onOpenAdminLogin={() => setIsAdminLoginModalOpen(true)}
            isAdminLoggedIn={isAdminLoggedIn && hasValidAdminAuth}
          />
        )}

        {activeTab === 'create-report' && (
          <CreateReportForm
            setActiveTab={handleTabChange}
            preselectedCompany={preselectedCompany}
            onReportCreated={(rep) => setCreatedReport(rep)}
          />
        )}

        {activeTab === 'success' && (
          <SuccessScreen
            report={createdReport}
            setActiveTab={handleTabChange}
            onSetTrackCode={(code) => setTrackingCodeSearch(code)}
          />
        )}

        {activeTab === 'track' && (
          <ReportTracking
            setActiveTab={handleTabChange}
            initialTrackingCode={trackingCodeSearch}
          />
        )}

        {activeTab === 'meter-upload' && (
          <MeterUploadForm
            setActiveTab={handleTabChange}
          />
        )}

        {/* Administrator Protected Views Guard */}
        {isProtectedAdminTab && !hasValidAdminAuth && (
          <ErrorPages type="denied" setActiveTab={handleTabChange} />
        )}

        {isProtectedAdminTab && hasValidAdminAuth && (
          <>
            {activeTab === 'admin-dashboard' && (
              <AdminDashboard
                setActiveTab={handleTabChange}
                onSelectReportDetail={(rep) => setSelectedReportDetail(rep)}
              />
            )}

            {activeTab === 'admin-reports' && (
              <AdminReportList
                setActiveTab={handleTabChange}
                onSelectReport={(rep) => setSelectedReportDetail(rep)}
              />
            )}

            {activeTab === 'admin-meters' && (
              <AdminMeterManagement
                setActiveTab={handleTabChange}
              />
            )}

            {activeTab === 'admin-qr' && (
              <AdminQrManagement
                setActiveTab={handleTabChange}
              />
            )}

            {activeTab === 'admin-settings' && (
              <AdminSettings
                setActiveTab={handleTabChange}
              />
            )}
          </>
        )}

        {/* Error States */}
        {activeTab === 'error-404' && <ErrorPages type="404" setActiveTab={handleTabChange} />}
        {activeTab === 'error-500' && <ErrorPages type="500" setActiveTab={handleTabChange} />}
        {activeTab === 'error-offline' && <ErrorPages type="offline" setActiveTab={handleTabChange} />}
        {activeTab === 'error-denied' && <ErrorPages type="denied" setActiveTab={handleTabChange} />}

      </main>

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={isAdminLoginModalOpen}
        onClose={() => setIsAdminLoginModalOpen(false)}
        onSuccess={handleAdminLoginSuccess}
      />

      {/* Admin Report Detail Modal */}
      {selectedReportDetail && (
        <AdminReportDetailModal
          report={selectedReportDetail}
          onClose={() => setSelectedReportDetail(null)}
          onReportUpdated={() => setSelectedReportDetail(null)}
        />
      )}

      {/* Footer */}
      <Footer setActiveTab={handleTabChange} />

    </div>
  );
};

export default App;
