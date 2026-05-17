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
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="bg-brand-orange/10 p-2.5 rounded-xl">
              <ShoppingBag className="w-5 h-5 text-brand-orange" />
            </div>
            <div>
              <h2 className="font-heading font-black text-xl text-brand-black tracking-tight leading-none">Meu Carrinho</h2>
              <p className="text-xs font-bold text-gray-400 mt-1">{cartCount} {cartCount === 1 ? 'item' : 'itens'}</p>
            </div>
          </div>
          <button 
            onClick={() => setIsCartOpen(false)} 
            className="p-2.5 bg-gray-50 text-gray-400 hover:text-brand-black hover:bg-gray-100 rounded-full transition-all duration-300 active:scale-90 shadow-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50/50 p-4 sm:p-6 custom-scrollbar">
          {checkoutStep === 'cart' ? (
            validCartItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-6">
                <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center border-2 border-dashed border-gray-200">
                  <ShoppingBag className="w-10 h-10 text-gray-300" />
                </div>
                <div className="text-center">
                  <p className="font-heading font-bold text-xl text-brand-black mb-2">Seu carrinho está vazio</p>
                  <p className="text-sm">Que tal adicionar alguns materiais?</p>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="px-8 py-3.5 bg-brand-black text-white hover:bg-brand-orange hover:text-brand-black rounded-xl font-bold active:scale-95 transition-all duration-300 shadow-md hover:shadow-xl hover:-translate-y-1"
                >
                  Continuar comprando
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {validCartItems.map(item => (
                  <div key={item.id} className="group flex gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300">
                    <div 
                      onClick={() => handleProductClick(item.id)}
                      className="w-24 h-24 bg-gray-50 rounded-xl border border-gray-50 overflow-hidden shrink-0 cursor-pointer relative"
                    >
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover mix-blend-multiply group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                          <ShoppingBag className="w-6 h-6 opacity-30 mb-1" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div className="pr-6 relative">
                        <h4 
                          className="font-heading font-bold text-sm text-brand-black line-clamp-2 leading-tight cursor-pointer hover:text-brand-orange transition-colors" 
                          onClick={() => handleProductClick(item.id)}
                        >
                          {item.name}
                        </h4>
                        
                        <button 
                          onClick={() => removeFromCart(item.id)}
                          className="absolute right-0 top-0 text-gray-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all duration-300 -mr-2"
                          title="Remover item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <p className="text-[13px] font-black text-brand-orange mt-1.5">
                          {item.sob_consulta ? 'Sob Consulta' : formatPrice(item.price)}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center bg-gray-50 border border-gray-100 rounded-lg p-0.5">
                          <button 
                            onClick={() => updateQuantity(item.id, (item.cartQuantity || 1) - 1)}
                            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-brand-black hover:bg-white rounded-md transition-all duration-200"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-sm font-bold w-8 text-center text-brand-black">{item.cartQuantity || 1}</span>
                          <button 
                            onClick={() => updateQuantity(item.id, (item.cartQuantity || 1) + 1)}
                            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-brand-black hover:bg-white rounded-md transition-all duration-200"
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
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-5 h-5 text-brand-orange" />
                  <h3 className="font-bold text-lg text-brand-black">Dados Pessoais</h3>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Nome Completo *</label>
                  <input 
                    name="name" 
                    value={formData.name} 
                    onChange={handleInputChange} 
                    type="text" 
                    placeholder="João da Silva" 
                    className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:bg-white focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10 rounded-xl transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Celular / WhatsApp *</label>
                  <input 
                    name="phone" 
                    value={formData.phone} 
                    onChange={handleInputChange} 
                    type="tel" 
                    placeholder="(00) 00000-0000" 
                    className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:bg-white focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10 rounded-xl transition-all"
                  />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-5 h-5 text-brand-orange" />
                  <h3 className="font-bold text-lg text-brand-black">Endereço de Entrega</h3>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">CEP *</label>
                  <input 
                    name="cep" 
                    value={formData.cep} 
                    onChange={handleInputChange} 
                    type="text" 
                    placeholder="00000-000" 
                    className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:bg-white focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10 rounded-xl transition-all"
                  />
                </div>
                
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-8">
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Rua / Avenida *</label>
                    <input 
                      name="address" 
                      value={formData.address} 
                      onChange={handleInputChange} 
                      type="text" 
                      placeholder="Ex: Rua das Flores" 
                      className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:bg-white focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10 rounded-xl transition-all"
                    />
                  </div>
                  <div className="col-span-4">
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Número *</label>
                    <input 
                      name="number" 
                      value={formData.number} 
                      onChange={handleInputChange} 
                      type="text" 
                      placeholder="123" 
                      className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:bg-white focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10 rounded-xl transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Complemento</label>
                  <input 
                    name="complement" 
                    value={formData.complement} 
                    onChange={handleInputChange} 
                    type="text" 
                    placeholder="Apto, Bloco, Casa (Opcional)" 
                    className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:bg-white focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10 rounded-xl transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Bairro *</label>
                    <input 
                      name="neighborhood" 
                      value={formData.neighborhood} 
                      onChange={handleInputChange} 
                      type="text" 
                      placeholder="Centro" 
                      className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:bg-white focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10 rounded-xl transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Cidade *</label>
                    <input 
                      name="city" 
                      value={formData.city} 
                      onChange={handleInputChange} 
                      type="text" 
                      placeholder="São Paulo" 
                      className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:bg-white focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10 rounded-xl transition-all"
                    />
                  </div>
                </div>

              </div>
              
              <button 
                onClick={() => setCheckoutStep('cart')}
                className="w-full py-3 text-sm text-gray-500 hover:text-brand-black font-bold transition-colors text-center"
              >
                Voltar para o carrinho
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {validCartItems.length > 0 && (
          <div className="border-t border-gray-100 p-6 bg-white shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.02)] relative z-10">
            <div className="flex justify-between items-end mb-5">
              <span className="text-gray-400 font-bold text-sm uppercase tracking-wider">Subtotal</span>
              <div className="text-right">
                <span className="font-heading text-3xl font-black text-brand-black tracking-tight flex items-baseline">
                  {formatPrice(cartTotal).replace('R$', '').trim()}
                  <span className="text-lg text-gray-400 font-bold ml-1">R$</span>
                </span>
              </div>
            </div>
            
            {hasSobConsulta && (
              <div className="mb-5 bg-brand-orange/10 border border-brand-orange/20 rounded-xl p-3 flex items-start gap-3">
                <div className="bg-brand-orange text-white rounded-full p-1 shrink-0 mt-0.5">
                  <MessageCircle className="w-3 h-3" />
                </div>
                <p className="text-xs text-brand-black font-medium leading-relaxed">
                  Seu carrinho contém itens <strong className="font-bold text-brand-orange">sob consulta</strong>. 
                  O valor final será ajustado no atendimento.
                </p>
              </div>
            )}

            {checkoutStep === 'cart' ? (
              <button 
                onClick={() => setCheckoutStep('address')}
                className="group w-full bg-brand-black hover:bg-black text-white flex items-center justify-between py-4 px-6 rounded-xl font-bold transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-black/30 active:scale-95"
              >
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 flex-shrink-0" />
                  <span className="text-lg">Informar Endereço de Entrega</span>
                </div>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            ) : (
              <div className="space-y-3">
                <button 
                  onClick={handleCheckout}
                  className="group w-full bg-[#25D366] hover:bg-[#20b858] text-white flex items-center justify-between py-4 px-6 rounded-xl font-bold transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-[#25D366]/30 active:scale-95"
                >
                  <div className="flex items-center gap-3">
                    <MessageCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="text-lg text-left leading-tight">{hasSobConsulta ? 'Solicitar Cotação no Zap' : 'Fechar no Zap'}</span>
                  </div>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>

                {!hasSobConsulta && (
                  <>
                    {!stripeAvailability.available && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-left">
                        <p className="text-xs font-semibold text-amber-900 leading-relaxed">
                          {stripeAvailability.customerMessage}
                        </p>
                        {stripeAvailability.operatorMessage && (
                          <p className="text-[11px] text-amber-800 mt-2 leading-relaxed">
                            Operação local: {stripeAvailability.operatorMessage}
                          </p>
                        )}
                      </div>
                    )}
                    <button 
                      onClick={handleStripeCheckout}
                      disabled={isStripeLoading || !stripeAvailability.available}
                      className="group w-full bg-brand-black hover:bg-black text-white flex items-center justify-between py-4 px-6 rounded-xl font-bold transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-black/30 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-5 h-5 flex-shrink-0" />
                        <span className="text-lg text-left leading-tight">
                          {isStripeLoading ? 'Processando...' : stripeAvailability.available ? 'Pagar Agora (Cartão/Pix)' : 'Pagamento Online Indisponível'}
                        </span>
                      </div>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </>
                )}
              </div>
            )}
            
            <div className="mt-4 text-center">
              <button 
                onClick={clearCart}
                className="text-xs font-bold text-gray-400 hover:text-red-500 uppercase tracking-wider transition-colors py-2 px-4 rounded-lg hover:bg-red-50"
              >
                Esvaziar carrinho
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
