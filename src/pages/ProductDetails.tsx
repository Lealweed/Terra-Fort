import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { MessageCircle, ShoppingBag, ArrowLeft, ShieldCheck, Truck, Package, Play, ChevronRight, Plus, Minus } from 'lucide-react';
import { getProductById } from '../lib/products';
import { useCart } from '../contexts/CartContext';
import SafeImage from '../components/SafeImage';
import { Product } from '../types';
import { buildWhatsAppUrl, getSupportUserFallbackMessage, openSupportWhatsapp, submitSupportRequest } from '../lib/customerSupport';
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
        <h2 className="text-2xl font-bold mb-4 uppercase tracking-widest opacity-20">Carregando material...</h2>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-4 uppercase tracking-widest opacity-20">Material não encontrado</h2>
        <Link to="/" className="text-brand-orange hover:underline uppercase text-xs font-black tracking-widest">Voltar para o catálogo</Link>
      </div>
    );
  }

  const allMedia = [
    ...(product.images && product.images.length > 0 ? product.images : [product.image_url]).filter(Boolean),
    ...(product.video_url ? [product.video_url] : [])
  ];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const isOutOfStock = product.stock_level === 0;

  const handleAddToCart = () => {
    addToCart(product, quantity);
  };

  const handleTalkToSupport = async () => {
    setSupportLoading(true);

    const supportPayload = buildProductSupportRequest(product, 'product_details', quantity);
    try {
      const result = await submitSupportRequest(supportPayload);
      const fallbackMessage = getSupportUserFallbackMessage(result);
      if (fallbackMessage) alert(fallbackMessage);
      openSupportWhatsapp(result.whatsappUrl, 'product_details');
    } catch (error) {
      console.error('[support] product_details_unexpected_error_fallback_whatsapp', {
        productId: product.id,
        quantity,
        error: error instanceof Error ? error.message : String(error),
      });
      alert('Não conseguimos iniciar o atendimento agora. Vamos abrir o WhatsApp para você continuar.');
      openSupportWhatsapp(buildWhatsAppUrl(supportPayload.message), 'product_details');
    } finally {
      setSupportLoading(false);
    }
  };

  return (
    <div className="bg-brand-offwhite min-h-screen">
      {/* Breadcrumb Navigation */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 hover:text-brand-orange transition-all mb-8 group"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
          Voltar
        </button>
        <div className="flex items-center flex-wrap text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] gap-x-3 gap-y-2">
          <Link to="/" className="hover:text-brand-orange transition-all">Catálogo</Link>
          <div className="w-1 h-1 rounded-full bg-gray-200" />
          <span className="text-gray-400">{product.category}</span>
          <div className="w-1 h-1 rounded-full bg-gray-200" />
          <span className="text-brand-orange line-clamp-1">{product.name}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-32">
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="bg-white border border-gray-100 overflow-hidden shadow-premium"
        >
          <div className="flex flex-col lg:flex-row">
            
            {/* Left Column: Images Gallery */}
            <div className="lg:w-[55%] p-8 lg:p-16 border-b lg:border-b-0 lg:border-r border-gray-50 bg-[#F9F9F9]">
              {/* Main Image/Video Display */}
              <div className="aspect-square bg-white border border-gray-100 flex items-center justify-center overflow-hidden mb-8 relative group">
                {allMedia.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-gray-300">
                    <Package className="w-20 h-20 mb-4 opacity-10" />
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Indisponível</span>
                  </div>
                ) : (
                  <>
                    {allMedia[activeImage]?.endsWith('.mp4') ? (
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
                        className="w-full h-full object-cover mix-blend-multiply p-12 lg:p-20 transition-transform duration-1000 group-hover:scale-105"
                      />
                    )}
                  </>
                )}
                <div className="absolute top-8 left-8 flex flex-col gap-3">
                  <span className="bg-brand-black text-white text-[9px] font-black px-4 py-2 uppercase tracking-[0.3em] shadow-2xl">
                    {product.brand || 'Original'}
                  </span>
                  {product.original_price && product.original_price > product.price && (
                    <span className="bg-brand-orange text-brand-black text-[9px] font-black px-4 py-2 uppercase tracking-[0.3em] shadow-2xl">
                      Oferta Especial
                    </span>
                  )}
                </div>
              </div>

              {/* Thumbnails */}
              {allMedia.length > 1 && (
                <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                  {allMedia.map((media, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveImage(index)}
                      className={`w-24 h-24 shrink-0 border transition-all duration-500 overflow-hidden bg-white ${
                        activeImage === index ? 'border-brand-orange p-1 scale-105' : 'border-gray-100 opacity-60 hover:opacity-100'
                      }`}
                    >
                      {media.endsWith('.mp4') ? (
                        <div className="relative w-full h-full flex items-center justify-center bg-gray-50">
                          <Play className="w-5 h-5 text-gray-400" fill="currentColor" />
                        </div>
                      ) : (
                        <SafeImage src={media} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover mix-blend-multiply p-2" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Product Info & Actions */}
            <div className="lg:w-[45%] p-8 lg:p-16 flex flex-col">
              <div className="mb-10">
                <span className="inline-block text-[10px] font-black text-gray-300 uppercase tracking-[0.5em] mb-6">
                  Referência · TF-{product.id.padStart(4, '0')}
                </span>
                <h1 className="text-4xl lg:text-6xl font-black text-brand-black leading-[0.9] tracking-tighter uppercase mb-8">
                  {product.name}
                </h1>
                <p className="text-sm lg:text-base text-gray-400 font-medium leading-relaxed uppercase tracking-wider opacity-80">
                  {product.description}
                </p>
              </div>

              {/* Price Block */}
              <div className="mb-12">
                {product.sob_consulta ? (
                  <div className="flex items-center gap-4 py-6 border-y border-gray-50">
                    <div className="w-2 h-2 rounded-full bg-brand-orange animate-pulse"></div>
                    <span className="text-brand-black font-black uppercase tracking-[0.3em] text-sm lg:text-lg">
                      Preço sob consulta
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-brand-orange uppercase tracking-[0.4em]">Valor Final</p>
                    <div className="flex items-baseline gap-3">
                      <span className="text-xs font-black text-gray-400 uppercase tracking-widest">BRL</span>
                      <span className="text-6xl lg:text-8xl font-black text-brand-black tracking-tighter leading-none">
                        {formatPrice(product.price).replace('R$', '').trim().split(',')[0]}
                        <span className="text-2xl lg:text-4xl opacity-20">,{formatPrice(product.price).replace('R$', '').trim().split(',')[1]}</span>
                      </span>
                    </div>
                    {product.original_price && product.original_price > product.price && (
                      <div className="flex items-center gap-4 mt-4">
                        <span className="text-sm text-gray-300 font-black line-through uppercase tracking-widest">
                          {formatPrice(product.original_price)}
                        </span>
                        <div className="h-px w-8 bg-gray-100" />
                        <span className="text-[10px] font-black text-[#25D366] uppercase tracking-[0.2em]">
                          -{Math.round(((product.original_price - product.price) / product.original_price) * 100)}% de Desconto
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-stretch gap-4">
                    {!isOutOfStock && (
                      <div className="flex items-center justify-between bg-gray-50 px-6 py-5 rounded-sm w-full sm:w-48 border border-transparent hover:border-gray-200 transition-all">
                        <button 
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          className="text-gray-400 hover:text-brand-black transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-black uppercase tracking-widest">{quantity}</span>
                        <button 
                          onClick={() => setQuantity(product.stock_level ? Math.min(product.stock_level, quantity + 1) : quantity + 1)}
                          className="text-gray-400 hover:text-brand-black transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    
                    {product.sob_consulta ? (
                      <button 
                        onClick={handleTalkToSupport}
                        disabled={supportLoading}
                        className="flex-1 bg-[#25D366] text-white py-5 px-8 font-black uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-3 transition-all hover:bg-brand-black active:scale-95 shadow-2xl"
                      >
                        <MessageCircle className="w-5 h-5" />
                        <span>{supportLoading ? 'Chamando...' : 'Pedir Orçamento'}</span>
                      </button>
                    ) : (
                      <button 
                        onClick={handleAddToCart}
                        className={`flex-1 flex items-center justify-center gap-3 py-5 px-8 font-black uppercase tracking-[0.2em] text-[11px] transition-all active:scale-95 shadow-2xl ${
                          isOutOfStock 
                          ? 'bg-gray-100 text-gray-300 cursor-not-allowed' 
                          : 'bg-brand-black text-white hover:bg-brand-orange hover:text-brand-black'
                        }`}
                        disabled={isOutOfStock}
                      >
                        <ShoppingBag className="w-5 h-5" />
                        <span>{isOutOfStock ? 'Esgotado' : 'Adicionar ao Carrinho'}</span>
                      </button>
                    )}
                </div>

                <button
                  onClick={handleTalkToSupport}
                  disabled={supportLoading}
                  className="w-full flex items-center justify-center gap-3 py-4 text-[10px] font-black text-gray-400 hover:text-brand-orange uppercase tracking-[0.3em] border border-gray-100 hover:border-brand-orange transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Dúvida Técnica no WhatsApp</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-16 pt-16 border-t border-gray-50">
                <div className="flex flex-col gap-4">
                  <div className="w-10 h-px bg-brand-orange" />
                  <h4 className="font-black text-xs text-brand-black uppercase tracking-[0.2em]">Entrega Expressa</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-relaxed">Frotas próprias em Parauapebas para garantir que sua obra não pare.</p>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="w-10 h-px bg-brand-orange" />
                  <h4 className="font-black text-xs text-brand-black uppercase tracking-[0.2em]">Pagamento Seguro</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-relaxed">Sua transação e dados protegidos com tecnologia bancária de ponta.</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Extra Sections: Features & Specs */}
        <div className="mt-20 grid grid-cols-1 lg:grid-cols-12 gap-16">
          {product.features && product.features.length > 0 && (
            <div className="lg:col-span-7">
              <span className="text-brand-orange text-[10px] font-black uppercase tracking-[0.5em] mb-6 block">Vantagens</span>
              <h3 className="text-3xl font-black text-brand-black uppercase tracking-tight mb-10">Destaques do Produto</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                {product.features.map((feature, idx) => (
                  <div key={idx} className="flex flex-col gap-4 group">
                    <div className="flex items-center gap-4">
                      <div className="w-1 h-1 rounded-full bg-brand-orange group-hover:scale-150 transition-transform" />
                      <div className="h-px flex-1 bg-gray-50 group-hover:bg-brand-orange/20 transition-colors" />
                    </div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest leading-relaxed">{feature}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {product.specifications && Object.keys(product.specifications).length > 0 && (
            <div className="lg:col-span-5">
              <span className="text-brand-orange text-[10px] font-black uppercase tracking-[0.5em] mb-6 block">Técnico</span>
              <h3 className="text-3xl font-black text-brand-black uppercase tracking-tight mb-10">Ficha Técnica</h3>
              <div className="space-y-px bg-gray-50 border border-gray-50">
                {Object.entries(product.specifications).map(([key, value]) => (
                  <div key={key} className="grid grid-cols-2 bg-white p-6 gap-4 group hover:bg-brand-offwhite transition-colors">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{key}</span>
                    <span className="text-[10px] font-black text-brand-black uppercase tracking-[0.1em]">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
