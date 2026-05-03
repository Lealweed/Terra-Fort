export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price?: number;
  category: string;
  image_url: string;
  images?: string[];
  video_url?: string;
  brand?: string;
  features?: string[];
  specifications?: Record<string, string>;
  sob_consulta: boolean;
  stock_level: number; // For admin
}

export interface Order {
  id: string;
  customer_name: string;
  total: number;
  status: 'Pendente' | 'Pago' | 'Em rota de entrega';
  date: string;
}

