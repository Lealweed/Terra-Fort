import type { Product } from '../types';
import type { SupportPayload } from './customerSupport';

export type ProductSupportSource = 'product_card' | 'product_details';

export function buildProductSupportRequest(product: Product, source: ProductSupportSource, quantity = 1): SupportPayload {
  const requestedQuantity = Number.isInteger(quantity) && quantity > 0 ? quantity : 1;

  return {
    source,
    intent: product.sob_consulta ? 'quote_request' : 'price_question',
    message: `Olá, visualizando o produto *${product.name}* no site.\nGostaria de mais informações/orçamento.\nQuantidade desejada: ${requestedQuantity}.`,
    product: {
      id: product.id,
      name: product.name,
      category: product.category,
      price: Number(product.price || 0),
      original_price: product.original_price,
      sob_consulta: !!product.sob_consulta,
      stock_level: Number(product.stock_level || 0),
    },
    items: [
      {
        id: product.id,
        name: product.name,
        quantity: requestedQuantity,
        unitPrice: Number(product.price || 0),
        sobConsulta: !!product.sob_consulta,
      },
    ],
    metadata: {
      channel: 'site_product',
      requestedQuantity,
    },
  };
}
