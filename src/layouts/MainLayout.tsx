import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import CartDrawer from '../components/CartDrawer';
import { useEffect } from 'react';
import { Clock, MapPin, Phone } from 'lucide-react';

export default function MainLayout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Navbar />
      <CartDrawer />
      <main className="flex-grow pt-20">
        <Outlet />
      </main>
      <footer className="bg-brand-black bg-grid-pattern text-gray-400 py-12 border-t-8 border-brand-orange mt-auto relative overflow-hidden">
        <div className="absolute bottom-0 right-10 w-64 h-64 bg-brand-orange/5 rotate-45 z-0 blurred-xl"></div>
        
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row justify-between gap-8 mb-10 pb-10 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <svg viewBox="0 0 100 100" className="w-10 h-10 md:w-12 md:h-12 text-[#D1A535]" fill="currentColor">
                  <path d="M 8 20 L 52 20 L 40 46 L 31 46 L 31 82 L 12 82 L 12 46 L 8 46 Z" />
                  <path d="M 57 20 L 92 20 L 80 46 L 45 46 Z" />
                  <path d="M 42 54 L 75 54 L 64 78 L 31 78 Z" />
                </svg>
                <div className="flex flex-col justify-center leading-[0.85]">
                  <span className="text-[18px] md:text-[22px] font-black text-white tracking-[0.16em] ml-0.5">TERRA</span>
                  <span className="text-[28px] md:text-[34px] font-black text-white tracking-widest">FORT</span>
                </div>
              </div>
              <p className="max-w-xs text-sm">A sua melhor escolha em materiais de construção, do alicerce ao acabamento, em Parauapebas e região.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-8">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-brand-darkgray rounded-xl text-brand-orange shadow-inner border border-white/5">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-lg">Endereço</h4>
                  <p className="text-sm">Av. Principal, Parauapebas - PA</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="p-3 bg-brand-darkgray rounded-xl text-brand-orange shadow-inner border border-white/5">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-lg">Contato</h4>
                  <p className="text-sm">(94) 99934-6107</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="p-3 bg-brand-darkgray rounded-xl text-brand-orange shadow-inner border border-white/5">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-lg">Horário</h4>
                  <p className="text-sm">Seg-Sáb: 07:30 às 18:00</p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center text-sm">
            <p>© {new Date().getFullYear()} Terra Fort - Materiais de Construção. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
