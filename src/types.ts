export type Role = 'guest' | 'company' | 'admin';
export type Company = {
  id: string; name: string; block: string | null; floor: string | null; office_code: string | null;
  email: string | null; logo_path: string | null; is_active: boolean; auth_user_id?: string | null; location_id: string | null;
  removed_at: string | null;
};
export type Location = { id:string; block:string; floor:string; office_code:string; is_active:boolean; companies?: Pick<Company,'id'|'name'|'is_active'|'removed_at'>[] };
export type Category = { id: string; code: string; name: string; is_active: boolean; sort_order: number };
export type TicketStatus = 'new' | 'under_review' | 'in_progress' | 'resolved' | 'archived';
export type Ticket = {
  id: string; company_id: string; category_id: string; title: string; description: string; photo_path: string | null;
  status: TicketStatus; admin_public_note: string | null; created_at: string; updated_at: string; resolved_at: string | null;
  companies?: Pick<Company, 'name' | 'block' | 'floor' | 'office_code'> | null; categories?: Pick<Category, 'code' | 'name'> | null;
};
export type Notification = {
  id: string; audience: 'admin' | 'company'; company_id: string | null; ticket_id: string | null;
  meter_reading_id: string | null; type: 'ticket_updated' | 'password_request' | 'meter_created'; title: string; message: string; read_at: string | null; created_at: string;
  translation_key: string; translation_params: Record<string, string>;
  companies?: Pick<Company, 'name'> | null;
};
export type MeterReading = {
  id: string; meter_type: 'electricity' | 'natural_gas'; photo_path: string; reading_value: number | null;
  notes: string | null; access_method: 'qr' | 'pin'; created_at: string;
};
