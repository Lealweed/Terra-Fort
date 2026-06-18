import { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ProductCard from './ProductCard';
import { Product } from '../types';

interface ProductSliderProps {
  products: Product[];
  title?: string;
  subtitle?: string;
  className?: string;
}

export default function ProductSlider({ products, title, subtitle, className = "" }: ProductSliderProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 20);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 20);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [products]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { clientWidth } = scrollRef.current;
      const scrollAmount = direction === 'left' ? -clientWidth * 0.75 : clientWidth * 0.75;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <section className={`relative py-12 md:py-20 overflow-hidden ${className}`}>
      {/* Background Architectural Detail */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-brand-black/[0.02] -skew-x-12 translate-x-1/2 pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-6 sm:px-12 md:px-24 mb-8 md:mb-12 flex items-end justify-between relative z-10">
        <div className="max-w-2xl">
          {subtitle && (
            <motion.span 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="text-brand-orange text-[9px] md:text-xs font-black uppercase tracking-[0.4em] mb-3 md:mb-4 block"
            >
              {subtitle}
            </motion.span>
          )}
          {title && (
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="text-3xl md:text-6xl font-black text-brand-black uppercase tracking-tighter leading-[0.9]"
            >
              {title}
            </motion.h2>
          )}
        </div>

        <div className="hidden md:flex gap-3">
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => scroll('left')}
            className={`p-4 rounded-full border transition-all ${
              showLeftArrow 
                ? 'bg-white border-gray-100 text-brand-black shadow-premium hover:border-brand-orange hover:text-brand-orange' 
                : 'bg-gray-50 border-transparent text-gray-200 cursor-not-allowed'
            }`}
            disabled={!showLeftArrow}
          >
            <ChevronLeft className="w-6 h-6" />
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => scroll('right')}
            className={`p-4 rounded-full border transition-all ${
              showRightArrow 
                ? 'bg-white border-gray-100 text-brand-black shadow-premium hover:border-brand-orange hover:text-brand-orange' 
                : 'bg-gray-50 border-transparent text-gray-200 cursor-not-allowed'
            }`}
            disabled={!showRightArrow}
          >
            <ChevronRight className="w-6 h-6" />
          </motion.button>
        </div>
      </div>

      <div 
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-8 overflow-x-auto custom-scrollbar px-4 sm:px-6 lg:px-8 snap-x snap-mandatory pb-12 scroll-smooth no-scrollbar md:scrollbar-visible relative z-10"
      >
        {products.map((product, index) => (
          <motion.div 
            key={product.id} 
            className="min-w-[300px] md:min-w-[400px] snap-start"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <ProductCard product={product} />
          </motion.div>
        ))}
        {/* End Spacer */}
        <div className="min-w-[1px] h-full" />
      </div>

      {/* Mobile Indicator Track */}
      <div className="md:hidden flex justify-center mt-6">
        <div className="w-48 h-1 bg-gray-100 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-brand-orange"
            animate={{ 
              width: scrollRef.current 
                ? `${((scrollRef.current.scrollLeft + scrollRef.current.clientWidth) / scrollRef.current.scrollWidth) * 100}%` 
                : '20%' 
            }}
          />
        </div>
      </div>
    </section>
  );
}
