import { MessageCircle, ShoppingBag, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Product } from '../types';
import { useCart } from '../contexts/CartContext';
import SafeImage from './SafeImage';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  
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

  return (
    <div 
      onClick={handleCardClick}
      className="bg-white rounded-2xl shadow-sm hover:shadow-2xl border border-gray-100 hover:border-brand-orange/30 overflow-hidden group hover:-translate-y-2 transition-all duration-500 ease-out flex flex-col h-full cursor-pointer relative"
    >
      <div className="h-60 bg-gray-50 flex items-center justify-center p-6 relative overflow-hidden">
        {/* Placeholder image if not provided */}
        {product.image_url ? (
          <>
            <div className="absolute inset-0 bg-brand-black/5 opacity-0 group-hover:opacity-100 transition-opacity z-10" />
            <SafeImage
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out z-0 mix-blend-multiply"
            />
          </>
        ) : (
          <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center text-gray-400">
            <Package className="w-10 h-10 mb-2 opacity-50" />
            <span className="text-sm font-medium">Sem Imagem</span>
          </div>
        )}

        {/* Badges Container */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-start z-20 pointer-events-none gap-2">
          <div className="flex flex-col items-start gap-2">
            {/* Category Tag */}
            <div className="bg-white/90 backdrop-blur-md text-brand-black text-[10px] sm:text-xs font-bold px-3 py-1.5 rounded-full shadow-sm border border-gray-100 uppercase tracking-widest pointer-events-auto">
              {product.category}
            </div>

            {/* Discount Tag */}
            {product.original_price && !product.sob_consulta && product.original_price > product.price && (
              <div className="bg-red-600/90 text-white text-[10px] sm:text-[11px] font-black px-3 py-1.5 rounded-full shadow-lg border border-red-500 uppercase tracking-widest animate-pulse pointer-events-auto">
                Promoção
              </div>
            )}
          </div>

          {/* Stock Tag */}
          {!product.sob_consulta && (
            <div className="pointer-events-auto shrink-0 flex flex-col items-end gap-1">
               {isOutOfStock ? (
                 <div className="bg-red-50/90 backdrop-blur-md text-red-600 text-[10px] font-black px-2 py-1.5 rounded-md shadow-sm border border-red-100 uppercase tracking-wider">Esgotado</div>
               ) : isLowStock ? (
                 <div className="bg-orange-50/90 backdrop-blur-md text-orange-600 text-[10px] font-black px-2 py-1.5 rounded-md shadow-sm border border-orange-100 uppercase tracking-wider">Últimas peças</div>
               ) : (
                 <div className="bg-green-50/90 backdrop-blur-md text-green-600 text-[10px] font-black px-2 py-1.5 rounded-md shadow-sm border border-green-100 uppercase tracking-wider">Em Estoque</div>
               )}
            </div>
          )}
        </div>
      </div>
      
      <div className="p-5 md:p-6 flex flex-col flex-1 bg-white relative z-20">
        <h3 className="font-heading font-bold text-base md:text-xl text-brand-black leading-tight mb-2 flex-1 group-hover:text-brand-orange transition-colors line-clamp-2 md:line-clamp-none">
          {product.name}
        </h3>
        
        <p className="text-xs md:text-sm text-gray-500 mb-4 md:mb-6 line-clamp-2 leading-relaxed">
          {product.description}
        </p>
        
        <div className="mt-auto">
          {product.sob_consulta ? (
            <div className="mb-4">
              <span className="text-brand-black/40 font-bold uppercase tracking-wider text-xs md:text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-orange animate-pulse"></span>
                Preço sob consulta
              </span>
            </div>
          ) : (
            <div className="mb-4">
              {product.original_price && product.original_price > product.price && (
                <div className="text-gray-400 text-sm font-bold line-through mb-1 opacity-70">
                  {formatPrice(product.original_price)}
                </div>
              )}
              <div className="flex items-baseline gap-1 relative">
                <span className="text-sm font-bold text-gray-400">R$</span>
                <span className="font-heading text-3xl md:text-4xl font-black text-brand-black tracking-tighter flex items-baseline leading-none">
                  {formatPrice(product.price).replace('R$', '').trim().split(',')[0]}
                  <span className="text-base md:text-lg text-brand-orange font-bold tracking-normal ml-0.5">,{formatPrice(product.price).replace('R$', '').trim().split(',')[1]}</span>
                </span>
                {product.original_price && product.original_price > product.price && (
                   <div className="ml-2 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-md self-center relative -top-1">
                     -{Math.max(1, Math.round(((product.original_price - product.price) / product.original_price) * 100))}%
                   </div>
                )}
              </div>
            </div>
          )}
          
          <div className="pt-5 border-t border-gray-50 mt-2">
            {product.sob_consulta ? (
              <button 
                onClick={handleAddToCart}
                className="w-full bg-[#25D366] hover:bg-[#20b858] hover:-translate-y-1 text-white flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm md:text-base transition-all hover:shadow-lg hover:shadow-[#25D366]/30 active:scale-95"
              >
                <MessageCircle className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
                <span>Zap Cotação</span>
              </button>
            ) : (
              <button 
                onClick={handleAddToCart}
                className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm md:text-base transition-all duration-300 active:scale-95 ${
                  isOutOfStock 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-brand-black hover:bg-brand-orange hover:-translate-y-1 text-white hover:text-brand-black shadow-md hover:shadow-lg hover:shadow-brand-orange/30'
                }`}
                disabled={isOutOfStock}
              >
                <ShoppingBag className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
                <span>{isOutOfStock ? 'Indisponível' : 'Adicionar ao Carrinho'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
