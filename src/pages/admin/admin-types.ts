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
  name: string;
  email: string | null;
  phone: string | null;
  document: string | null;
  notes: string | null;
  created_at: string;
};

export type AdminCustomerDraft = {
  name: string;
  email: string;
  phone: string;
  document: string;
  notes: string;
};

export type AdminOrderRow = {
  id: string;
  order_code: string | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  status: string;
  total: number;
  payment_status: string;
  created_at: string;
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
  driverName: string;
  note: string;
};
