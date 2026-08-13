import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend 
} from 'recharts';
import { 
  ShieldCheck, 
  FileText, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  Download, 
  RotateCcw, 
  Gauge, 
  ListFilter, 
  Activity,
  Plus,
  ArrowRight,
  QrCode
} from 'lucide-react';
import { ActiveTab, Report, ReportStatus, ReportPriority, CategoryType, STATUS_LABELS_TR, PRIORITY_LABELS_TR, CATEGORY_LABELS_TR } from '../types';
import { getReports, getActivityLogs, resetSeedData } from '../services/storage';

interface AdminDashboardProps {
  setActiveTab: (tab: ActiveTab) => void;
  onSelectReportDetail: (report: Report) => void;
}

const COLORS = ['#38bdf8', '#fbbf24', '#c084fc', '#60a5fa', '#4ade80', '#94a3b8'];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  setActiveTab,
  onSelectReportDetail,
}) => {
  const reports = getReports();
  const logs = getActivityLogs();

  // Metrics Calculation
  const totalReports = reports.length;
  const newReports = reports.filter(r => r.status === 'New').length;
  const inProgressReports = reports.filter(r => r.status === 'In Progress' || r.status === 'Under Review' || r.status === 'Assigned').length;
  const resolvedReports = reports.filter(r => r.status === 'Resolved').length;
  const criticalReports = reports.filter(r => r.priority === 'Critical' && r.status !== 'Resolved' && r.status !== 'Archived').length;

  // Chart Data 1: Category Distribution
  const categoryCounts: { [key: string]: number } = {};
  reports.forEach(r => {
    categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1;
  });
  const categoryData = Object.keys(categoryCounts).map(cat => ({
    name: CATEGORY_LABELS_TR[cat as CategoryType] || cat,
    count: categoryCounts[cat]
  }));

  // Chart Data 2: Status Pie Chart
  const statusCounts: { [key: string]: number } = {};
  reports.forEach(r => {
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
  });
  const statusData = Object.keys(statusCounts).map(st => ({
    name: STATUS_LABELS_TR[st as ReportStatus] || st,
    value: statusCounts[st]
  }));

  // Chart Data 3: Trend Mock Data
  const trendData = [
    { day: 'Pzt', reports: 4 },
    { day: 'Sal', reports: 7 },
    { day: 'Çar', reports: 5 },
    { day: 'Per', reports: 9 },
    { day: 'Cum', reports: 6 },
    { day: 'Cmt', reports: 2 },
    { day: 'Paz', reports: 3 },
  ];

  const handleExportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(reports, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `TechFix_Raporlar_Disa_Aktarim_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleReset = () => {
    if (window.confirm('Tüm demo verileri Teknopark başlangıç veri setine sıfırlansın mı?')) {
      resetSeedData();
      window.location.reload();
    }
  };

  return (
    <div className="space-y-8 animate-fade-in py-4">
      
      {/* Dashboard Top Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Yönetici Kontrol Merkezi</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/30">
              Canlı İşlemler
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Teknopark bina arıza takibi, analitik ve yaşam döngüsü yönetimi için gerçek zamanlı kontrol paneli.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('admin-reports')}
            className="px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-glow-brand transition-all flex items-center space-x-1.5"
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>Tüm Raporları Yönet</span>
          </button>

          <button
            onClick={() => setActiveTab('admin-meters')}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs font-semibold hover:border-emerald-500 hover:text-white transition-all flex items-center space-x-1.5"
          >
            <Gauge className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sayaç Okumaları</span>
          </button>

          <button
            onClick={() => setActiveTab('admin-qr')}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs font-semibold hover:border-brand-500 hover:text-white transition-all flex items-center space-x-1.5"
          >
            <QrCode className="w-3.5 h-3.5 text-brand-400" />
            <span>QR Kod Yönetimi</span>
          </button>

          <button
            onClick={handleExportData}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all"
            title="JSON Raporlarını Dışa Aktar"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={handleReset}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition-all"
            title="Başlangıç Verilerini Sıfırla"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Statistic Cards (PRD Section 3.9) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        
        <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Toplam Rapor</span>
            <FileText className="w-4 h-4 text-brand-400" />
          </div>
          <p className="text-2xl font-extrabold text-white">{totalReports}</p>
          <p className="text-[10px] text-slate-500">Tüm kayıtlı arızalar</p>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Yeni Raporlar</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-2xl font-extrabold text-sky-400">{newReports}</p>
          <p className="text-[10px] text-slate-500">İnceleme bekliyor</p>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">İşlemde</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-extrabold text-amber-400">{inProgressReports}</p>
          <p className="text-[10px] text-slate-500">Aktif bakım</p>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Çözüldü</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-400">{resolvedReports}</p>
          <p className="text-[10px] text-slate-500">Düzeltildi ve doğrulandı</p>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-rose-900/50 bg-rose-950/10 space-y-1 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-rose-300">
            <span className="text-xs font-semibold">Kritik Sorunlar</span>
            <AlertTriangle className="w-4 h-4 text-rose-400 animate-bounce" />
          </div>
          <p className="text-2xl font-extrabold text-rose-400">{criticalReports}</p>
          <p className="text-[10px] text-rose-300/70">Acil müdahale gerekli</p>
        </div>

      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Category Distribution Bar Chart */}
        <div className="lg:col-span-8 glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Kategoriye Göre Raporlar
            </h3>
            <span className="text-[11px] text-slate-500">Teknopark Dağılımı</span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} interval={0} angle={-25} textAnchor="end" />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#131A27', borderColor: '#1E293B', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#0c8de9" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution Pie Chart */}
        <div className="lg:col-span-4 glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Durum Dağılımı
            </h3>
            <span className="text-[11px] text-slate-500">Açık / Çözülmüş</span>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#131A27', borderColor: '#1E293B', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Critical & Recent Reports List & Activity Stream Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Urgent Reports Requiring Action */}
        <div className="lg:col-span-7 glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Acil İşlem Bekleyen Raporlar
              </h3>
            </div>
            <button
              onClick={() => setActiveTab('admin-reports')}
              className="text-xs text-brand-400 font-semibold hover:underline"
            >
              Tümünü Gör
            </button>
          </div>

          <div className="space-y-3">
            {reports.filter(r => r.status !== 'Resolved' && r.status !== 'Archived').slice(0, 4).map((report) => (
              <div
                key={report.id}
                onClick={() => {
                  onSelectReportDetail(report);
                  setActiveTab('admin-reports');
                }}
                className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-brand-500/50 cursor-pointer transition-all flex items-center justify-between"
              >
                <div className="space-y-1 min-w-0 pr-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-xs text-white">{report.trackingCode}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      report.priority === 'Critical' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                      report.priority === 'High' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {PRIORITY_LABELS_TR[report.priority]}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate">{CATEGORY_LABELS_TR[report.category] || report.category}</span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium truncate">{report.companyName} — {report.building}</p>
                  <p className="text-[11px] text-slate-400 line-clamp-1">{report.description}</p>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full status-badge-${
                    report.status === 'New' ? 'new' :
                    report.status === 'Under Review' ? 'review' :
                    report.status === 'Assigned' ? 'assigned' : 'progress'
                  }`}>
                    {STATUS_LABELS_TR[report.status] || report.status}
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-500" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Admin Activity Stream */}
        <div className="lg:col-span-5 glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-brand-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Sistem Aktivite Günlüğü
              </h3>
            </div>
            <span className="text-[10px] text-slate-500">Denetim İzi</span>
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {logs.map((log) => (
              <div key={log.id} className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-[11px]">{log.action}</span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(log.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">{log.details}</p>
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                  <span>İşlem Yapan: {log.actor}</span>
                  {log.reportTrackingCode && (
                    <span className="font-mono text-brand-400">{log.reportTrackingCode}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
