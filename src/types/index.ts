export type ReportStatus = 
  | 'New' 
  | 'Under Review' 
  | 'Assigned' 
  | 'In Progress' 
  | 'Resolved' 
  | 'Archived';

export const VALID_STATUS_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  'New': ['New', 'Under Review'],
  'Under Review': ['New', 'Under Review', 'Assigned'],
  'Assigned': ['Under Review', 'Assigned', 'In Progress'],
  'In Progress': ['Assigned', 'In Progress', 'Resolved'],
  'Resolved': ['In Progress', 'Resolved', 'Archived'],
  'Archived': ['Resolved', 'Archived']
};

export type ReportPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export type CategoryType = 
  | 'Electrical'
  | 'Internet / Network'
  | 'Water & Plumbing'
  | 'Air Conditioning'
  | 'Elevator'
  | 'Cleaning'
  | 'Security'
  | 'Common Areas'
  | 'Equipment'
  | 'Suggestion'
  | 'Request'
  | 'Other';

export interface Company {
  id: string;
  name: string;
  building: string;
  floor: string;
  officeNumber: string;
  qrCodeRef: string;
}

export interface TimelineEvent {
  id: string;
  date: string;
  status: ReportStatus;
  note?: string;
  actor: 'User' | 'Administrator';
}

export interface Report {
  id: string;
  trackingCode: string;
  companyId: string;
  companyName: string;
  building: string;
  floor: string;
  officeNumber: string;
  category: CategoryType;
  description: string;
  photos: string[];
  status: ReportStatus;
  priority: ReportPriority;
  submissionDate: string;
  lastUpdatedDate: string;
  resolutionDate?: string;
  adminNotes?: string; // Private administrator notes
  publicNotes?: string; // Visible on tracking page
  timeline: TimelineEvent[];
}

export type MeterType = 'Electricity' | 'Natural Gas';

export interface MeterRecord {
  id: string;
  companyId: string;
  companyName: string;
  building: string;
  floor: string;
  meterType: MeterType;
  photoUrl: string;
  readingValue?: number;
  notes?: string;
  uploadDate: string;
  uploadedBy: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
  reportTrackingCode?: string;
}

export interface NotificationItem {
  id: string;
  type: 'new_report' | 'critical_issue' | 'stale_issue';
  title: string;
  message: string;
  date: string;
  read: boolean;
  reportTrackingCode?: string;
}

export interface FilterOptions {
  search: string;
  category: string;
  status: string;
  priority: string;
  company: string;
  dateRange: 'all' | 'today' | 'week' | 'month';
}

export type ActiveTab = 
  | 'welcome' 
  | 'create-report' 
  | 'success' 
  | 'track' 
  | 'meter-upload' 
  | 'admin-dashboard' 
  | 'admin-reports' 
  | 'admin-meters' 
  | 'admin-qr' 
  | 'admin-settings' 
  | 'error-404' 
  | 'error-500' 
  | 'error-offline' 
  | 'error-denied';

// Turkish UI Display Mappings (Preserves internal code values while rendering Turkish text to user)
export const STATUS_LABELS_TR: Record<ReportStatus, string> = {
  'New': 'Yeni',
  'Under Review': 'İnceleniyor',
  'Assigned': 'Atandı',
  'In Progress': 'İşlemde',
  'Resolved': 'Çözüldü',
  'Archived': 'Arşivlendi',
};

export const PRIORITY_LABELS_TR: Record<ReportPriority, string> = {
  'Low': 'Düşük',
  'Medium': 'Orta',
  'High': 'Yüksek',
  'Critical': 'Kritik',
};

export const METER_TYPE_LABELS_TR: Record<MeterType, string> = {
  'Electricity': 'Elektrik',
  'Natural Gas': 'Doğalgaz',
};

export const CATEGORY_LABELS_TR: Record<CategoryType, string> = {
  'Electrical': 'Elektrik Arızası',
  'Internet / Network': 'İnternet / Ağ',
  'Water & Plumbing': 'Su ve Tesisat',
  'Air Conditioning': 'Klima',
  'Elevator': 'Asansör',
  'Cleaning': 'Temizlik Hizmeti',
  'Security': 'Güvenlik Talebi',
  'Common Areas': 'Ortak Alanlar',
  'Equipment': 'Ekipman Tamiri',
  'Suggestion': 'Öneri',
  'Request': 'Genel Talep',
  'Other': 'Diğer',
};

