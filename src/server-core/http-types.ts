export type HandlerResult<T> = {
  status: number;
  body: T | { error: string };
};

export type CheckoutItemInput = {
  name: string;
  image_url?: string;
  price: number;
  cartQuantity?: number;
};

export type CheckoutInput = {
  items: CheckoutItemInput[];
  orderRef?: string;
};

export type PaymentLinkInput = {
  amount: number;
  description?: string;
};
