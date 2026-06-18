import { ShoppingCart, User, Truck, Users, LogIn, LogOut, ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';
import { motion } from 'motion/react';

export default function Navbar() {
  const { cartCount, setIsCartOpen } = useCart();
  const location = useLocation();
  const [isLogged, setIsLogged] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setIsLogged(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setIsLogged(!!session));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const navLinks = [
    { name: 'Cliente', path: '/portal-cliente', icon: Users },
    { name: 'Entregador', path: '/portal-entregador', icon: Truck },
    { name: 'Admin', path: '/admin/dashboard', icon: User },
  ];

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out ${
        isScrolled 
          ? 'py-3 bg-brand-black/90 backdrop-blur-xl border-b border-white/5 shadow-2xl' 
          : 'py-6 bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-12">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative">
                <svg viewBox="0 0 100 100" className="w-10 h-10 md:w-12 md:h-12 text-brand-orange transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110" fill="currentColor">
                  <path d="M 8 20 L 52 20 L 40 46 L 31 46 L 31 82 L 12 82 L 12 46 L 8 46 Z" />
                  <path d="M 57 20 L 92 20 L 80 46 L 45 46 Z" />
                  <path d="M 42 54 L 75 54 L 64 78 L 31 78 Z" />
                </svg>
                <div className="absolute -inset-4 bg-brand-orange/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="flex flex-col justify-center leading-none">
                <span className="text-[16px] md:text-[20px] font-black text-white tracking-[0.25em] transition-colors group-hover:text-brand-orange">TERRA</span>
                <span className="text-[24px] md:text-[30px] font-black text-brand-orange tracking-widest -mt-1 group-hover:text-white transition-colors">FORT</span>
              </div>
            </Link>

            <div className="hidden lg:flex items-center gap-2">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link 
                    key={link.path}
                    to={link.path} 
                    className={`relative px-5 py-2 text-[11px] font-black uppercase tracking-[0.15em] transition-all duration-300 flex items-center gap-2.5 rounded-full group/link ${
                      isActive ? 'text-brand-orange' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <link.icon className={`w-4 h-4 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover/link:scale-110 group-hover/link:text-brand-orange'}`} />
                    <span>{link.name}</span>
                    {isActive && (
                      <motion.div 
                        layoutId="nav-active"
                        className="absolute inset-0 border border-brand-orange/20 rounded-full bg-brand-orange/5"
                        initial={false}
                        transition={{ type: "spring", stiffness: 400, damping: 35 }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-2">
              {isLogged ? (
                <button 
                  onClick={handleLogout} 
                  className="p-3 text-gray-500 hover:text-brand-orange hover:bg-white/5 rounded-full transition-all active:scale-90"
                  title="Sair"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              ) : (
                <Link 
                  to="/login" 
                  className="flex items-center gap-2 px-4 py-2 text-[10px] font-black text-gray-400 hover:text-brand-orange transition-all uppercase tracking-[0.2em]"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Entrar</span>
                </Link>
              )}
            </div>

            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative group p-0.5"
            >
              <div className="absolute inset-0 bg-brand-orange/30 blur-xl rounded-full scale-0 group-hover:scale-110 transition-transform duration-500" />
              <div className="relative bg-brand-orange text-brand-black h-10 md:h-12 flex items-center gap-2 md:gap-3 px-4 md:px-6 rounded-full font-black tracking-tighter shadow-xl shadow-brand-orange/10 hover:shadow-brand-orange/30 transition-all hover:-translate-y-1 active:scale-95">
                <ShoppingCart className="w-4 h-4 md:w-5 md:h-5" />
                <span className="text-lg font-heading">{cartCount}</span>
                <div className="h-4 w-px bg-brand-black/20 hidden sm:block" />
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform hidden sm:block" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
