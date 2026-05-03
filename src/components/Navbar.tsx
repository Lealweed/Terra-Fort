import { Hammer, Menu, ShoppingCart, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';

export default function Navbar() {
  const { cartCount, setIsCartOpen } = useCart();

  return (
    <nav className="bg-[#111111]/95 backdrop-blur-md text-white sticky top-0 z-50 border-b border-white/5 shadow-sm transition-all duration-300">
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
            <Link to="/admin/dashboard" className="text-sm font-medium hover:text-brand-orange active:scale-95 transition-all flex items-center gap-2">
              <User className="w-5 h-5" />
              <span className="hidden sm:inline">Portal Admin</span>
            </Link>
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
