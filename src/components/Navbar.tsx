import { Menu, ShoppingCart, User, Truck, Users, LogIn, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const { cartCount, setIsCartOpen } = useCart();
  const [isLogged, setIsLogged] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setIsLogged(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setIsLogged(!!session));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const onScroll = () => setIsAtTop(window.scrollY <= 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <nav className={`bg-[#111111]/95 backdrop-blur-md text-white fixed top-0 left-0 right-0 z-50 border-b border-white/5 shadow-sm transition-all duration-300 ${isAtTop ? 'translate-y-0' : '-translate-y-full'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
              <svg viewBox="0 0 100 100" className="w-10 h-10 md:w-12 md:h-12 text-[#D1A535]" fill="currentColor">
                {/* Custom TF Logo Mark Approximation */}
                <path d="M 8 20 L 52 20 L 40 46 L 31 46 L 31 82 L 12 82 L 12 46 L 8 46 Z" />
                <path d="M 57 20 L 92 20 L 80 46 L 45 46 Z" />
                <path d="M 42 54 L 75 54 L 64 78 L 31 78 Z" />
              </svg>
              <div className="flex flex-col justify-center leading-[0.85]">
                <span className="text-[18px] md:text-[22px] font-black text-white tracking-[0.16em] ml-0.5">TERRA</span>
                <span className="text-[28px] md:text-[34px] font-black text-white tracking-widest">FORT</span>
              </div>
            </Link>
          </div>
          
          <div className="hidden md:flex flex-1 justify-center px-10">
            {/* Nav links could go here if needed */}
          </div>

          <div className="flex items-center gap-4 md:gap-6">
            <Link to="/portal-cliente" className="text-sm font-medium hover:text-brand-orange active:scale-95 transition-all flex items-center gap-2">
              <Users className="w-5 h-5" />
              <span className="hidden sm:inline">Cliente</span>
            </Link>
            <Link to="/portal-entregador" className="text-sm font-medium hover:text-brand-orange active:scale-95 transition-all flex items-center gap-2">
              <Truck className="w-5 h-5" />
              <span className="hidden sm:inline">Entregador</span>
            </Link>
            <Link to="/admin/dashboard" className="text-sm font-medium hover:text-brand-orange active:scale-95 transition-all flex items-center gap-2">
              <User className="w-5 h-5" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
            {isLogged ? (
              <button onClick={handleLogout} className="text-sm font-medium hover:text-brand-orange active:scale-95 transition-all flex items-center gap-2">
                <LogOut className="w-5 h-5" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            ) : (
              <Link to="/login" className="text-sm font-medium hover:text-brand-orange active:scale-95 transition-all flex items-center gap-2">
                <LogIn className="w-5 h-5" />
                <span className="hidden sm:inline">Entrar</span>
              </Link>
            )}
            <button 
              onClick={() => setIsCartOpen(true)}
              className="bg-brand-orange text-brand-black px-3 py-2 rounded-sm mx-1 hover:bg-orange-600 hover:-translate-y-0.5 shadow-sm hover:shadow-orange-500/20 active:scale-95 transition-all flex items-center gap-2 font-bold"
            >
              <ShoppingCart className="w-5 h-5" />
              <span>{cartCount}</span>
            </button>
            <button className="md:hidden text-brand-offwhite active:scale-95 transition-all">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
