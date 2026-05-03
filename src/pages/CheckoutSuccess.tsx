import { useEffect } from 'react';
import { useCart } from '../contexts/CartContext';
import { CheckCircle, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CheckoutSuccess() {
  const { clearCart } = useCart();

  useEffect(() => {
    // Clear the cart when they successfully checkout
    clearCart();
  }, [clearCart]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12 px-4 selection:bg-brand-orange selection:text-brand-black">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center border-4 border-green-500 shadow-xl shadow-green-500/20 animate-in zoom-in duration-500">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
        </div>
        
        <h1 className="font-heading text-4xl sm:text-5xl font-black text-brand-black mb-4 tracking-tight">
          Sucesso!
        </h1>
        
        <p className="text-gray-500 mb-8 text-lg">
          Seu pedido foi recebido e o pagamento foi aprovado. Em breve você receberá um e-mail com os detalhes da compra.
        </p>
        
        <Link 
          to="/" 
          className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-brand-black text-white hover:bg-brand-orange hover:text-brand-black rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1 w-full"
        >
          <Home className="w-5 h-5" />
          Voltar para a Página Inicial
        </Link>
      </div>
    </div>
  );
}
