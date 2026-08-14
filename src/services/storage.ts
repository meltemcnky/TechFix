import { 
  Report, 
  Company, 
  MeterRecord, 
  ActivityLog, 
  NotificationItem, 
  ReportStatus, 
  ReportPriority, 
  CategoryType,
  VALID_STATUS_TRANSITIONS,
  STATUS_LABELS_TR
} from '../types';
import { requireAdminAuth } from './authService';

const STORAGE_KEYS = {
  REPORTS: 'techfix_reports',
  METERS: 'techfix_meters',
  COMPANIES: 'techfix_companies',
  LOGS: 'techfix_logs',
  NOTIFICATIONS: 'techfix_notifications',
  CATEGORIES: 'techfix_categories'
};

const CURRENT_STORAGE_VERSION = 'v2.1_real_19_companies';

// 19 Real company & office location records from official Medeniyet Technopark dataset
export const SEED_COMPANIES: Company[] = [
  { id: 'comp-1', name: 'GENEX', building: 'B Blok', floor: 'Zemin', officeNumber: 'B1B16', qrCodeRef: 'QR-GENEX-B1B16' },
  { id: 'comp-2', name: 'COLENDİ', building: 'B Blok', floor: 'Zemin', officeNumber: 'B1B02', qrCodeRef: 'QR-COLENDI-B1B02' },
  { id: 'comp-3', name: 'CERASUS', building: 'B Blok', floor: 'Zemin', officeNumber: 'B1B19', qrCodeRef: 'QR-CERASUS-B1B19' },
  { id: 'comp-4', name: 'YÖNETİM', building: 'A Blok', floor: 'Zemin', officeNumber: 'A1B19', qrCodeRef: 'QR-YONETIM-A1B19' },
  { id: 'comp-5', name: 'YÖNETİM', building: 'A Blok', floor: '1. Kat', officeNumber: 'AZ01', qrCodeRef: 'QR-YONETIM-AZ01' },
  { id: 'comp-6', name: 'NITROGEN', building: 'A Blok', floor: '1. Kat', officeNumber: 'AZ19', qrCodeRef: 'QR-NITROGEN-AZ19' },
  { id: 'comp-7', name: 'E-GÜVEN', building: 'A Blok', floor: '1. Kat', officeNumber: 'AZ20', qrCodeRef: 'QR-EGUVEN-AZ20' },
  { id: 'comp-8', name: 'CANSIZZADE', building: 'A Blok', floor: '2. Kat', officeNumber: 'A116', qrCodeRef: 'QR-CANSIZZADE-A116' },
  { id: 'comp-9', name: 'MİLSİS', building: 'A Blok', floor: '2. Kat', officeNumber: 'A115', qrCodeRef: 'QR-MILSIS-A115' },
  { id: 'comp-10', name: 'KALEDAR', building: 'A Blok', floor: '2. Kat', officeNumber: 'A114', qrCodeRef: 'QR-KALEDAR-A114' },
  { id: 'comp-11', name: 'INTECHNO360', building: 'A Blok', floor: '2. Kat', officeNumber: 'A103', qrCodeRef: 'QR-INTECHNO360-A103' },
  { id: 'comp-12', name: 'RİGOSİS', building: 'A Blok', floor: '2. Kat', officeNumber: 'A101', qrCodeRef: 'QR-RIGOSIS-A101' },
  { id: 'comp-13', name: 'JULVERA', building: 'A Blok', floor: '2. Kat', officeNumber: 'A121', qrCodeRef: 'QR-JULVERA-A121' },
  { id: 'comp-14', name: 'İNFOLOJİK', building: 'A Blok', floor: '2. Kat', officeNumber: 'A120', qrCodeRef: 'QR-INFOLOJIK-A120' },
  { id: 'comp-15', name: 'TECH DÜNYA', building: 'A Blok', floor: '3. Kat', officeNumber: 'A201', qrCodeRef: 'QR-TECHDUNYA-A201' },
  { id: 'comp-16', name: 'TEASOL', building: 'A Blok', floor: '3. Kat', officeNumber: 'A216', qrCodeRef: 'QR-TEASOL-A216' },
  { id: 'comp-17', name: 'TECHNE', building: 'A Blok', floor: '3. Kat', officeNumber: 'A215', qrCodeRef: 'QR-TECHNE-A215' },
  { id: 'comp-18', name: '12M', building: 'A Blok', floor: '3. Kat', officeNumber: 'A217', qrCodeRef: 'QR-12M-A217' },
  { id: 'comp-19', name: 'LOOPSAI', building: 'A Blok', floor: '3. Kat', officeNumber: 'A214', qrCodeRef: 'QR-LOOPSAI-A214' },
];

export const SEED_CATEGORIES: CategoryType[] = [
  'Electrical',
  'Internet / Network',
  'Water & Plumbing',
  'Air Conditioning',
  'Elevator',
  'Cleaning',
  'Security',
  'Common Areas',
  'Equipment',
  'Suggestion',
  'Request',
  'Other'
];

// Sample placeholder image SVG Data URIs for realistic presentation without missing assets
const SAMPLE_METER_PHOTO = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='400' height='300' fill='%231e293b'/><text x='50%25' y='40%25' dominant-baseline='middle' text-anchor='middle' fill='%2338bdf8' font-size='20' font-family='sans-serif'>⚡ SAYAÇ OKUMA GÖRSELİ</text><text x='50%25' y='60%25' dominant-baseline='middle' text-anchor='middle' fill='%234ade80' font-size='32' font-weight='bold' font-family='monospace'>04892.5 kWh</text></svg>";
const SAMPLE_ISSUE_PHOTO = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='400' height='300' fill='%231e293b'/><circle cx='200' cy='150' r='60' fill='%23ef4444' opacity='0.2'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23f87171' font-size='18' font-family='sans-serif'>⚠️ Arıza Fotoğraf Ekipmanı</text></svg>";

const SEED_REPORTS: Report[] = [
  {
    id: 'rep-101',
    trackingCode: 'TFX-2026-000153',
    companyId: 'comp-1',
    companyName: 'GENEX',
    building: 'B Blok',
    floor: 'Zemin',
    officeNumber: 'B1B16',
    category: 'Air Conditioning',
    description: 'Ofis içi ikincil klima ünitesi soğutma yapmıyor, ortam sıcaklığı 27°C seviyesine yükseldi.',
    photos: [SAMPLE_ISSUE_PHOTO],
    status: 'In Progress',
    priority: 'Critical',
    submissionDate: '2026-08-11T14:30:00.000Z',
    lastUpdatedDate: '2026-08-12T09:15:00.000Z',
    adminNotes: 'Teknik ekip yönlendirildi. Yedek fan coil parçası bekleniyor.',
    publicNotes: 'İklimlendirme bakım ekibi B Blok zemin kat soğutma grubunda çalışmayı sürdürüyor.',
    timeline: [
      { id: 't-1', date: '2026-08-11T14:30:00.000Z', status: 'New', actor: 'User' },
      { id: 't-2', date: '2026-08-11T14:45:00.000Z', status: 'Under Review', note: 'Öncelik Kritik seviyeye yükseltildi.', actor: 'Administrator' },
      { id: 't-3', date: '2026-08-11T15:00:00.000Z', status: 'In Progress', note: 'Klima Uzmanı Mehmet K. görevlendirildi.', actor: 'Administrator' },
    ]
  },
  {
    id: 'rep-102',
    trackingCode: 'TFX-2026-000154',
    companyId: 'comp-7',
    companyName: 'E-GÜVEN',
    building: 'A Blok',
    floor: '1. Kat',
    officeNumber: 'AZ20',
    category: 'Internet / Network',
    description: '1. kat koridor kabinindeki fiber switch portu yüksek veri transferinde aralıklı paket kaybı yaşıyor.',
    photos: [],
    status: 'New',
    priority: 'High',
    submissionDate: '2026-08-12T08:10:00.000Z',
    lastUpdatedDate: '2026-08-12T08:10:00.000Z',
    timeline: [
      { id: 't-4', date: '2026-08-12T08:10:00.000Z', status: 'New', actor: 'User' }
    ]
  },
  {
    id: 'rep-103',
    trackingCode: 'TFX-2026-000149',
    companyId: 'comp-11',
    companyName: 'INTECHNO360',
    building: 'A Blok',
    floor: '2. Kat',
    officeNumber: 'A103',
    category: 'Water & Plumbing',
    description: '2. kat lavabo altında su sızıntısı tespit edildi.',
    photos: [SAMPLE_ISSUE_PHOTO],
    status: 'Resolved',
    priority: 'Medium',
    submissionDate: '2026-08-10T11:00:00.000Z',
    lastUpdatedDate: '2026-08-11T16:20:00.000Z',
    resolutionDate: '2026-08-11T16:20:00.000Z',
    adminNotes: 'PVC boru rakoru değiştirildi ve akış basıncı test edildi.',
    publicNotes: 'Tesisat sızıntısı giderildi, kontrol tamamlandı.',
    timeline: [
      { id: 't-5', date: '2026-08-10T11:00:00.000Z', status: 'New', actor: 'User' },
      { id: 't-6', date: '2026-08-10T11:30:00.000Z', status: 'Under Review', actor: 'Administrator' },
      { id: 't-7', date: '2026-08-10T13:00:00.000Z', status: 'In Progress', actor: 'Administrator' },
      { id: 't-8', date: '2026-08-11T16:20:00.000Z', status: 'Resolved', note: 'Su sızıntısı tamamen giderildi.', actor: 'Administrator' }
    ]
  },
  {
    id: 'rep-104',
    trackingCode: 'TFX-2026-000140',
    companyId: 'comp-6',
    companyName: 'NITROGEN',
    building: 'A Blok',
    floor: '1. Kat',
    officeNumber: 'AZ19',
    category: 'Electrical',
    description: 'Ofis içi aşırı yüklenme sonrası ana şalter attı.',
    photos: [],
    status: 'Archived',
    priority: 'High',
    submissionDate: '2026-08-08T09:15:00.000Z',
    lastUpdatedDate: '2026-08-09T18:00:00.000Z',
    resolutionDate: '2026-08-08T14:00:00.000Z',
    adminNotes: 'Şalter sıfırlandı ve yük dengesi ayarlandı.',
    timeline: [
      { id: 't-9', date: '2026-08-08T09:15:00.000Z', status: 'New', actor: 'User' },
      { id: 't-10', date: '2026-08-08T14:00:00.000Z', status: 'Resolved', actor: 'Administrator' },
      { id: 't-11', date: '2026-08-09T18:00:00.000Z', status: 'Archived', actor: 'Administrator' }
    ]
  },
  {
    id: 'rep-105',
    trackingCode: 'TFX-2026-000155',
    companyId: 'comp-15',
    companyName: 'TECH DÜNYA',
    building: 'A Blok',
    floor: '3. Kat',
    officeNumber: 'A201',
    category: 'Elevator',
    description: 'A Blok 3. kat asansör kapısında kapanma gecikmesi var.',
    photos: [],
    status: 'Under Review',
    priority: 'Medium',
    submissionDate: '2026-08-12T09:00:00.000Z',
    lastUpdatedDate: '2026-08-12T09:00:00.000Z',
    timeline: [
      { id: 't-12', date: '2026-08-12T09:00:00.000Z', status: 'New', actor: 'User' },
      { id: 't-13', date: '2026-08-12T09:15:00.000Z', status: 'Under Review', actor: 'Administrator' }
    ]
  }
];

const SEED_METERS: MeterRecord[] = [
  {
    id: 'met-1',
    companyId: 'comp-1',
    companyName: 'GENEX',
    building: 'B Blok',
    floor: 'Zemin',
    meterType: 'Electricity',
    photoUrl: SAMPLE_METER_PHOTO,
    readingValue: 14892.5,
    notes: 'Ağustos 2026 aylık elektrik sayacı fotoğraf doğrulaması.',
    uploadDate: '2026-08-10T10:15:00.000Z',
    uploadedBy: 'Teknopark Saha Görevlisi Ahmet S.'
  },
  {
    id: 'met-2',
    companyId: 'comp-7',
    companyName: 'E-GÜVEN',
    building: 'A Blok',
    floor: '1. Kat',
    meterType: 'Natural Gas',
    photoUrl: SAMPLE_METER_PHOTO,
    readingValue: 3204.1,
    notes: 'Doğalgaz sayacı dijital gösterge net okuma kaydı.',
    uploadDate: '2026-08-11T14:20:00.000Z',
    uploadedBy: 'Teknopark Saha Görevlisi Ahmet S.'
  }
];

const SEED_LOGS: ActivityLog[] = [
  { id: 'log-1', timestamp: '2026-08-12T09:15:00.000Z', actor: 'Yönetici', action: 'Durum Güncellendi', details: 'TFX-2026-000155 kodlu raporun durumu "İnceleniyor" olarak değiştirildi', reportTrackingCode: 'TFX-2026-000155' },
  { id: 'log-2', timestamp: '2026-08-11T15:00:00.000Z', actor: 'Yönetici', action: 'Öncelik Belirlendi', details: 'TFX-2026-000153 kodlu rapora KRİTİK öncelik atandı', reportTrackingCode: 'TFX-2026-000153' },
  { id: 'log-3', timestamp: '2026-08-11T14:30:00.000Z', actor: 'Sistem', action: 'Rapor Oluşturuldu', details: 'GENEX tarafından yeni arıza bildirimi yapıldı', reportTrackingCode: 'TFX-2026-000153' }
];

const SEED_NOTIFICATIONS: NotificationItem[] = [
  { id: 'notif-1', type: 'critical_issue', title: 'Kritik Arıza Uyarısı', message: 'GENEX iklimlendirme arızası bildirdi (TFX-2026-000153)', date: '2026-08-11T14:30:00.000Z', read: false, reportTrackingCode: 'TFX-2026-000153' },
  { id: 'notif-2', type: 'new_report', title: 'Yeni Bildirim Gönderildi', message: 'E-GÜVEN fiber ağ portu arızası bildirdi (TFX-2026-000154)', date: '2026-08-12T08:10:00.000Z', read: false, reportTrackingCode: 'TFX-2026-000154' },
  { id: 'notif-3', type: 'stale_issue', title: 'Bekleyen Rapor Hatırlatması', message: 'TECH DÜNYA asansör raporu (TFX-2026-000155) teknik değerlendirme bekliyor.', date: '2026-08-12T09:00:00.000Z', read: false, reportTrackingCode: 'TFX-2026-000155' }
];

// Helper to initialize local storage & migrate to 19 real companies
export const initializeStorage = () => {
  const version = localStorage.getItem('techfix_storage_version');
  if (version !== CURRENT_STORAGE_VERSION) {
    localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify(SEED_COMPANIES));
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(SEED_REPORTS));
    localStorage.setItem(STORAGE_KEYS.METERS, JSON.stringify(SEED_METERS));
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(SEED_LOGS));
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(SEED_NOTIFICATIONS));
    localStorage.setItem('techfix_storage_version', CURRENT_STORAGE_VERSION);
    return;
  }

  if (!localStorage.getItem(STORAGE_KEYS.REPORTS)) {
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(SEED_REPORTS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.METERS)) {
    localStorage.setItem(STORAGE_KEYS.METERS, JSON.stringify(SEED_METERS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.COMPANIES)) {
    localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify(SEED_COMPANIES));
  }
  if (!localStorage.getItem(STORAGE_KEYS.LOGS)) {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(SEED_LOGS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)) {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(SEED_NOTIFICATIONS));
  }
};

// Generate unique tracking code format TFX-YYYY-XXXXXX
export const generateTrackingCode = (): string => {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `TFX-${year}-${randomNum}`;
};

// Reports API
export const getReports = (): Report[] => {
  initializeStorage();
  const data = localStorage.getItem(STORAGE_KEYS.REPORTS);
  return data ? JSON.parse(data) : SEED_REPORTS;
};

export const getReportByTrackingCode = (code: string): Report | undefined => {
  const reports = getReports();
  return reports.find(r => r.trackingCode.trim().toUpperCase() === code.trim().toUpperCase());
};

// Check for active duplicate report for same company/office location and category
export const checkDuplicateReport = (companyId: string, category: CategoryType): Report | null => {
  const reports = getReports();

  const duplicate = reports.find(r => {
    if (r.companyId !== companyId || r.category !== category) return false;
    // Resolved and Archived reports are NOT duplicates
    if (r.status === 'Resolved' || r.status === 'Archived') return false;
    return true;
  });

  return duplicate || null;
};

// Check if current device has already voted for an affected report
export const hasUserVotedForReport = (reportId: string): boolean => {
  try {
    const votes = JSON.parse(localStorage.getItem('techfix_upvoted_reports') || '[]');
    return Array.isArray(votes) && votes.includes(reportId);
  } catch {
    return false;
  }
};

// Increment affectedCount for an existing active report ("Ben de aynı sorunu yaşıyorum")
export const incrementReportAffectedCount = (reportId: string): {
  success: boolean;
  newCount: number;
  message: string;
  alreadyVoted?: boolean;
} => {
  const reports = getReports();
  const reportIndex = reports.findIndex(r => r.id === reportId);

  if (reportIndex === -1) {
    return { success: false, newCount: 1, message: 'Bildirim kaydı bulunamadı.' };
  }

  const report = reports[reportIndex];
  const currentCount = report.affectedCount ?? 1;

  if (hasUserVotedForReport(reportId)) {
    return {
      success: false,
      newCount: currentCount,
      message: 'Bu bildirim için zaten etkilendiğinizi belirttiniz.',
      alreadyVoted: true
    };
  }

  const newCount = currentCount + 1;
  reports[reportIndex] = {
    ...report,
    affectedCount: newCount,
    lastUpdatedDate: new Date().toISOString()
  };

  localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));

  // Store device vote token to prevent duplicate clicks from same device
  try {
    const votes = JSON.parse(localStorage.getItem('techfix_upvoted_reports') || '[]');
    if (!votes.includes(reportId)) {
      votes.push(reportId);
      localStorage.setItem('techfix_upvoted_reports', JSON.stringify(votes));
    }
  } catch (err) {
    console.error('Failed to store device vote:', err);
  }

  return {
    success: true,
    newCount,
    message: 'Teşekkürler. Bu sorundan etkilendiğiniz kaydedildi.'
  };
};

export const createReport = (data: {
  companyId: string;
  category: CategoryType;
  description: string;
  photos: string[];
}): Report => {
  const reports = getReports();
  const companies = getCompanies();
  const company = companies.find(c => c.id === data.companyId);

  const trackingCode = generateTrackingCode();
  const now = new Date().toISOString();

  const newReport: Report = {
    id: `rep-${Date.now()}`,
    trackingCode,
    companyId: data.companyId,
    companyName: company ? company.name : 'Medeniyet Teknopark Kiracısı',
    building: company ? company.building : 'A Blok',
    floor: company ? company.floor : 'Zemin',
    officeNumber: company ? company.officeNumber : 'A101',
    category: data.category,
    description: data.description,
    photos: data.photos,
    status: 'New',
    priority: 'Medium',
    affectedCount: 1,
    submissionDate: now,
    lastUpdatedDate: now,
    timeline: [
      {
        id: `t-${Date.now()}`,
        date: now,
        status: 'New',
        note: 'Bildirim QR kod ile dijital olarak oluşturuldu.',
        actor: 'User'
      }
    ]
  };

  const updated = [newReport, ...reports];
  localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(updated));

  // Log activity
  addActivityLog('Sistem', 'Rapor Oluşturuldu', `${newReport.companyName} (${newReport.building} - ${newReport.officeNumber}) tarafından yeni ${trackingCode} raporu gönderildi`, trackingCode);

  // Add notification for admin
  addNotification(
    'new_report',
    'Yeni Bildirim Gönderildi',
    `${newReport.companyName} (${newReport.officeNumber}) firması ${newReport.category} kategorisinde bildirim oluşturdu (${trackingCode})`,
    trackingCode
  );

  return newReport;
};

export const updateReportStatus = (
  reportId: string, 
  newStatus: ReportStatus, 
  note?: string,
  publicNote?: string,
  forceOverride: boolean = false
): Report | null => {
  requireAdminAuth();
  const reports = getReports();
  const index = reports.findIndex(r => r.id === reportId);
  if (index === -1) return null;

  const report = reports[index];

  // Enforce PRD 3.10 status transition lifecycle rules
  if (!forceOverride && report.status !== newStatus) {
    const allowedNext = VALID_STATUS_TRANSITIONS[report.status] || [];
    if (!allowedNext.includes(newStatus)) {
      throw new Error(`GEÇERSİZ_DURUM_GEÇİŞİ: "${STATUS_LABELS_TR[report.status]}" durumundan doğrudan "${STATUS_LABELS_TR[newStatus]}" durumuna geçilemez.`);
    }
  }

  const now = new Date().toISOString();

  const timelineEvent = {
    id: `t-${Date.now()}`,
    date: now,
    status: newStatus,
    note: note || `Durum ${STATUS_LABELS_TR[newStatus]} olarak güncellendi`,
    actor: 'Administrator' as const
  };

  report.status = newStatus;
  report.lastUpdatedDate = now;
  if (newStatus === 'Resolved') {
    report.resolutionDate = now;
  }
  if (publicNote !== undefined) {
    report.publicNotes = publicNote;
  }

  report.timeline = [timelineEvent, ...report.timeline];
  reports[index] = report;

  localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));

  addActivityLog('Yönetici', 'Durum Güncellendi', `${report.trackingCode} kodlu raporun durumu "${STATUS_LABELS_TR[newStatus]}" olarak değiştirildi`, report.trackingCode);

  return report;
};

export const updateReportPriority = (reportId: string, priority: ReportPriority): Report | null => {
  requireAdminAuth();
  const reports = getReports();
  const index = reports.findIndex(r => r.id === reportId);
  if (index === -1) return null;

  reports[index].priority = priority;
  reports[index].lastUpdatedDate = new Date().toISOString();

  localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));

  addActivityLog('Yönetici', 'Öncelik Değiştirildi', `${reports[index].trackingCode} kodlu raporun önceliği "${priority}" yapıldı`, reports[index].trackingCode);

  return reports[index];
};

export const updateReportAdminNotes = (reportId: string, adminNotes: string, publicNotes?: string): Report | null => {
  requireAdminAuth();
  const reports = getReports();
  const index = reports.findIndex(r => r.id === reportId);
  if (index === -1) return null;

  reports[index].adminNotes = adminNotes;
  if (publicNotes !== undefined) {
    reports[index].publicNotes = publicNotes;
  }
  reports[index].lastUpdatedDate = new Date().toISOString();

  localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
  return reports[index];
};

export const deleteReport = (reportId: string): boolean => {
  requireAdminAuth();
  const reports = getReports();
  const target = reports.find(r => r.id === reportId);
  const filtered = reports.filter(r => r.id !== reportId);
  localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(filtered));

  if (target) {
    addActivityLog('Yönetici', 'Rapor Silindi', `${target.trackingCode} kodlu rapor silindi`);
  }
  return true;
};

// Meter Records API
export const getMeterRecords = (): MeterRecord[] => {
  initializeStorage();
  const data = localStorage.getItem(STORAGE_KEYS.METERS);
  return data ? JSON.parse(data) : SEED_METERS;
};

export const createMeterRecord = (data: {
  companyId: string;
  meterType: 'Electricity' | 'Natural Gas';
  photoUrl: string;
  readingValue?: number;
  notes?: string;
}): MeterRecord => {
  const records = getMeterRecords();
  const companies = getCompanies();
  const company = companies.find(c => c.id === data.companyId);

  const newRecord: MeterRecord = {
    id: `met-${Date.now()}`,
    companyId: data.companyId,
    companyName: company ? company.name : 'Medeniyet Teknopark Kiracısı',
    building: company ? company.building : 'A Blok',
    floor: company ? company.floor : 'Zemin',
    meterType: data.meterType,
    photoUrl: data.photoUrl,
    readingValue: data.readingValue,
    notes: data.notes,
    uploadDate: new Date().toISOString(),
    uploadedBy: 'Teknopark Yetkili Personeli'
  };

  const updated = [newRecord, ...records];
  localStorage.setItem(STORAGE_KEYS.METERS, JSON.stringify(updated));

  addActivityLog('Sistem', 'Sayaç Okuması Yüklendi', `${data.meterType === 'Electricity' ? 'Elektrik' : 'Doğalgaz'} sayacı ${newRecord.companyName} (${newRecord.building}) için yüklendi`);

  return newRecord;
};

// Companies API (Centralized Single Source of Truth)
export const getCompanies = (): Company[] => {
  initializeStorage();
  const data = localStorage.getItem(STORAGE_KEYS.COMPANIES);
  return data ? JSON.parse(data) : SEED_COMPANIES;
};

// Notifications API
export const getNotifications = (): NotificationItem[] => {
  initializeStorage();
  const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
  return data ? JSON.parse(data) : SEED_NOTIFICATIONS;
};

export const addNotification = (
  type: 'new_report' | 'critical_issue' | 'stale_issue',
  title: string,
  message: string,
  trackingCode?: string
) => {
  const items = getNotifications();
  const newItem: NotificationItem = {
    id: `notif-${Date.now()}`,
    type,
    title,
    message,
    date: new Date().toISOString(),
    read: false,
    reportTrackingCode: trackingCode
  };
  localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([newItem, ...items]));
};

export const markNotificationRead = (id: string) => {
  const items = getNotifications();
  const updated = items.map(n => n.id === id ? { ...n, read: true } : n);
  localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
};

export const clearAllNotifications = () => {
  localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([]));
};

// Activity Logs API
export const getActivityLogs = (): ActivityLog[] => {
  initializeStorage();
  const data = localStorage.getItem(STORAGE_KEYS.LOGS);
  return data ? JSON.parse(data) : SEED_LOGS;
};

export const addActivityLog = (actor: string, action: string, details: string, trackingCode?: string) => {
  const logs = getActivityLogs();
  const newLog: ActivityLog = {
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    actor,
    action,
    details,
    reportTrackingCode: trackingCode
  };
  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify([newLog, ...logs].slice(0, 50)));
};

// Reset system to clean initial state
export const resetSeedData = () => {
  requireAdminAuth();
  localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify(SEED_COMPANIES));
  localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(SEED_REPORTS));
  localStorage.setItem(STORAGE_KEYS.METERS, JSON.stringify(SEED_METERS));
  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(SEED_LOGS));
  localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(SEED_NOTIFICATIONS));
  localStorage.setItem('techfix_storage_version', CURRENT_STORAGE_VERSION);
};
