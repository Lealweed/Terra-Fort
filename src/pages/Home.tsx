import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Zap, Truck, CreditCard, ArrowRight, ShieldCheck, Hammer, Droplet, Paintbrush, Zap as ElectricIcon, Box, X } from 'lucide-react';
import ProductSlider from '../components/ProductSlider';
import ProductCard from '../components/ProductCard';
import { getProducts } from '../lib/products';
import { Product } from '../types';
import { getHomeContent } from '../lib/content';

const categoryConfig = [
  { id: 'Construção', icon: Hammer, image: 'https://images.pexels.com/photos/13614736/pexels-photo-13614736.jpeg', span: 'lg:col-span-3 lg:row-span-2 sm:col-span-2' },
  { id: 'Coberturas', icon: Box, image: 'https://images.pexels.com/photos/7722155/pexels-photo-7722155.jpeg', span: 'lg:col-span-2 lg:row-span-2 sm:col-span-2' },
  { id: 'Elétrica', icon: ElectricIcon, image: 'https://images.pexels.com/photos/3784234/pexels-photo-3784234.jpeg', span: 'lg:col-span-2 lg:row-span-1 sm:col-span-1' },
  { id: 'Hidráulica', icon: Droplet, image: 'https://images.pexels.com/photos/12142829/pexels-photo-12142829.jpeg', span: 'lg:col-span-3 lg:row-span-1 sm:col-span-1' },
];

export default function Home() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [homeContent, setHomeContent] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([getProducts(), getHomeContent()]).then(([productsData, content]) => {
      if (!mounted) return;
      setProducts(productsData);
      setHomeContent(content);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return [];
    return products.filter(product => 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  const selectedCategoryProducts = useMemo(() => {
    if (!selectedCategory) return [];
    return products.filter(product => product.category === selectedCategory);
  }, [products, selectedCategory]);

  const categorizedProducts = useMemo(() => {
    return {
      ofertas: products.filter(p => p.original_price && p.original_price > p.price).slice(0, 10),
      novidades: [...products].reverse().slice(0, 10),
      construcao: products.filter(p => p.category === 'Construção').slice(0, 10),
      coberturas: products.filter(p => p.category === 'Coberturas').slice(0, 10),
    };
  }, [products]);

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSearchTerm('');
    // Use timeout to ensure DOM is updated if results were hidden
    setTimeout(() => {
      const resultsElement = document.getElementById('filter-results');
      if (resultsElement) {
        resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  return (
    <div className="w-full bg-brand-offwhite">
      {/* 1. Refined Hero Section - High-Impact & Responsive */}
      <section className="relative min-h-[85vh] md:min-h-[92vh] pt-12 md:pt-20 pb-16 md:pb-24 overflow-hidden flex flex-col justify-center bg-brand-black">
        {/* Background Layer */}
        <div className="absolute inset-0 z-0">
          <video 
            autoPlay 
            loop 
            muted 
            playsInline
            className="w-full h-full object-cover scale-105 opacity-50 md:opacity-100"
          >
            <source src="https://videos.pexels.com/video-files/18019123/18019123-hd_1280_720_24fps.mp4" type="video/mp4" />
          </video>
          {/* Gradients for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-brand-black/40 to-transparent z-10" />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-black via-brand-black/20 to-transparent z-10" />
          <div className="absolute inset-0 architectural-grid-dark opacity-10 z-10" />
        </div>

        {/* Content Layer */}
        <div className="relative z-20 w-full max-w-7xl mx-auto px-6 sm:px-12 md:px-24 pt-6 md:pt-10">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-4xl"
          >
            <span className="text-brand-orange text-[10px] md:text-xs font-black uppercase tracking-[0.6em] mb-4 md:mb-6 block opacity-90">
              Parauapebas · Região do Carajás
            </span>
            <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-[7.5rem] font-black text-white uppercase tracking-tighter leading-[0.88] mb-6 md:mb-8 text-balance">
              {homeContent?.heroTitle || (
                <>
                  FORÇA E <br />
                  <span className="text-brand-orange">CONSTRUÇÃO</span>
                </>
              )}
            </h1>
            <p className="text-gray-400 text-xs md:text-base font-bold max-w-sm uppercase tracking-[0.2em] leading-relaxed opacity-80 mb-12">
              {homeContent?.heroSubtitle || 'A maior variedade de materiais para sua obra, do alicerce ao acabamento.'}
            </p>

            {/* Search Integrated into Flow */}
            <div className="glass-dark p-1.5 rounded-full shadow-2xl border border-white/10 group focus-within:ring-4 focus-within:ring-brand-orange/20 transition-all duration-500 max-w-2xl">
              <div className="flex items-center gap-3 px-4 md:px-6">
                <Search className="w-5 h-5 text-brand-orange shrink-0" />
                <input 
                  type="text" 
                  placeholder="BUSCAR MATERIAIS..."
                  className="bg-transparent border-none focus:ring-0 text-white font-black uppercase tracking-[0.2em] text-[10px] md:text-xs w-full py-4 placeholder:text-gray-600"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    if (e.target.value) setSelectedCategory(null);
                  }}
                />
                <button className="hidden sm:flex bg-brand-orange text-brand-black px-8 py-3 rounded-full font-black uppercase tracking-[0.2em] text-[10px] hover:bg-white transition-all duration-300">
                  BUSCAR
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Search & Category Results Panel */}
      <AnimatePresence>
        {(searchTerm || selectedCategory) && (
          <motion.div 
            id="filter-results"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white border-b border-gray-100 relative z-30 overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-4 py-16 md:py-24">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 md:mb-16 gap-8">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-[2px] bg-brand-orange" />
                    <span className="text-[10px] font-black text-brand-orange uppercase tracking-[0.5em]">Resultados Encontrados</span>
                  </div>
                  <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-brand-black leading-none">
                    {searchTerm ? (
                      <>Resultados para: <span className="text-brand-orange">"{searchTerm}"</span></>
                    ) : (
                      <>Categoria: <span className="text-brand-orange">{selectedCategory}</span></>
                    )}
                  </h2>
                  <span className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest mt-4 block">
                    Exibindo {searchTerm ? filteredProducts.length : selectedCategoryProducts.length} itens no total
                  </span>
                </div>
                <button 
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory(null);
                  }}
                  className="flex items-center gap-3 px-8 py-4 bg-brand-black text-white text-[10px] font-black uppercase tracking-[0.3em] hover:bg-brand-orange hover:text-brand-black transition-all rounded-full self-start md:self-center shadow-xl hover:shadow-brand-orange/20"
                >
                  <X className="w-4 h-4" />
                  Limpar Filtros
                </button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10">
                {(searchTerm ? filteredProducts : selectedCategoryProducts).length > 0 ? (
                  (searchTerm ? filteredProducts : selectedCategoryProducts).map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))
                ) : (
                  <div className="col-span-full text-center py-24 border-2 border-dashed border-gray-100 rounded-3xl">
                    <Search className="w-12 h-12 text-gray-200 mx-auto mb-6 opacity-20" />
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Nenhum material encontrado com os critérios atuais.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Brand Ticker */}
      <div className="bg-brand-orange py-5 overflow-hidden flex items-center h-16 relative z-30 shadow-2xl border-y border-brand-orange/20">
        <div className="flex whitespace-nowrap animate-marquee items-center w-max">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center">
              <span className="mx-16 font-black uppercase tracking-[0.3em] text-[11px] text-brand-black flex items-center gap-4">
                <Zap className="w-5 h-5" /> Ofertas Exclusivas
              </span>
              <span className="mx-16 font-black uppercase tracking-[0.3em] text-[11px] text-brand-black flex items-center gap-4">
                <Truck className="w-5 h-5" /> Entrega em Parauapebas
              </span>
              <span className="mx-16 font-black uppercase tracking-[0.3em] text-[11px] text-brand-black flex items-center gap-4">
                <CreditCard className="w-5 h-5" /> Até 10x sem juros
              </span>
              <span className="mx-16 font-black uppercase tracking-[0.3em] text-[11px] text-brand-black flex items-center gap-4">
                <ShieldCheck className="w-5 h-5" /> Qualidade Garantida
              </span>
            </div>
          ))}
        </div>
      </div>

      {!searchTerm && !selectedCategory && (
        <>
          {/* 3. Category Bento Grid */}
          <section className="max-w-7xl mx-auto px-4 py-24 md:py-32">
            <div className="mb-16 md:mb-20 text-center md:text-left">
              <motion.span 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                className="text-brand-orange text-[10px] font-black uppercase tracking-[0.5em] mb-4 block"
              >
                Especialidades
              </motion.span>
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                className="text-5xl md:text-8xl font-black text-brand-black uppercase tracking-tighter leading-none"
              >
                Categorias
              </motion.h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 md:gap-8 lg:h-[650px]">
              {categoryConfig.map((cat, idx) => (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1, duration: 0.8 }}
                  onClick={() => handleCategoryClick(cat.id)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCategoryClick(cat.id)}
                  tabIndex={0}
                  role="button"
                  aria-label={`Ver categoria ${cat.id}`}
                  className={`relative overflow-hidden group cursor-pointer shadow-premium hover:shadow-premium-hover transition-all duration-500 rounded-sm focus:ring-4 focus:ring-brand-orange/30 outline-none ${cat.span}`}
                >
                  <div className="absolute inset-0 bg-brand-black transition-all duration-1000 group-hover:scale-110">
                    <img 
                      src={cat.image} 
                      alt={cat.id}
                      className="w-full h-full object-cover opacity-30 grayscale group-hover:grayscale-0 group-hover:opacity-60 transition-all duration-1000"
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-brand-black/20 to-transparent opacity-80 group-hover:opacity-40 transition-opacity duration-700" />
                  
                  <div className="absolute bottom-6 left-6 right-6 md:bottom-10 md:left-10 md:right-10 flex justify-between items-end z-10">
                    <div className="translate-y-6 group-hover:translate-y-0 transition-transform duration-700 ease-[0.22, 1, 0.36, 1]">
                      <cat.icon className="w-8 h-8 md:w-10 md:h-10 text-brand-orange mb-4 md:mb-6 opacity-0 group-hover:opacity-100 transition-all duration-500 -translate-x-4 group-hover:translate-x-0" />
                      <h3 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tight leading-none">{cat.id}</h3>
                      <div className="h-1.5 w-0 bg-brand-orange group-hover:w-full transition-all duration-700 mt-4" />
                    </div>
                    <div className="bg-white/10 backdrop-blur-md p-4 md:p-5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-700 hover:bg-brand-orange hover:text-brand-black text-white translate-y-4 group-hover:translate-y-0">
                      <ArrowRight className="w-5 h-5 md:w-7 md:h-7" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* 4. Featured Product Sliders */}
          <div className="space-y-6 md:space-y-12 pb-24 md:pb-32">
            {categorizedProducts.ofertas.length > 0 && (
              <ProductSlider 
                products={categorizedProducts.ofertas} 
                title="Ofertas de Hoje" 
                subtitle="Economia Máxima"
                className="bg-white border-y border-gray-50 shadow-sm"
              />
            )}
            
            {categorizedProducts.novidades.length > 0 && (
              <ProductSlider 
                products={categorizedProducts.novidades} 
                title="Estoque Renovado" 
                subtitle="Novidades"
                className="architectural-grid"
              />
            )}

            {categorizedProducts.construcao.length > 0 && (
              <ProductSlider 
                products={categorizedProducts.construcao} 
                title="Materiais de Construção" 
                subtitle="Estrutura e Alvenaria"
                className="bg-brand-black text-white"
              />
            )}

            {categorizedProducts.coberturas.length > 0 && (
              <ProductSlider 
                products={categorizedProducts.coberturas} 
                title="Telhas e Coberturas" 
                subtitle="Proteção para sua Obra"
                className="bg-white border-y border-gray-50 shadow-sm"
              />
            )}
          </div>

          {/* 5. Trust Strip / Features */}
          <section className="bg-brand-black py-24 md:py-32 relative overflow-hidden">
            <div className="absolute inset-0 architectural-grid-dark opacity-10" />
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-orange/40 to-transparent" />
            
            <div className="max-w-7xl mx-auto px-4 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-20">
                {[
                  { id: '01', title: 'Entrega Expressa', desc: 'Sua obra não pode esperar. Entregamos em tempo recorde em toda Parauapebas e região com frota própria.' },
                  { id: '02', title: 'Preço Direto', desc: 'Negociamos grandes volumes com as melhores marcas para garantir o menor preço no varejo.' },
                  { id: '03', title: 'Consultoria Especializada', desc: 'Nossa equipe técnica ajuda você a calcular a medida exata dos materiais, evitando desperdício.' }
                ].map((feature, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.2, duration: 0.8 }}
                    className="flex flex-col gap-6 md:gap-8 group"
                  >
                    <div className="flex items-center gap-6">
                      <span className="text-4xl md:text-5xl font-black text-brand-orange opacity-10 group-hover:opacity-40 transition-opacity font-heading leading-none">{feature.id}</span>
                      <div className="h-[2px] flex-1 bg-white/10 group-hover:bg-brand-orange/40 transition-colors" />
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight group-hover:text-brand-orange transition-colors">{feature.title}</h4>
                      <p className="text-gray-500 text-xs md:text-sm leading-relaxed font-medium uppercase tracking-wider opacity-80">{feature.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
