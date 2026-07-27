export type ProductRow = {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price: number | null;
  category: string;
  image_url: string;
  video_url: string | null;
  brand: string | null;
  sob_consulta: boolean;
  stock_level: number;
  is_active: boolean;
  features?: string[];
  specifications?: Record<string, string>;
};

export type ProductDraft = Omit<ProductRow, 'id'>;

export type InventoryMovementRow = {
  id: string;
  movement_type: string;
  quantity: number;
  reason: string | null;
  created_at: string;
};

export type AdminCustomerRow = {
  id: string;
  customer_kind: 'person' | 'company';
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  document: string | null;
  notes: string | null;
  is_blocked: boolean;
  created_at: string;
};

export type AdminCustomerDraft = {
  customer_kind: 'person' | 'company';
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  document: string;
  notes: string;
  is_blocked: boolean;
};

export type AdminDriverStatus = 'available' | 'busy' | 'inactive';

export type AdminDriverRow = {
  id: string;
  name: string;
  phone: string | null;
  document: string | null;
  status: AdminDriverStatus;
  notes: string | null;
  created_at: string;
};

export type AdminDriverDraft = {
  name: string;
  phone: string;
  document: string;
  status: AdminDriverStatus;
  notes: string;
};

export type AdminSupportStatus = 'new' | 'bot' | 'waiting_human' | 'in_progress' | 'resolved';

export type AdminSupportTicketRow = {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  source: string;
  intent: string;
  status: AdminSupportStatus;
  handoff_requested: boolean;
  assigned_to: string | null;
  last_message: string | null;
  metadata: Record<string, any> | null;
  context: Record<string, any> | null;
  created_at: string;
  updated_at: string;
};

export type AdminSupportTicketDraft = {
  status: AdminSupportStatus;
  assigned_to: string;
  handoff_requested: boolean;
  internal_note: string;
};

export type AdminOrderRow = {
  id: string;
  order_code: string | null;
  customer_id?: string | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  status: string;
  total: number;
  payment_status: string;
  created_at: string;
  assigned_driver_id?: string | null;
  delivery_address: any;
};

export type AdminOrderEventRow = {
  id: string;
  event_type: string;
  description: string | null;
  actor_role: string | null;
  created_at: string;
};

export type AdminOrderItemRow = {
  id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
};

export type DeliveryDraft = {
  driverId: string;
  driverName: string;
  note: string;
};
