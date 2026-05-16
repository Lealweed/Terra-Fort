import { useState, useMemo } from 'react';
import { X, Search, Plus, Minus, Trash2 } from 'lucide-react';
import type { ProductRow } from './admin-types';
import { formatPrice } from '../../lib/utils';
import type { AdminOrderDraft } from '../../services/admin/orders';

type Props = {
  products: ProductRow[];
  onClose: () => void;
  onSave: (draft: AdminOrderDraft) => Promise<void>;
};

export default function AdminOrderCreateModal({ products, onClose, onSave }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [search, setSearch] = useState('');
  
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('Pendente');
  
  const [items, setItems] = useState<{product: ProductRow; quantity: number}[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const filteredProducts = useMemo(() => {
    return products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()));
  }, [products, search]);

  const addItem = (product: ProductRow) => {
    setItems(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setItems(prev => {
      return prev.map(i => {
        if (i.product.id === productId) {
          const newQ = i.quantity + delta;
          return newQ > 0 ? { ...i, quantity: newQ } : i;
        }
        return i;
      });
    });
  };

  const removeItem = (productId: string) => {
    setItems(prev => prev.filter(i => i.product.id !== productId));
  };

  const total = items.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

  const handleSave = async () => {
    if (!customerName || !customerPhone) {
      setError('Nome e telefone do cliente são obrigatórios.');
      return;
    }
    if (items.length === 0) {
      setError('Adicione pelo menos um produto.');
      return;
    }

    setLoading(true);
    setError('');

    const draft: AdminOrderDraft = {
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail,
      payment_status: paymentStatus,
      items: items.map(i => ({
        product_id: i.product.id,
        product_name: i.product.name,
        unit_price: i.product.price,
        quantity: i.quantity
      }))
    };

    try {
      await onSave(draft);
      onClose();
    } catch (e: any) {
      setError(e.message || 'Erro ao criar pedido.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-black text-xl text-gray-900">Novo Pedido Manual</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {error && (
            <div className="m-5 mb-0 p-3 bg-red-50 border border-red-100 text-red-700 rounded-lg text-sm font-bold">
              {error}
            </div>
          )}

          {step === 1 ? (
            <div className="flex-1 overflow-hidden flex flex-col p-5">
              <div className="mb-4 space-y-4">
                <h3 className="font-bold text-gray-900">Dados do Cliente</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Nome *</label>
                    <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-brand-orange outline-none" placeholder="João da Silva" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Telefone *</label>
                    <input type="text" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-brand-orange outline-none" placeholder="(00) 00000-0000" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">E-mail</label>
                    <input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-brand-orange outline-none" placeholder="joao@email.com" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Status de Pagamento</label>
                    <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-brand-orange outline-none">
                      <option value="Pendente">Pendente</option>
                      <option value="Pago">Pago</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="mt-auto pt-4 border-t border-gray-100 flex justify-end">
                <button onClick={() => setStep(2)} className="bg-brand-orange text-white px-6 py-2.5 rounded-xl font-bold hover:bg-orange-600 transition-colors">
                  Avançar para Itens →
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-100">
              
              <div className="flex-1 flex flex-col max-h-[400px] md:max-h-none">
                <div className="p-4 border-b border-gray-100">
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar produtos..." className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-brand-orange" />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {filteredProducts.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:border-brand-orange/50 transition-colors">
                      <div>
                        <p className="font-bold text-sm text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-500">{formatPrice(p.price)} • Estoque: {p.stock_level}</p>
                      </div>
                      <button onClick={() => addItem(p)} className="p-2 bg-gray-50 hover:bg-brand-orange hover:text-white text-gray-600 rounded-lg transition-colors">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {filteredProducts.length === 0 && <p className="text-center text-sm text-gray-500 py-4">Nenhum produto encontrado.</p>}
                </div>
              </div>

              <div className="w-full md:w-80 flex flex-col bg-gray-50/50">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="font-bold text-gray-900">Itens do Pedido</h3>
                  <span className="text-xs font-bold text-gray-500">{items.length} itens</span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {items.map(i => (
                    <div key={i.product.id} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm relative pr-8">
                      <button onClick={() => removeItem(i.product.id)} className="absolute right-2 top-2 text-gray-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <p className="font-bold text-sm text-gray-900 line-clamp-1 pr-4">{i.product.name}</p>
                      <p className="text-xs text-gray-500 font-bold mb-2">{formatPrice(i.product.price * i.quantity)}</p>
                      
                      <div className="flex items-center gap-3">
                        <div className="flex items-center bg-gray-50 border border-gray-100 rounded-md">
                          <button onClick={() => updateQuantity(i.product.id, -1)} className="p-1 hover:bg-white text-gray-600"><Minus className="w-3 h-3" /></button>
                          <span className="w-8 text-center text-xs font-bold">{i.quantity}</span>
                          <button onClick={() => updateQuantity(i.product.id, 1)} className="p-1 hover:bg-white text-gray-600"><Plus className="w-3 h-3" /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div className="text-center text-sm text-gray-500 py-8">
                      Adicione itens ao pedido.
                    </div>
                  )}
                </div>
                <div className="p-4 border-t border-gray-100 bg-white">
                  <div className="flex justify-between items-end mb-4">
                    <span className="text-sm font-bold text-gray-500">Total</span>
                    <span className="text-xl font-black text-brand-orange">{formatPrice(total)}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setStep(1)} className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                      Voltar
                    </button>
                    <button onClick={handleSave} disabled={loading || items.length === 0} className="flex-1 bg-brand-black text-white py-2.5 rounded-xl font-bold hover:bg-gray-800 transition-colors disabled:opacity-50">
                      {loading ? 'Salvando...' : 'Finalizar Pedido'}
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
