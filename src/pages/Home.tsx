import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, MapPin, Phone, Search, Zap, Droplet, Hammer, Paintbrush, LayoutGrid, Truck, CreditCard } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { mockProducts } from '../lib/mockData';

const categoryConfig = [
  { id: 'Todos', icon: LayoutGrid },
  { id: 'Materiais Brutos', icon: Hammer },
  { id: 'Elétrica', icon: Zap },
  { id: 'Hidráulica', icon: Droplet },
  { id: 'Acabamento', icon: Paintbrush },
];

export default function Home() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');

  const filteredProducts = mockProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'Todos' || product.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="w-full">
      {/* Hero Section */}
      <div className="bg-brand-black bg-grid-pattern text-brand-offwhite border-b-8 border-brand-orange py-16 lg:py-24 relative overflow-hidden">
        {/* Abstract Background Elements */}
        <motion.div 
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 0.5, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute top-0 right-0 w-1/2 h-full bg-brand-darkgray skew-x-12 translate-x-32 z-0"
        ></motion.div>
        <motion.div 
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 0.1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="absolute bottom-0 left-10 w-24 h-64 bg-brand-orange rotate-45 z-0"
        ></motion.div>
        
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-10">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex-1 space-y-6"
            >
              <h1 className="font-heading text-4xl sm:text-5xl md:text-7xl font-black uppercase tracking-tight leading-[1.05] break-words">
                Força e <span className="text-brand-orange">Construção</span><br />na Medida Certa.
              </h1>
              <p className="text-xl text-gray-400 max-w-xl">
                A maior variedade de materiais para sua obra em Parauapebas. Do alicerce ao acabamento.
              </p>
            </motion.div>
            {/* Optional Image or Hero Graphic could go here */}
          </div>
        </div>
      </div>

      {/* News / Offers Ticker */}
      <div className="bg-brand-orange text-brand-black overflow-hidden flex items-center h-16 relative z-20 shadow-md border-b-2 border-orange-500">
        <div className="flex whitespace-nowrap animate-marquee items-center w-max">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex items-center">
              <span className="mx-6 font-black uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-5 h-5" /> Ofertas da Semana
              </span>
              <span className="mx-6 font-medium flex items-center gap-3">
                <img src="https://images.unsplash.com/photo-1541888087401-dc91a27e7cb2?q=80&w=100&auto=format&fit=crop" alt="Cimento" className="w-8 h-8 rounded-full border-2 border-white object-cover" />
                Cimento CP II <strong className="font-black ml-1 text-white">R$ 38,90</strong>
              </span>
              <span className="mx-6 font-black uppercase tracking-wider flex items-center gap-2">
                <Truck className="w-5 h-5" /> Entrega Rápida
              </span>
              <span className="mx-6 font-medium flex items-center gap-3">
                <img src="https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?q=80&w=100&auto=format&fit=crop" alt="Porcelanato" className="w-8 h-8 rounded-full border-2 border-white object-cover" />
                Porcelanato Bianco <strong className="font-black ml-1 text-white">R$ 59,90/m²</strong>
              </span>
              <span className="mx-6 font-black uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-5 h-5" /> Aberto das 07:30 às 18:00
              </span>
              <span className="mx-6 font-medium flex items-center gap-3">
                <img src="https://images.unsplash.com/photo-1584620658428-ee1bc4b533db?q=80&w=100&auto=format&fit=crop" alt="Argamassa" className="w-8 h-8 rounded-full border-2 border-white object-cover" />
                Argamassa ACIII <strong className="font-black ml-1 text-white">R$ 29,90</strong>
              </span>
              <span className="mx-6 font-black uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="w-5 h-5" /> Parcele em até 6x
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Search and Filters */}
        <div className="flex flex-col gap-8 mb-12">
          {/* Search bar */}
          <div className="relative w-full md:max-w-2xl mx-auto group z-10 transition-all duration-300 hover:scale-[1.02]">
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-brand-orange/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity z-0 pointer-events-none rounded-full"></div>
            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-gray-400 group-focus-within:text-brand-orange z-10">
              <Search className="h-6 w-6 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Buscar por materiais, ferramentas, etc..."
              className="relative z-10 block w-full pl-14 pr-6 py-4 md:py-5 border border-gray-200 rounded-full text-base md:text-lg leading-5 bg-white/90 backdrop-blur-md placeholder-gray-400 focus:outline-none focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10 shadow-lg hover:shadow-xl transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {/* Search Button Indicator inside input */}
            <div className="absolute inset-y-0 right-2 flex items-center z-10">
              <div className="hidden sm:flex items-center justify-center px-4 py-2 bg-brand-black text-white text-xs font-bold rounded-full cursor-pointer hover:bg-brand-orange transition-colors">
                Buscar
              </div>
            </div>
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {categoryConfig.map(({ id, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveCategory(id)}
                className={`group flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-300 active:scale-95 relative overflow-hidden ${
                  activeCategory === id 
                  ? 'border-brand-orange bg-brand-orange shadow-lg scale-105 text-brand-black' 
                  : 'border-gray-100 bg-white text-gray-400 hover:border-brand-orange/30 hover:shadow-xl hover:-translate-y-1'
                }`}
              >
                {/* Background glow effect on hover */}
                <div className={`absolute inset-0 bg-gradient-to-b from-transparent to-brand-orange/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl ${activeCategory === id ? 'hidden' : ''}`} />
                
                <Icon className={`w-6 h-6 md:w-8 md:h-8 mb-2 transition-all duration-300 z-10 ${
                  activeCategory === id 
                  ? 'text-brand-black scale-110' 
                  : 'group-hover:text-brand-orange group-hover:-translate-y-1 group-hover:scale-110'
                }`} />
                
                <div className="h-4 overflow-hidden relative w-full flex justify-center z-10 pb-6">
                  <span className={`absolute font-bold text-xs md:text-sm text-center transition-all duration-300 w-full ${
                    activeCategory === id 
                    ? 'top-0 opacity-100 tracking-wide text-brand-black' 
                    : 'top-4 opacity-0 tracking-tighter group-hover:top-0 group-hover:opacity-100 group-hover:tracking-widest group-hover:text-brand-orange'
                  }`}>
                    {id}
                  </span>
                  
                  {/* Default visible text before hover */}
                  <span className={`absolute font-bold text-xs md:text-sm text-center transition-all duration-300 w-full ${
                    activeCategory === id 
                    ? 'opacity-0 scale-90' 
                    : 'top-0 opacity-100 group-hover:top-[-20px] group-hover:opacity-0 group-hover:scale-90 text-gray-500'
                  }`}>
                    {id}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        {filteredProducts.length > 0 ? (
          <motion.div 
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            <AnimatePresence mode="popLayout">
              {filteredProducts.map(product => (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed border-gray-200">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Nenhum produto encontrado.</h3>
            <p className="text-gray-500 max-w-md mx-auto">Não encontramos nenhum item correspondente a "{searchTerm}". Tente buscar por um termo diferente ou altere a categoria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
