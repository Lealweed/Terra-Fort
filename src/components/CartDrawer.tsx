import { X, Plus, Minus, ShoppingBag, MessageCircle, Trash2, ArrowRight, CreditCard, MapPin, User, Phone, Home as HomeIcon, Map } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { formatPrice } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { buildWhatsAppUrl, getSupportUserFallbackMessage, openSupportWhatsapp, submitSupportRequest } from '../lib/customerSupport';
import { getStripeCheckoutAvailability, getStripeCheckoutErrorMessage } from '../lib/cartCheckout';

const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY?.trim();
const stripePromise = stripePublicKey ? loadStripe(stripePublicKey) : null;

export default function CartDrawer() {
  const { isCartOpen, setIsCartOpen, cartItems, updateQuantity, removeFromCart, cartTotal, clearCart, cartCount } = useCart();
  const navigate = useNavigate();
  const [isStripeLoading, setIsStripeLoading] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'address'>('cart');
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    cep: '',
    address: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Guard against undefined cart items
  const validCartItems = cartItems || [];
  const hasSobConsulta = validCartItems.some(item => item.sob_consulta);
  const stripeAvailability = getStripeCheckoutAvailability(stripePublicKey);

  const generateWhatsAppMessage = () => {
    let message = "Olá! Gostaria de fechar o seguinte pedido/orçamento:\n\n";
    
    message += `*DADOS DO CLIENTE*\n`;
    message += `Nome: ${formData.name}\n`;
    message += `Telefone: ${formData.phone}\n`;
    message += `Endereço: ${formData.address}, ${formData.number} ${formData.complement ? '- ' + formData.complement : ''}\n`;
    message += `Bairro: ${formData.neighborhood} - ${formData.city}\n`;
    message += `CEP: ${formData.cep}\n\n`;
    
    message += `*ITENS DO PEDIDO*\n`;
    validCartItems.forEach(item => {
      const quantity = item.cartQuantity || 1;
      const price = isNaN(item.price) ? 0 : Number(item.price);
      message += `- ${quantity}x ${item.name}`;
      if (!item.sob_consulta) {
        message += ` (${formatPrice(price * quantity)})`;
      } else {
        message += ` (Preço sob consulta)`;
      }
      message += "\n";
    });
    
    if (!hasSobConsulta) {
      message += `\n*Total Estimado:* ${formatPrice(cartTotal || 0)}`;
    } else {
      message += `\n*Total Parcial (itens com preço):* ${formatPrice(cartTotal || 0)}`;
    }
    
    return message;
  };

  const handleCheckout = async () => {
    if (checkoutStep === 'cart') {
      setCheckoutStep('address');
      return;
    }
    
    // Validate required fields
    if (!formData.name || !formData.phone || !formData.address || !formData.number || !formData.neighborhood || !formData.city) {
      alert("Por favor, preencha todos os campos obrigatórios do endereço.");
      return;
    }

    const message = generateWhatsAppMessage();
    const supportPayload = {
      source: 'cart_checkout' as const,
      intent: 'quote_request' as const,
      message,
      customer: {
        name: formData.name,
        phone: formData.phone,
        address: `${formData.address}, ${formData.number}${formData.complement ? ` - ${formData.complement}` : ''}`,
        neighborhood: formData.neighborhood,
        city: formData.city,
        cep: formData.cep,
      },
      items: validCartItems.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.cartQuantity || 1,
        unitPrice: Number(item.price || 0),
        sobConsulta: !!item.sob_consulta,
      })),
      totals: {
        subtotal: Number(cartTotal || 0),
        hasSobConsulta,
      },
      metadata: {
        channel: 'site_cart',
      },
    };

    try {
      const result = await submitSupportRequest(supportPayload);
      const fallbackMessage = getSupportUserFallbackMessage(result);
      if (fallbackMessage) alert(fallbackMessage);
      openSupportWhatsapp(result.whatsappUrl, 'cart_checkout');
    } catch (error) {
      console.error('[support] cart_checkout_unexpected_error_fallback_whatsapp', {
        cartItemsCount: validCartItems.length,
        hasSobConsulta,
        error: error instanceof Error ? error.message : String(error),
      });
      alert('Não conseguimos iniciar o atendimento agora. Vamos abrir o WhatsApp para você continuar.');
      openSupportWhatsapp(buildWhatsAppUrl(supportPayload.message), 'cart_checkout');
    }
  };

  const handleStripeCheckout = async () => {
    if (checkoutStep === 'cart') {
      setCheckoutStep('address');
      return;
    }

    if (!stripeAvailability.available) {
      alert(stripeAvailability.customerMessage || 'Pagamento online indisponível neste ambiente. Continue pelo WhatsApp.');
      return;
    }

    // Validate required fields
    if (!formData.name || !formData.phone || !formData.address || !formData.number || !formData.neighborhood || !formData.city) {
      alert("Por favor, preencha todos os campos obrigatórios do endereço.");
      return;
    }

    try {
      setIsStripeLoading(true);
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe is not initialized: missing VITE_STRIPE_PUBLIC_KEY');

      const { data: authData } = await supabase.auth.getUser();
      const customerEmail = authData.user?.email || null;

      let customerId: string | null = null;
      if (customerEmail) {
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .eq('email', customerEmail)
          .maybeSingle();

        if (existingCustomer?.id) {
          customerId = existingCustomer.id;
          await supabase.from('customers').update({ name: formData.name, phone: formData.phone }).eq('id', customerId);
        } else {
          const { data: createdCustomer } = await supabase
            .from('customers')
            .insert({ name: formData.name, email: customerEmail, phone: formData.phone })
            .select('id')
            .single();
          customerId = createdCustomer?.id || null;
        }
      }

      const orderPayload = {
        customer_id: customerId,
        customer_name: formData.name,
        customer_phone: formData.phone,
        customer_email: customerEmail,
        status: 'Pendente',
        payment_status: 'Pendente',
        subtotal: cartTotal || 0,
        freight: 0,
        discount: 0,
        total: cartTotal || 0,
        delivery_address: {
          cep: formData.cep,
          address: formData.address,
          number: formData.number,
          complement: formData.complement,
          neighborhood: formData.neighborhood,
          city: formData.city,
        },
        notes: 'Criado via checkout web',
      };

      const { data: createdOrder, error: orderError } = await supabase
        .from('orders')
        .insert(orderPayload)
        .select('id')
        .single();

      if (orderError) throw orderError;

      const orderItemsPayload = validCartItems.map((item) => ({
        order_id: createdOrder.id,
        product_id: item.id,
        product_name: item.name,
        unit_price: item.price,
        quantity: item.cartQuantity || 1,
      }));

      const { error: itemError } = await supabase.from('order_items').insert(orderItemsPayload);
      if (itemError) throw itemError;

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: validCartItems,
          customer: formData,
          orderRef: createdOrder.id,
        }),
      });

      const session = await response.json();

      if (!response.ok || session.error) {
        throw new Error(session.error || 'Stripe checkout indisponível neste ambiente.');
      }

      const stripeAny = stripe as unknown as { redirectToCheckout?: (args: { sessionId: string }) => Promise<unknown> };
      if (!stripeAny.redirectToCheckout) {
        throw new Error('Método redirectToCheckout indisponível nesta versão do Stripe JS');
      }
      await stripeAny.redirectToCheckout({ sessionId: session.id });
    } catch (error) {
      console.error("Stripe checkout error:", error);
      alert(getStripeCheckoutErrorMessage(error));
    } finally {
      setIsStripeLoading(false);
    }
  };

  const handleProductClick = (id: string) => {
    setIsCartOpen(false);
    setCheckoutStep('cart');
    navigate(`/product/${id}`);
  };

  if (!isCartOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-brand-black/60 z-[100] backdrop-blur-sm transition-opacity" 
        onClick={() => setIsCartOpen(false)} 
      />
      <div className="fixed top-0 right-0 h-full w-full sm:w-[450px] bg-white z-[110] shadow-[0_0_40px_rgba(0,0,0,0.2)] flex flex-col animate-in slide-in-from-right duration-500 ease-out">
        {/* Header */}
        <div className="px-8 py-8 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="bg-brand-orange/10 p-3 rounded-2xl">
              <ShoppingBag className="w-6 h-6 text-brand-orange" />
            </div>
            <div>
              <h2 className="font-heading font-black text-2xl text-brand-black tracking-tighter leading-none uppercase">Meu Carrinho</h2>
              <p className="text-[10px] font-black text-brand-orange mt-2 uppercase tracking-[0.2em]">{cartCount} {cartCount === 1 ? 'item' : 'itens'}</p>
            </div>
          </div>
          <button 
            onClick={() => setIsCartOpen(false)} 
            className="p-3 bg-gray-50 text-gray-400 hover:text-brand-black hover:bg-gray-100 rounded-full transition-all duration-300 active:scale-90"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white p-6 sm:p-8 custom-scrollbar">
          {checkoutStep === 'cart' ? (
            validCartItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-8">
                <div className="w-32 h-32 bg-gray-50 rounded-full flex items-center justify-center border border-dashed border-gray-200 relative">
                  <ShoppingBag className="w-12 h-12 text-gray-200" />
                  <div className="absolute inset-0 bg-brand-orange/5 animate-pulse rounded-full" />
                </div>
                <div className="text-center">
                  <p className="font-heading font-black text-2xl text-brand-black mb-3 uppercase tracking-tight">O carrinho está vazio</p>
                  <p className="text-xs font-bold uppercase tracking-widest opacity-60">Escolha os melhores materiais para sua obra.</p>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="px-10 py-4 bg-brand-black text-white hover:bg-brand-orange hover:text-brand-black rounded-sm font-black uppercase tracking-[0.2em] text-[10px] active:scale-95 transition-all duration-300 shadow-xl hover:-translate-y-1"
                >
                  Continuar comprando
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {validCartItems.map(item => (
                  <div key={item.id} className="group flex gap-6 p-1 transition-all duration-300">
                    <div 
                      onClick={() => handleProductClick(item.id)}
                      className="w-28 h-28 bg-[#F9F9F9] rounded-sm border border-gray-50 overflow-hidden shrink-0 cursor-pointer relative"
                    >
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover mix-blend-multiply group-hover:scale-110 transition-transform duration-700" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                          <ShoppingBag className="w-6 h-6 opacity-10" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div className="pr-8 relative">
                        <h4 
                          className="font-heading font-black text-sm md:text-base text-brand-black uppercase tracking-tight line-clamp-2 leading-tight cursor-pointer hover:text-brand-orange transition-colors" 
                          onClick={() => handleProductClick(item.id)}
                        >
                          {item.name}
                        </h4>
                        
                        <button 
                          onClick={() => removeFromCart(item.id)}
                          className="absolute right-0 top-0 text-gray-300 hover:text-red-500 p-1 transition-all duration-300"
                          title="Remover item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] font-black text-brand-orange uppercase">BRL</span>
                          <p className="text-lg font-heading font-black text-brand-black tracking-tighter">
                            {item.sob_consulta ? 'Sob Consulta' : formatPrice(item.price).replace('R$', '').trim()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center bg-gray-50 rounded-sm p-1">
                          <button 
                            onClick={() => updateQuantity(item.id, (item.cartQuantity || 1) - 1)}
                            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-brand-black hover:bg-white transition-all rounded-sm"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-black w-8 text-center text-brand-black">{item.cartQuantity || 1}</span>
                          <button 
                            onClick={() => updateQuantity(item.id, (item.cartQuantity || 1) + 1)}
                            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-brand-black hover:bg-white transition-all rounded-sm"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-px bg-brand-orange" />
                  <h3 className="font-heading font-black text-xl text-brand-black uppercase tracking-tight">Dados de Entrega</h3>
                </div>
                
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Nome Completo</label>
                    <input 
                      name="name" 
                      value={formData.name} 
                      onChange={handleInputChange} 
                      type="text" 
                      placeholder="JOÃO DA SILVA" 
                      className="w-full px-5 py-4 bg-gray-50 border border-transparent focus:bg-white focus:border-brand-orange focus:ring-0 rounded-sm font-bold text-sm transition-all"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">WhatsApp</label>
                    <input 
                      name="phone" 
                      value={formData.phone} 
                      onChange={handleInputChange} 
                      type="tel" 
                      placeholder="(94) 99999-9999" 
                      className="w-full px-5 py-4 bg-gray-50 border border-transparent focus:bg-white focus:border-brand-orange focus:ring-0 rounded-sm font-bold text-sm transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12 sm:col-span-8 space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Endereço</label>
                      <input 
                        name="address" 
                        value={formData.address} 
                        onChange={handleInputChange} 
                        type="text" 
                        placeholder="RUA, AVENIDA..." 
                        className="w-full px-5 py-4 bg-gray-50 border border-transparent focus:bg-white focus:border-brand-orange focus:ring-0 rounded-sm font-bold text-sm transition-all"
                      />
                    </div>
                    <div className="col-span-12 sm:col-span-4 space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Nº</label>
                      <input 
                        name="number" 
                        value={formData.number} 
                        onChange={handleInputChange} 
                        type="text" 
                        placeholder="123" 
                        className="w-full px-5 py-4 bg-gray-50 border border-transparent focus:bg-white focus:border-brand-orange focus:ring-0 rounded-sm font-bold text-sm transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Bairro</label>
                      <input 
                        name="neighborhood" 
                        value={formData.neighborhood} 
                        onChange={handleInputChange} 
                        type="text" 
                        placeholder="CENTRO" 
                        className="w-full px-5 py-4 bg-gray-50 border border-transparent focus:bg-white focus:border-brand-orange focus:ring-0 rounded-sm font-bold text-sm transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Cidade</label>
                      <input 
                        name="city" 
                        value={formData.city} 
                        onChange={handleInputChange} 
                        type="text" 
                        placeholder="PARAUAPEBAS" 
                        className="w-full px-5 py-4 bg-gray-50 border border-transparent focus:bg-white focus:border-brand-orange focus:ring-0 rounded-sm font-bold text-sm transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => setCheckoutStep('cart')}
                className="w-full py-2 text-[10px] text-gray-400 hover:text-brand-orange font-black uppercase tracking-[0.2em] transition-colors text-center"
              >
                ← Voltar para o carrinho
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {validCartItems.length > 0 && (
          <div className="border-t border-gray-100 p-8 bg-white shrink-0 relative z-10">
            <div className="flex justify-between items-end mb-8">
              <span className="text-gray-400 font-black text-[10px] uppercase tracking-[0.3em]">Resumo</span>
              <div className="text-right flex items-baseline gap-2">
                <span className="text-[10px] font-black text-brand-orange uppercase">BRL</span>
                <span className="font-heading text-4xl font-black text-brand-black tracking-tighter">
                  {formatPrice(cartTotal).replace('R$', '').trim()}
                </span>
              </div>
            </div>
            
            {hasSobConsulta && (
              <div className="mb-8 bg-brand-orange/5 border border-brand-orange/10 p-4 flex items-start gap-4">
                <div className="bg-brand-orange text-white p-1 shrink-0 mt-0.5">
                  <MessageCircle className="w-3 h-3" />
                </div>
                <p className="text-[10px] text-brand-black font-bold leading-relaxed uppercase tracking-wider opacity-60">
                  Carrinho com itens <strong className="font-black text-brand-orange">sob consulta</strong>. 
                  Ajustaremos o valor final no atendimento.
                </p>
              </div>
            )}

            {checkoutStep === 'cart' ? (
              <button 
                onClick={() => setCheckoutStep('address')}
                className="group w-full bg-brand-black hover:bg-brand-orange text-white hover:text-brand-black flex items-center justify-between py-5 px-8 transition-all duration-500 shadow-2xl active:scale-95"
              >
                <div className="flex items-center gap-4">
                  <MapPin className="w-5 h-5 flex-shrink-0" />
                  <span className="text-xs font-black uppercase tracking-[0.2em]">Informar Entrega</span>
                </div>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
              </button>
            ) : (
              <div className="space-y-4">
                <button 
                  onClick={handleCheckout}
                  className="group w-full bg-[#25D366] hover:bg-white hover:text-[#25D366] border border-transparent hover:border-[#25D366] text-white flex items-center justify-between py-5 px-8 transition-all duration-500 shadow-xl active:scale-95"
                >
                  <div className="flex items-center gap-4">
                    <MessageCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="text-xs font-black uppercase tracking-[0.2em]">{hasSobConsulta ? 'Solicitar Orçamento' : 'Fechar no Zap'}</span>
                  </div>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </button>

                {!hasSobConsulta && (
                  <button 
                    onClick={handleStripeCheckout}
                    disabled={isStripeLoading || !stripeAvailability.available}
                    className="group w-full bg-brand-black hover:bg-white hover:text-brand-black border border-transparent hover:border-brand-black text-white flex items-center justify-between py-5 px-8 transition-all duration-500 shadow-xl active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-4">
                      <CreditCard className="w-5 h-5 flex-shrink-0" />
                      <span className="text-xs font-black uppercase tracking-[0.2em]">
                        {isStripeLoading ? 'Processando...' : 'Pagar Agora'}
                      </span>
                    </div>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                  </button>
                )}
              </div>
            )}
            
            <div className="mt-8 text-center">
              <button 
                onClick={clearCart}
                className="text-[9px] font-black text-gray-300 hover:text-red-500 uppercase tracking-[0.3em] transition-colors"
              >
                Limpar Tudo
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
