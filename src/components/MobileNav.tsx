import { Home, ShoppingBag, User, MessageCircle, Menu, Shield, Truck } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';
import { getUserRoleFromUser, type UserRole } from '../lib/auth';

export default function MobileNav() {
  const location = useLocation();
  const { cartCount, setIsCartOpen } = useCart();
  const [role, setRole] = useState<UserRole>('unknown');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setRole(getUserRoleFromUser(data.session?.user));
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setRole(getUserRoleFromUser(session?.user));
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const navItems = [
    { name: 'Início', path: '/', icon: Home },
    { name: 'Suporte', path: '/suporte', icon: MessageCircle, isAction: true },
  ];

  if (role === 'admin') {
    navItems.push({ name: 'Admin', path: '/admin/dashboard', icon: Shield });
  } else if (role === 'delivery') {
    navItems.push({ name: 'Entregador', path: '/portal-entregador', icon: Truck });
  } else {
    navItems.push({ name: 'Minha Conta', path: '/portal-cliente', icon: User });
  }

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-4">
      <div className="glass-dark border border-white/10 rounded-full shadow-2xl h-16 flex items-center justify-around px-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          if (item.name === 'Suporte') {
            return (
              <button 
                key={item.name}
                className="relative flex flex-col items-center justify-center w-12 h-12 text-gray-400"
                onClick={() => window.open('https://wa.me/5594999346107', '_blank')}
              >
                <div className="bg-brand-orange text-brand-black p-3 rounded-full shadow-lg shadow-brand-orange/20 animate-pulse">
                  <Icon className="w-5 h-5" />
                </div>
              </button>
            );
          }

          return (
            <Link 
              key={item.path} 
              to={item.path}
              className={`relative flex flex-col items-center justify-center w-12 h-12 transition-all duration-300 ${
                isActive ? 'text-brand-orange' : 'text-gray-500'
              }`}
            >
              <Icon className={`w-6 h-6 ${isActive ? 'scale-110' : ''}`} />
              {isActive && (
                <motion.div 
                  layoutId="mobile-nav-active"
                  className="absolute -bottom-1 w-1 h-1 rounded-full bg-brand-orange"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
        
        {/* Cart Trigger */}
        <button 
          onClick={() => setIsCartOpen(true)}
          className="relative flex flex-col items-center justify-center w-12 h-12 text-gray-500"
        >
          <div className="relative">
            <ShoppingBag className="w-6 h-6" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-brand-orange text-brand-black text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-brand-black">
                {cartCount}
              </span>
            )}
          </div>
        </button>
      </div>
    </div>
  );
}
