import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { MessageCircle, ShoppingBag, ArrowLeft, ShieldCheck, Truck, Package, Play, ChevronRight, Plus, Minus } from 'lucide-react';
import { getProductById } from '../lib/products';
import { useCart } from '../contexts/CartContext';
import SafeImage from '../components/SafeImage';
import { Product } from '../types';
import { getSupportUserFallbackMessage, openSupportWhatsapp, submitSupportRequest } from '../lib/customerSupport';
import { buildProductSupportRequest } from '../lib/productSupport';

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [supportLoading, setSupportLoading] = useState(false);

  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    let mounted = true;

    if (!id) {
      setLoading(false);
      return;
    }

    getProductById(id).then((data) => {
      if (!mounted) return;
      setProduct(data);
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">Carregando produto...</h2>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">Produto não encontrado</h2>
        <Link to="/" className="text-brand-orange hover:underline">Voltar para o catálogo</Link>
      </div>
    );
  }

  const allMedia = [
    ...(product.images || [product.image_url]).filter(Boolean),
    ...(product.video_url ? [product.video_url] : [])
  ];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const isLowStock = product.stock_level && product.stock_level <= 10 && product.stock_level > 0;
  const isOutOfStock = product.stock_level === 0;

  const handleAddToCart = () => {
    addToCart(product, quantity);
  };

  const handleTalkToSupport = async () => {
    setSupportLoading(true);

    try {
      const result = await submitSupportRequest(buildProductSupportRequest(product, 'product_details', quantity));
      const fallbackMessage = getSupportUserFallbackMessage(result);
      if (fallbackMessage) alert(fallbackMessage);
      openSupportWhatsapp(result.whatsappUrl, 'product_details');
    } finally {
      setSupportLoading(false);
    }
  };

  return (
    <div className="bg-brand-offwhite min-h-screen">
      {/* Breadcrumb Navigation */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-brand-orange active:scale-95 transition-all font-medium mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para listagem
        </button>
        <div className="flex items-center flex-wrap text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider gap-x-2 gap-y-1">
          <Link to="/" className="hover:text-brand-orange active:scale-95 transition-all">Catálogo</Link>
          <ChevronRight className="w-3 h-3" />
          <span>{product.category}</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-brand-orange line-clamp-1">{product.name}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-20">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="flex flex-col lg:flex-row">
            
            {/* Left Column: Images Gallery */}
            <div className="lg:w-1/2 p-6 lg:p-10 border-b lg:border-b-0 lg:border-r border-gray-100 bg-gray-50/50">
              {/* Main Image/Video Display */}
              <div className="aspect-square bg-white rounded-xl border border-gray-100 flex items-center justify-center overflow-hidden mb-4 relative shadow-sm">
                {!product.image_url && (!product.images || product.images.length === 0) ? (
                  <div className="flex flex-col items-center justify-center text-gray-300">
                    <Package className="w-20 h-20 mb-4 opacity-50" />
                    <span className="font-medium">Imagem Indisponível</span>
                  </div>
                ) : (
                  <>
                    {allMedia[activeImage].endsWith('.mp4') ? (
                      <video 
                        src={allMedia[activeImage]} 
                        controls 
                        autoPlay 
                        muted 
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <SafeImage
                        src={allMedia[activeImage]}
                        alt={product.name}
                        className="w-full h-full object-contain p-4"
                      />
                    )}
                  </>
                )}
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <span className="bg-brand-black/80 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-sm">
                    {product.brand || 'Diverso'}
                  </span>
                  {product.original_price && product.original_price > product.price && (
                    <span className="bg-red-600/90 backdrop-blur-md text-white text-[11px] font-black px-3 py-1.5 rounded-full shadow-lg border border-red-500 uppercase tracking-widest animate-pulse">
                      Promoção
                    </span>
                  )}
                </div>
              </div>

              {/* Thumbnails */}
              {allMedia.length > 1 && (
                <div className="grid grid-cols-5 gap-3">
                  {allMedia.map((media, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveImage(index)}
                      className={`aspect-square rounded-lg border-2 overflow-hidden flex items-center justify-center bg-white transition-all ${
                        activeImage === index ? 'border-brand-orange shadow-md scale-105' : 'border-gray-100 hover:border-gray-300'
                      }`}
                    >
                      {media.endsWith('.mp4') ? (
                        <div className="relative w-full h-full flex items-center justify-center bg-gray-100">
                          <Play className="w-6 h-6 text-gray-500" fill="currentColor" />
                        </div>
                      ) : (
                        <SafeImage src={media} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Product Info & Actions */}
            <div className="lg:w-1/2 p-6 lg:p-10 flex flex-col">
              <div className="mb-2">
                <span className="inline-block bg-gray-100 text-gray-600 text-[10px] font-black px-2.5 py-1 rounded-sm uppercase tracking-widest mb-4">
                  REF: TF-{product.id.padStart(4, '0')}
                </span>
              </div>
              
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-brand-black leading-tight tracking-tight mb-4 break-words">
                {product.name}
              </h1>
              
              <p className="text-base lg:text-lg text-gray-500 leading-relaxed mb-8">
                {product.description}
              </p>

              {/* Price Block */}
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 md:p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  {product.sob_consulta ? (
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-brand-orange animate-pulse"></div>
                      <span className="text-brand-black/50 font-bold uppercase tracking-widest text-sm md:text-lg">
                        Preço sob consulta
                      </span>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs md:text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Preço À Vista</p>
                      {product.original_price && product.original_price > product.price && (
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-gray-400 font-bold line-through">
                            {formatPrice(product.original_price)}
                          </span>
                          <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-md">
                            Desconto de {Math.max(1, Math.round(((product.original_price - product.price) / product.original_price) * 100))}%
                          </span>
                        </div>
                      )}
                      <div className="flex items-baseline gap-1 relative">
                        <span className="text-base md:text-lg font-bold text-gray-400">R$</span>
                        <span className="text-4xl md:text-5xl font-black text-brand-black tracking-tighter flex items-baseline">
                          {formatPrice(product.price).replace('R$', '').trim().split(',')[0]}
                          <span className="text-xl md:text-2xl text-brand-orange">,{formatPrice(product.price).replace('R$', '').trim().split(',')[1]}</span>
                        </span>
                      </div>
                      <p className="text-xs md:text-sm font-bold text-gray-500 mt-2">
                        ou em até 6x sem juros no cartão
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                    {/* Quantity Selector */}
                    {!isOutOfStock && (
                      <div className="flex items-center justify-center gap-4 bg-white border border-gray-200 rounded-lg px-4 py-3 sm:py-4 w-full sm:w-auto h-[56px]">
                        <button 
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          className="text-gray-500 hover:text-brand-orange transition-colors"
                        >
                          <Minus className="w-5 h-5" />
                        </button>
                        <span className="text-lg font-bold w-8 text-center">{quantity}</span>
                        <button 
                          onClick={() => setQuantity(product.stock_level ? Math.min(product.stock_level, quantity + 1) : quantity + 1)}
                          className="text-gray-500 hover:text-brand-orange transition-colors"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                    
                    {product.sob_consulta ? (
                      <button 
                        onClick={handleTalkToSupport}
                        disabled={supportLoading}
                        className="w-full md:w-auto bg-[#25D366] hover:bg-[#20b858] hover:-translate-y-0.5 text-white disabled:opacity-60 disabled:cursor-wait flex items-center justify-center gap-3 py-4 px-6 md:px-8 rounded-lg font-bold text-base md:text-lg transition-all hover:shadow-md hover:shadow-[#25D366]/20 active:scale-95 whitespace-nowrap h-[56px]"
                      >
                        <MessageCircle className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
                        <span>{supportLoading ? 'Chamando atendimento...' : 'Adicionar ao Orçamento'}</span>
                      </button>
                    ) : (
                      <button 
                        onClick={handleAddToCart}
                        className={`w-full md:w-auto flex items-center justify-center gap-3 py-4 px-6 md:px-8 rounded-lg font-bold text-base md:text-lg transition-all active:scale-95 whitespace-nowrap h-[56px] ${
                          isOutOfStock 
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                          : 'bg-brand-orange hover:bg-orange-600 hover:-translate-y-0.5 text-brand-black hover:shadow-md hover:shadow-brand-orange/20'
                        }`}
                        disabled={isOutOfStock}
                      >
                        <ShoppingBag className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
                        <span>{isOutOfStock ? 'Produto Esgotado' : 'Adicionar'}</span>
                      </button>
                    )}
                </div>

                <button
                  onClick={handleTalkToSupport}
                  disabled={supportLoading}
                  className="mt-4 w-full md:w-auto border border-[#25D366] text-[#25D366] hover:bg-[#25D366] hover:text-white disabled:opacity-60 disabled:cursor-wait flex items-center justify-center gap-3 py-3 px-6 rounded-lg font-bold text-sm md:text-base transition-all active:scale-95"
                >
                  <MessageCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{supportLoading ? 'Chamando atendimento...' : 'Tirar dúvida no atendimento'}</span>
                </button>
              </div>

              {/* Confidence Hooks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <div className="flex items-start gap-3 p-4 rounded-xl border border-gray-100 bg-white shadow-sm">
                  <div className="p-2 bg-green-50 text-green-600 rounded-lg shrink-0">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-brand-black">Compra Segura</h4>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">Seus dados e pagamentos 100% protegidos.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-xl border border-gray-100 bg-white shadow-sm">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                    <Truck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-brand-black">Entrega Rápida</h4>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">Frotas próprias em Parauapebas e região.</p>
                  </div>
                </div>
              </div>

              {/* Content Tabs (Features and Specifications) */}
              <div className="mt-auto pt-6 border-t border-gray-100">
                
                {product.features && product.features.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-black text-brand-black uppercase tracking-wider mb-4 border-l-4 border-brand-orange pl-3">Indicações e Vantagens</h3>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {product.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-gray-600 bg-white p-3 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-brand-orange/30 transition-all hover:-translate-y-0.5 group">
                          <span className="w-2 h-2 rounded-full bg-brand-orange shrink-0 mt-1.5 group-hover:scale-125 transition-transform"></span>
                          <span className="leading-relaxed text-sm font-medium">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {product.specifications && Object.keys(product.specifications).length > 0 && (
                  <div>
                    <h3 className="text-lg font-black text-brand-black uppercase tracking-wider mb-4 border-l-4 border-brand-orange pl-3">Ficha Técnica</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {Object.entries(product.specifications).map(([key, value]) => (
                          <div 
                            key={key} 
                            className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col hover:border-brand-orange/50 hover:shadow-md hover:-translate-y-1 transition-all group cursor-default"
                          >
                            <dt className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest mb-2 border-b border-gray-100 pb-2 group-hover:border-brand-orange/20 transition-colors">{key}</dt>
                            <dd className="text-sm font-bold text-brand-black group-hover:text-brand-orange transition-colors">{value}</dd>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
                
              </div>

            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
