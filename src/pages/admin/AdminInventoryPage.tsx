import { useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, Boxes, PackageX, Search } from 'lucide-react';
import type { InventoryMovementRow, ProductRow } from './admin-types';
import type { InventoryAdjustmentType } from '../../services/admin/inventory';
import { summarizeInventory } from '../../services/admin/inventory';

type Props = {
  products: ProductRow[];
  selectedProductId: string;
  productMovements: InventoryMovementRow[];
  onSelectProduct: (productId: string) => void;
  onSaveAdjustment: (movementType: InventoryAdjustmentType, quantity: number, reason: string) => Promise<boolean>;
  onNewProduct: () => void;
};

export default function AdminInventoryPage({ products, selectedProductId, productMovements, onSelectProduct, onSaveAdjustment, onNewProduct }: Props) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'critical' | 'out'>('all');
  const [adjType, setAdjType] = useState<InventoryAdjustmentType>('IN');
  const [adjQty, setAdjQty] = useState(0);
  const [adjReason, setAdjReason] = useState('');

  const selectedProduct = useMemo(() => products.find((product) => product.id === selectedProductId), [products, selectedProductId]);
  const summary = useMemo(() => summarizeInventory(products), [products]);
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const haystack = `${product.name} ${product.category} ${product.brand || ''}`.toLowerCase();
      const matchesSearch = !search || haystack.includes(search.toLowerCase());
      const matchesFilter = filter === 'all'
        ? true
        : filter === 'critical'
          ? product.stock_level <= 5
          : product.stock_level === 0;
      return matchesSearch && matchesFilter;
    });
  }, [products, search, filter]);

  const handleSubmit = async () => {
    const ok = await onSaveAdjustment(adjType, adjQty, adjReason);
    if (ok) {
      setAdjQty(0);
      setAdjReason('');
      setAdjType('IN');
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard title="Produtos" value={String(summary.totalProducts)} icon={<Boxes className="w-5 h-5" />} tone="blue" />
        <MetricCard title="Estoque crítico" value={String(summary.criticalStock)} icon={<AlertTriangle className="w-5 h-5" />} tone="orange" />
        <MetricCard title="Sem estoque" value={String(summary.outOfStock)} icon={<PackageX className="w-5 h-5" />} tone="red" />
        <MetricCard title="Unidades totais" value={String(summary.totalUnits)} icon={<Boxes className="w-5 h-5" />} tone="green" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex flex-col min-h-[680px]">
          <div className="p-5 border-b border-gray-100 space-y-3 bg-gray-50/60">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 flex items-center">
                <Search className="w-4 h-4 text-gray-400 absolute left-3" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar produto..." className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10 transition-all" />
              </div>
              <button onClick={onNewProduct} className="shrink-0 bg-brand-orange text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-orange-600 transition-colors shadow-sm">
                + Novo
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs font-bold">
              <button onClick={() => setFilter('all')} className={`rounded-xl px-3 py-2 transition-all duration-300 ${filter === 'all' ? 'bg-brand-orange text-white shadow-sm shadow-brand-orange/30' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>Todos</button>
              <button onClick={() => setFilter('critical')} className={`rounded-xl px-3 py-2 transition-all duration-300 ${filter === 'critical' ? 'bg-brand-orange text-white shadow-sm shadow-brand-orange/30' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>Críticos</button>
              <button onClick={() => setFilter('out')} className={`rounded-xl px-3 py-2 transition-all duration-300 ${filter === 'out' ? 'bg-brand-orange text-white shadow-sm shadow-brand-orange/30' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>Zerados</button>
            </div>
          </div>
          <div className="flex-1 overflow-auto divide-y divide-gray-100">
            {filteredProducts.map((product) => {
              const critical = product.stock_level <= 5;
              return (
                <button key={product.id} onClick={() => onSelectProduct(product.id)} className={`w-full p-4 text-left border-l-4 transition-all duration-300 ${selectedProductId === product.id ? 'bg-orange-50/70 border-brand-orange' : 'border-transparent hover:bg-slate-50/80 hover:translate-x-0.5'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-sm text-gray-900 line-clamp-2 leading-snug">{product.name}</p>
                      <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mt-1">{product.category}</p>
                    </div>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${product.stock_level === 0 ? 'bg-red-50 text-red-700 border-red-100' : critical ? 'bg-orange-50 text-orange-700 border-orange-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
                      {product.stock_level === 0 ? 'zerado' : critical ? 'crítico' : 'ok'}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                    <span className="font-semibold">{product.brand || 'Sem marca'}</span>
                    <span className="font-black text-base text-gray-900">{product.stock_level}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[680px] flex flex-col">
          {!selectedProduct ? (
            <div className="flex-1 flex items-center justify-center text-center p-10 text-gray-500">
              <div>
                <p className="font-black text-lg text-slate-800">Selecione um produto</p>
                <p className="text-xs mt-2 text-gray-400 font-medium">Escolha um item da lista para ajustar estoque e ver movimentações.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="p-6 border-b border-gray-100 bg-gray-50/60">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Produto selecionado</p>
                    <h3 className="text-xl font-black text-slate-900 mt-1 leading-snug tracking-tight">{selectedProduct.name}</h3>
                    <p className="text-xs font-semibold text-gray-500 mt-1">{selectedProduct.category} {selectedProduct.brand ? `• ${selectedProduct.brand}` : ''}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 min-w-[260px]">
                    <div className="rounded-xl border border-gray-150 bg-white px-4 py-3 shadow-sm">
                      <p className="text-[10px] font-black uppercase text-gray-400">Estoque atual</p>
                      <p className="text-2xl font-black text-brand-orange mt-1 tracking-tight">{selectedProduct.stock_level}</p>
                    </div>
                    <div className="rounded-xl border border-gray-150 bg-white px-4 py-3 shadow-sm">
                      <p className="text-[10px] font-black uppercase text-gray-400">Status</p>
                      <p className={`text-base font-black mt-2 tracking-tight ${selectedProduct.stock_level === 0 ? 'text-red-600' : selectedProduct.stock_level <= 5 ? 'text-orange-600' : 'text-green-600'}`}>
                        {selectedProduct.stock_level === 0 ? 'Sem estoque' : selectedProduct.stock_level <= 5 ? 'Crítico' : 'Normal'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid xl:grid-cols-2 gap-6 p-6 flex-1">
                <div className="space-y-6">
                  <div className="border border-gray-150 rounded-2xl p-5 space-y-4 bg-white shadow-sm">
                    <h4 className="font-black text-sm text-slate-800 uppercase tracking-wider">Ajuste manual de estoque</h4>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <select value={adjType} onChange={(e) => setAdjType(e.target.value as InventoryAdjustmentType)} className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:bg-white focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10 transition-all font-medium text-gray-800">
                        <option value="IN">Entrada (+)</option>
                        <option value="OUT">Saída (-)</option>
                      </select>
                      <input type="number" min="1" value={adjQty || ''} onChange={(e) => setAdjQty(Number(e.target.value))} placeholder="Quantidade" className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:bg-white focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10 transition-all font-medium text-gray-800" />
                    </div>
                    <textarea value={adjReason} onChange={(e) => setAdjReason(e.target.value)} placeholder="Motivo do ajuste (ex: recebimento, avaria, correção de contagem...)" rows={4} className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:bg-white focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10 transition-all font-medium text-gray-800" />
                    <button onClick={() => void handleSubmit()} className="w-full bg-brand-black hover:bg-gray-800 transition-all text-white py-3 rounded-xl font-bold text-sm shadow-md hover:shadow-lg">
                      Confirmar ajuste
                    </button>
                  </div>

                  <div className="border border-gray-150 rounded-2xl p-5 bg-slate-50/50">
                    <h4 className="font-black text-xs text-slate-800 uppercase tracking-wider">Regras rápidas</h4>
                    <ul className="mt-3 space-y-2 text-xs text-gray-500 font-medium list-disc list-inside leading-relaxed">
                      <li>Saídas não podem deixar o estoque negativo.</li>
                      <li>Todo ajuste gera movimentação no histórico.</li>
                      <li>Itens com 5 unidades ou menos entram como críticos.</li>
                    </ul>
                  </div>
                </div>

                <div className="border border-gray-150 rounded-2xl p-5 bg-white shadow-sm flex flex-col min-h-[420px]">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <h4 className="font-black text-sm text-slate-800 uppercase tracking-wider">Últimas movimentações</h4>
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 bg-slate-50 border px-2 py-0.5 rounded-full">{productMovements.length} registros</span>
                  </div>
                  {productMovements.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-xs text-gray-400 font-medium italic text-center">
                      Ainda não há movimentações registradas para este produto.
                    </div>
                  ) : (
                    <div className="space-y-0 overflow-auto pr-1 flex-1 max-h-[360px] pt-2">
                      {productMovements.map((movement) => (
                        <div key={movement.id} className="relative pl-6 pb-6 border-l border-slate-100 last:pb-0">
                          {/* Timeline Dot */}
                          <div className={`absolute -left-[6px] top-1.5 w-3 h-3 rounded-full border-2 border-white shadow-sm ${
                            movement.movement_type === 'IN' ? 'bg-green-500' : 'bg-red-500'
                          }`} />
                          <div className="rounded-xl border border-gray-100 bg-slate-50/45 p-4 transition-all duration-300 hover:shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-bold text-sm text-slate-800">{movement.movement_type === 'IN' ? 'Entrada' : 'Saída'} • {movement.quantity} un</p>
                                <p className="text-xs text-gray-500 mt-1 font-medium leading-relaxed">{movement.reason || 'Ajuste manual'}</p>
                              </div>
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                                movement.movement_type === 'IN' 
                                  ? 'bg-green-50 text-green-700 border-green-100' 
                                  : 'bg-red-50 text-red-700 border-red-100'
                              }`}>
                                {movement.movement_type}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-3 font-semibold">{new Date(movement.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, tone }: { title: string; value: string; icon: ReactNode; tone: 'blue' | 'orange' | 'red' | 'green' }) {
  const borderColors = {
    blue: 'border-t-blue-500',
    orange: 'border-t-brand-orange',
    red: 'border-t-red-500',
    green: 'border-t-green-500',
  } as const;

  const iconContainers = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    orange: 'bg-orange-50 text-brand-orange border-orange-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    green: 'bg-green-50 text-green-600 border-green-100',
  } as const;

  return (
    <div className={`bg-white rounded-2xl border-t-4 border border-gray-100/90 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ${borderColors[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">{title}</p>
          <p className="text-3xl font-black text-slate-900 mt-2 tracking-tight">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${iconContainers[tone]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
