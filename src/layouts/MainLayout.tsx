import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import CartDrawer from '../components/CartDrawer';
import MobileNav from '../components/MobileNav';
import { useEffect } from 'react';
import { Clock, MapPin, Phone } from 'lucide-react';

export default function MainLayout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-brand-offwhite">
      <Navbar />
      <CartDrawer />
      <main className="flex-grow pt-24 pb-20 md:pb-0">
        <Outlet />
      </main>
      <MobileNav />
      
      {/* Mobile-Only Contact Info */}
      <section className="md:hidden bg-white border-t border-gray-100 py-16 px-6">
        <div className="space-y-12">
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 100 100" className="w-10 h-10 text-brand-orange" fill="currentColor">
              <path d="M 8 20 L 52 20 L 40 46 L 31 46 L 31 82 L 12 82 L 12 46 L 8 46 Z" />
              <path d="M 57 20 L 92 20 L 80 46 L 45 46 Z" />
              <path d="M 42 54 L 75 54 L 64 78 L 31 78 Z" />
            </svg>
            <div className="flex flex-col justify-center leading-none">
              <span className="text-[16px] font-black text-brand-black tracking-[0.2em]">TERRA</span>
              <span className="text-[24px] font-black text-brand-orange tracking-widest -mt-1">FORT</span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-10">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-brand-orange uppercase tracking-[0.4em]">Endereço</h4>
              <p className="text-sm font-bold text-brand-black leading-relaxed">R. Café Filho, 10/11 - Altamira,<br /> Parauapebas - PA</p>
            </div>
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-brand-orange uppercase tracking-[0.4em]">Horário</h4>
              <p className="text-sm font-bold text-brand-black leading-relaxed">Seg-Sáb: 07:30 às 18:00</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-brand-black architectural-grid-dark text-gray-500 py-24 border-t border-white/5 mt-auto relative overflow-hidden hidden md:block">
        <div className="absolute bottom-0 right-0 w-1/3 h-full bg-brand-orange/5 -skew-x-12 translate-x-1/2 pointer-events-none blur-3xl" />
        
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-16 mb-20 pb-20 border-b border-white/5">
            <div className="md:col-span-5">
              <div className="flex items-center gap-3 mb-8 group">
                <svg viewBox="0 0 100 100" className="w-12 h-12 text-brand-orange transition-transform duration-500 group-hover:rotate-6" fill="currentColor">
                  <path d="M 8 20 L 52 20 L 40 46 L 31 46 L 31 82 L 12 82 L 12 46 L 8 46 Z" />
                  <path d="M 57 20 L 92 20 L 80 46 L 45 46 Z" />
                  <path d="M 42 54 L 75 54 L 64 78 L 31 78 Z" />
                </svg>
                <div className="flex flex-col justify-center leading-none">
                  <span className="text-[20px] font-black text-white tracking-[0.25em]">TERRA</span>
                  <span className="text-[30px] font-black text-brand-orange tracking-widest -mt-1">FORT</span>
                </div>
              </div>
              <p className="max-w-md text-sm md:text-base leading-relaxed uppercase tracking-widest opacity-60">
                A maior variedade de materiais para sua obra, do alicerce ao acabamento. Soluções robustas para construir Parauapebas e região.
              </p>
            </div>
            
            <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-12">
              <div className="space-y-6">
                <h4 className="font-black text-white text-xs uppercase tracking-[0.3em]">Endereço</h4>
                <p className="text-sm leading-relaxed">R. Café Filho, 10/11 - Altamira,<br /> Parauapebas - PA, 68515-000</p>
                <a href="#" className="inline-flex items-center gap-2 text-xs font-black text-brand-orange uppercase tracking-widest hover:text-white transition-colors">
                  Ver no Mapa <div className="w-4 h-px bg-current" />
                </a>
              </div>
              
              <div className="space-y-6">
                <h4 className="font-black text-white text-xs uppercase tracking-[0.3em]">Atendimento</h4>
                <p className="text-sm leading-relaxed">(94) 99934-6107<br />comercial@terrafort.com.br</p>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-brand-orange transition-colors cursor-pointer group/icon">
                    <Phone className="w-4 h-4 group-hover/icon:text-brand-black" />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-brand-orange transition-colors cursor-pointer group/icon">
                    <Clock className="w-4 h-4 group-hover/icon:text-brand-black" />
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                <h4 className="font-black text-white text-xs uppercase tracking-[0.3em]">Horário</h4>
                <p className="text-sm leading-relaxed">Segunda a Sábado<br />07:30 às 18:00</p>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse" />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">Aberto agora</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
              © {new Date().getFullYear()} Terra Fort - Materiais de Construção.
            </div>
            <div className="flex gap-8 text-[10px] font-black uppercase tracking-[0.3em] opacity-40 hover:opacity-100 transition-opacity">
              <a href="#" className="hover:text-brand-orange transition-colors">Privacidade</a>
              <a href="#" className="hover:text-brand-orange transition-colors">Termos</a>
              <a href="#" className="hover:text-brand-orange transition-colors">Suporte</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
