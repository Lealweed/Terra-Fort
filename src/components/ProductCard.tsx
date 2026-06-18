import { useState } from 'react';
import { MessageCircle, ShoppingBag, Package, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../types';
import { useCart } from '../contexts/CartContext';
import SafeImage from './SafeImage';
import { buildWhatsAppUrl, getSupportUserFallbackMessage, openSupportWhatsapp, submitSupportRequest } from '../lib/customerSupport';
import { buildProductSupportRequest } from '../lib/productSupport';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [supportLoading, setSupportLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  const isLowStock = product.stock_level && product.stock_level <= 10 && product.stock_level > 0;
  const isOutOfStock = product.stock_level === 0;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const handleCardClick = () => {
    navigate(`/product/${product.id}`);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product);
  };

  const handleQuoteRequest = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setSupportLoading(true);

    const supportPayload = buildProductSupportRequest(product, 'product_card');
    try {
      const result = await submitSupportRequest(supportPayload);
      const fallbackMessage = getSupportUserFallbackMessage(result);
      if (fallbackMessage) alert(fallbackMessage);
      openSupportWhatsapp(result.whatsappUrl, 'product_card');
    } catch (error) {
      console.error('[support] product_card_unexpected_error_fallback_whatsapp', {
        productId: product.id,
        error: error instanceof Error ? error.message : String(error),
      });
      alert('Não conseguimos iniciar o atendimento agora. Vamos abrir o WhatsApp para você continuar.');
      openSupportWhatsapp(buildWhatsAppUrl(supportPayload.message), 'product_card');
    } finally {
      setSupportLoading(false);
    }
  };

  return (
    <motion.div 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
      className="group relative bg-white border border-gray-100 flex flex-col h-full cursor-pointer overflow-hidden transition-all duration-500"
      whileHover={{ y: -10 }}
    >
      {/* Image Container */}
      <div className="relative aspect-square bg-[#F5F5F5] overflow-hidden">
        {product.image_url ? (
          <motion.div
            className="w-full h-full"
            animate={{ 
              scale: isHovered ? 1.08 : 1,
              filter: isHovered ? 'brightness(1.02)' : 'brightness(1)'
            }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <SafeImage
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover mix-blend-multiply p-10 md:p-12"
            />
          </motion.div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
            <Package className="w-12 h-12 mb-2 opacity-10" />
            <span className="text-[10px] font-black uppercase tracking-[0.25em] opacity-40">Sem Imagem</span>
          </div>
        )}

        {/* Action Reveal Overlay */}
        <AnimatePresence>
          {isHovered && !isOutOfStock && (
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute inset-x-0 bottom-0 z-30 p-4"
            >
              {product.sob_consulta ? (
                <button 
                  onClick={handleQuoteRequest}
                  disabled={supportLoading}
                  className="w-full bg-[#25D366] text-white py-4 px-6 font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-2 shadow-2xl active:scale-95 transition-all hover:bg-[#20b858]"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>{supportLoading ? 'Abrindo...' : 'Zap Cotação'}</span>
                </button>
              ) : (
                <button 
                  onClick={handleAddToCart}
                  className="w-full bg-brand-black text-white py-4 px-6 font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-2 shadow-2xl active:scale-95 transition-all hover:bg-brand-orange hover:text-brand-black"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Adicionar</span>
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status Badges */}
        <div className="absolute top-5 left-5 flex flex-col gap-2 z-20">
          <span className="bg-brand-black text-white text-[8px] font-black px-3 py-1.5 uppercase tracking-[0.25em]">
            {product.category}
          </span>
          {product.original_price && product.original_price > product.price && !product.sob_consulta && (
            <span className="bg-brand-orange text-brand-black text-[8px] font-black px-3 py-1.5 uppercase tracking-[0.25em]">
              Promo
            </span>
          )}
        </div>

        {/* Stock Indicator */}
        <div className="absolute top-5 right-5 z-20">
          {isOutOfStock ? (
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-red-500 border border-red-500/20 bg-red-50/50 backdrop-blur-sm px-2 py-1">Esgotado</span>
          ) : isLowStock ? (
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-brand-orange border border-brand-orange/20 bg-orange-50/50 backdrop-blur-sm px-2 py-1">Últimas peças</span>
          ) : null}
        </div>
      </div>

      {/* Info Container */}
      <div className="p-6 md:p-8 flex flex-col flex-1 bg-white relative">
        <div className="flex justify-between items-start gap-4 mb-3">
          <h3 className="font-heading font-black text-lg md:text-2xl text-brand-black leading-tight uppercase tracking-tight group-hover:text-brand-orange transition-colors duration-500">
            {product.name}
          </h3>
          <motion.div
            animate={{ 
              x: isHovered ? 2 : 0,
              y: isHovered ? -2 : 0,
              opacity: isHovered ? 1 : 0.2
            }}
          >
            <ArrowUpRight className="w-5 h-5 text-brand-orange flex-shrink-0" />
          </motion.div>
        </div>
        
        <p className="text-xs text-gray-400 mb-8 line-clamp-2 font-medium leading-relaxed uppercase tracking-wider">
          {product.description}
        </p>
        
        <div className="mt-auto">
          {product.sob_consulta ? (
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-pulse" />
              <span className="text-brand-black font-black uppercase tracking-[0.2em] text-[10px]">
                Sob Consulta
              </span>
            </div>
          ) : (
            <div className="flex flex-col">
              {product.original_price && product.original_price > product.price && (
                <span className="text-[10px] text-gray-300 font-black uppercase tracking-widest line-through mb-1">
                  {formatPrice(product.original_price)}
                </span>
              )}
              <div className="flex items-baseline gap-1.5">
                <span className="text-[10px] font-black text-brand-orange uppercase">BRL</span>
                <span className="font-heading text-2xl md:text-4xl font-black text-brand-black tracking-tighter">
                  {formatPrice(product.price).replace('R$', '').trim().split(',')[0]}
                  <span className="text-base font-bold ml-0.5 opacity-60">,{formatPrice(product.price).replace('R$', '').trim().split(',')[1]}</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Subtle border line that grows on hover */}
      <div className="absolute inset-x-0 bottom-0 h-1 bg-brand-orange scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-left" />
    </motion.div>
  );
}
