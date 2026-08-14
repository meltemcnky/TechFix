import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Building2, 
  Calendar, 
  AlertTriangle, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpDown,
  Tag,
  Users
} from 'lucide-react';
import { ActiveTab, CategoryType, FilterOptions, Report, ReportPriority, ReportStatus, STATUS_LABELS_TR, PRIORITY_LABELS_TR, CATEGORY_LABELS_TR } from '../types';
import { getCompanies, SEED_CATEGORIES, getReports } from '../services/storage';

interface AdminReportListProps {
  setActiveTab: (tab: ActiveTab) => void;
  onSelectReport: (report: Report) => void;
}

export const AdminReportList: React.FC<AdminReportListProps> = ({
  setActiveTab,
  onSelectReport,
}) => {
  const allReports = getReports();

  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    category: 'all',
    status: 'all',
    priority: 'all',
    company: 'all',
    dateRange: 'all'
  });

  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8;

  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Filter & Sort Logic
  const filteredReports = allReports.filter((r) => {
    // Search keyword query
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      const matchCode = r.trackingCode.toLowerCase().includes(q);
      const matchComp = r.companyName.toLowerCase().includes(q);
      const matchDesc = r.description.toLowerCase().includes(q);
      const matchCat = r.category.toLowerCase().includes(q);
      if (!matchCode && !matchComp && !matchDesc && !matchCat) return false;
    }

    if (filters.category !== 'all' && r.category !== filters.category) return false;
    if (filters.status !== 'all' && r.status !== filters.status) return false;
    if (filters.priority !== 'all' && r.priority !== filters.priority) return false;
    if (filters.company !== 'all' && r.companyId !== filters.company) return false;

    // Date Range Filter (PRD 3.11)
    if (filters.dateRange !== 'all') {
      const subTime = new Date(r.submissionDate).getTime();
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;
      if (filters.dateRange === 'today' && (now - subTime) > dayMs) return false;
      if (filters.dateRange === 'week' && (now - subTime) > 7 * dayMs) return false;
      if (filters.dateRange === 'month' && (now - subTime) > 30 * dayMs) return false;
    }

    return true;
  }).sort((a, b) => {
    const timeA = new Date(a.submissionDate).getTime();
    const timeB = new Date(b.submissionDate).getTime();
    return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage) || 1;
  const paginatedReports = filteredReports.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleExportCSV = () => {
    const headers = ["Takip Kodu", "Şirket", "Bina", "Kat", "Ofis", "Kategori", "Öncelik", "Durum", "Gönderim Tarihi", "Açıklama"];
    const rows = filteredReports.map(r => [
      r.trackingCode,
      `"${r.companyName}"`,
      r.building,
      r.floor,
      r.officeNumber,
      r.category,
      r.priority,
      r.status,
      r.submissionDate,
      `"${r.description.replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `TechFix_Rapor_Listesi_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-6 animate-fade-in py-4">
      
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Arıza Raporları Arşivi</h1>
          <p className="text-xs text-slate-400 mt-1">
            Medeniyet Teknopark genelinde gönderilen tüm raporları arayın, filtreleyin ve yönetin.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 hover:border-brand-500 hover:text-white text-xs font-bold transition-all flex items-center space-x-2"
        >
          <Download className="w-4 h-4 text-brand-400" />
          <span>CSV Dışa Aktar</span>
        </button>
      </div>

      {/* Filter Toolbar Panel (PRD 3.11 & 4.8) */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          
          {/* Keyword Search */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => { setFilters({ ...filters, search: e.target.value }); setCurrentPage(1); }}
              placeholder="Kod, şirket, anahtar kelime ara..."
              className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl pl-9 pr-3 py-2.5 focus:border-brand-500 focus:outline-none"
            />
          </div>

          {/* Company Filter */}
          <select
            value={filters.company}
            onChange={(e) => { setFilters({ ...filters, company: e.target.value }); setCurrentPage(1); }}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:border-brand-500 focus:outline-none"
          >
            <option value="all">Tüm Şirketler</option>
            {getCompanies().map(c => <option key={c.id} value={c.id}>{c.name} ({c.building} — {c.floor} — {c.officeNumber})</option>)}
          </select>

          {/* Category Filter */}
          <select
            value={filters.category}
            onChange={(e) => { setFilters({ ...filters, category: e.target.value }); setCurrentPage(1); }}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:border-brand-500 focus:outline-none"
          >
            <option value="all">Tüm Kategoriler</option>
            {SEED_CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS_TR[c] || c}</option>)}
          </select>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setCurrentPage(1); }}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:border-brand-500 focus:outline-none"
          >
            <option value="all">Tüm Durumlar</option>
            <option value="New">Yeni</option>
            <option value="Under Review">İnceleniyor</option>
            <option value="Assigned">Atandı</option>
            <option value="In Progress">İşlemde</option>
            <option value="Resolved">Çözüldü</option>
            <option value="Archived">Arşivlendi</option>
          </select>

          {/* Date Range Filter (PRD 3.11) */}
          <select
            value={filters.dateRange}
            onChange={(e) => { setFilters({ ...filters, dateRange: e.target.value as any }); setCurrentPage(1); }}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:border-brand-500 focus:outline-none"
          >
            <option value="all">Tüm Zamanlar</option>
            <option value="today">Bugün</option>
            <option value="week">Son 7 Gün</option>
            <option value="month">Son 30 Gün</option>
          </select>

        </div>
      </div>

      {/* Reports Mobile Card List View (block md:hidden) */}
      <div className="block md:hidden space-y-3">
        {paginatedReports.length === 0 ? (
          <div className="glass-panel p-8 text-center text-slate-500 rounded-2xl text-xs">
            Aktif filtrelerinizle eşleşen arıza raporu bulunamadı.
          </div>
        ) : (
          paginatedReports.map((report) => (
            <div 
              key={report.id}
              onClick={() => onSelectReport(report)}
              className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3 cursor-pointer hover:border-brand-500/50 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-sm text-white">{report.trackingCode}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold status-badge-${
                  report.status === 'New' ? 'new' :
                  report.status === 'Under Review' ? 'review' :
                  report.status === 'Assigned' ? 'assigned' :
                  report.status === 'In Progress' ? 'progress' :
                  report.status === 'Resolved' ? 'resolved' : 'archived'
                }`}>
                  {STATUS_LABELS_TR[report.status] || report.status}
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <p className="font-bold text-xs text-slate-200">{report.companyName}</p>
                  {(report.affectedCount ?? 1) > 1 && (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                      <Users className="w-3 h-3 text-rose-400" />
                      <span>{report.affectedCount} kişi etkileniyor</span>
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400">{report.building} • {report.officeNumber} • {CATEGORY_LABELS_TR[report.category] || report.category}</p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px]">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  report.priority === 'Critical' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                  report.priority === 'High' ? 'bg-amber-500/20 text-amber-400' :
                  report.priority === 'Medium' ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-800 text-slate-400'
                }`}>
                  {PRIORITY_LABELS_TR[report.priority]} Öncelik
                </span>
                <span className="text-slate-500">{new Date(report.submissionDate).toLocaleDateString('tr-TR')}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Reports Desktop Data Table (hidden md:block) */}
      <div className="hidden md:block glass-panel rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Takip Kodu</th>
                <th className="py-3.5 px-4">Şirket / Ofis</th>
                <th className="py-3.5 px-4">Kategori</th>
                <th className="py-3.5 px-4">Öncelik</th>
                <th className="py-3.5 px-4">Durum</th>
                <th className="py-3.5 px-4 cursor-pointer hover:text-white" onClick={() => setSortOrder(s => s === 'newest' ? 'oldest' : 'newest')}>
                  <span className="flex items-center space-x-1">
                    <span>Gönderim Tarihi</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </span>
                </th>
                <th className="py-3.5 px-4 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedReports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Aktif filtrelerinizle eşleşen arıza raporu bulunamadı.
                  </td>
                </tr>
              ) : (
                paginatedReports.map((report) => (
                  <tr
                    key={report.id}
                    onClick={() => onSelectReport(report)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      {report.trackingCode}
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-200">{report.companyName}</p>
                      <p className="text-[10px] text-slate-400">{report.building} • {report.officeNumber}</p>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-slate-300">{CATEGORY_LABELS_TR[report.category] || report.category}</span>
                        {(report.affectedCount ?? 1) > 1 && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold inline-flex items-center space-x-1" title={`${report.affectedCount} kişi etkileniyor`}>
                            <Users className="w-3 h-3 text-rose-400" />
                            <span>{report.affectedCount} kişi etkileniyor</span>
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        report.priority === 'Critical' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                        report.priority === 'High' ? 'bg-amber-500/20 text-amber-400' :
                        report.priority === 'Medium' ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {PRIORITY_LABELS_TR[report.priority]}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full font-bold status-badge-${
                        report.status === 'New' ? 'new' :
                        report.status === 'Under Review' ? 'review' :
                        report.status === 'Assigned' ? 'assigned' :
                        report.status === 'In Progress' ? 'progress' :
                        report.status === 'Resolved' ? 'resolved' : 'archived'
                      }`}>
                        {STATUS_LABELS_TR[report.status] || report.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {new Date(report.submissionDate).toLocaleDateString('tr-TR')}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectReport(report);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-brand-600 text-slate-200 hover:text-white font-semibold text-[11px] transition-all flex items-center space-x-1 ml-auto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Yönet</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>{filteredReports.length} rapordan {paginatedReports.length} tanesi gösteriliyor</span>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-slate-800 disabled:opacity-40 text-slate-300 hover:text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-200">Sayfa {currentPage} / {totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg bg-slate-800 disabled:opacity-40 text-slate-300 hover:text-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
