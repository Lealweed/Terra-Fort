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
};

export default function AdminInventoryPage({ products, selectedProductId, productMovements, onSelectProduct, onSaveAdjustment }: Props) {
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
              <Search className="w-4 h-4 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar produto, categoria, marca" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-orange" />
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs font-bold">
              <button onClick={() => setFilter('all')} className={`rounded-lg px-3 py-2 ${filter === 'all' ? 'bg-brand-orange text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>Todos</button>
              <button onClick={() => setFilter('critical')} className={`rounded-lg px-3 py-2 ${filter === 'critical' ? 'bg-brand-orange text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>Críticos</button>
              <button onClick={() => setFilter('out')} className={`rounded-lg px-3 py-2 ${filter === 'out' ? 'bg-brand-orange text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>Zerados</button>
            </div>
          </div>
          <div className="flex-1 overflow-auto divide-y divide-gray-100">
            {filteredProducts.map((product) => {
              const critical = product.stock_level <= 5;
              return (
                <button key={product.id} onClick={() => onSelectProduct(product.id)} className={`w-full p-4 text-left transition-colors ${selectedProductId === product.id ? 'bg-orange-50' : 'hover:bg-gray-50'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-sm text-gray-900 line-clamp-2">{product.name}</p>
                      <p className="text-xs uppercase tracking-wider text-gray-500 mt-1">{product.category}</p>
                    </div>
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${product.stock_level === 0 ? 'bg-red-100 text-red-700' : critical ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                      {product.stock_level === 0 ? 'zerado' : critical ? 'crítico' : 'ok'}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-600">
                    <span>{product.brand || 'Sem marca'}</span>
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
                <p className="font-black text-lg text-gray-700">Selecione um produto</p>
                <p className="text-sm mt-2">Escolha um item da lista para ajustar estoque e ver movimentações.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="p-6 border-b border-gray-100 bg-gray-50/60">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-gray-500">Produto selecionado</p>
                    <h3 className="text-2xl font-black text-gray-900 mt-1">{selectedProduct.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{selectedProduct.category} {selectedProduct.brand ? `• ${selectedProduct.brand}` : ''}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 min-w-[260px]">
                    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                      <p className="text-xs font-bold uppercase text-gray-500">Estoque atual</p>
                      <p className="text-3xl font-black text-brand-orange mt-1">{selectedProduct.stock_level}</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                      <p className="text-xs font-bold uppercase text-gray-500">Status</p>
                      <p className={`text-lg font-black mt-2 ${selectedProduct.stock_level === 0 ? 'text-red-600' : selectedProduct.stock_level <= 5 ? 'text-orange-600' : 'text-green-600'}`}>
                        {selectedProduct.stock_level === 0 ? 'Sem estoque' : selectedProduct.stock_level <= 5 ? 'Crítico' : 'Normal'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid xl:grid-cols-2 gap-6 p-6 flex-1">
                <div className="space-y-6">
                  <div className="border border-gray-200 rounded-2xl p-5 space-y-4 bg-white shadow-sm">
                    <h4 className="font-black text-base text-gray-900">Ajuste manual de estoque</h4>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <select value={adjType} onChange={(e) => setAdjType(e.target.value as InventoryAdjustmentType)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-orange">
                        <option value="IN">Entrada (+)</option>
                        <option value="OUT">Saída (-)</option>
                      </select>
                      <input type="number" min="1" value={adjQty || ''} onChange={(e) => setAdjQty(Number(e.target.value))} placeholder="Quantidade" className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-orange" />
                    </div>
                    <textarea value={adjReason} onChange={(e) => setAdjReason(e.target.value)} placeholder="Motivo do ajuste (ex: recebimento, avaria, correção de contagem...)" rows={4} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-orange" />
                    <button onClick={() => void handleSubmit()} className="w-full bg-brand-black hover:bg-gray-800 transition-colors text-white py-3 rounded-lg font-bold text-sm">
                      Confirmar ajuste
                    </button>
                  </div>

                  <div className="border border-gray-200 rounded-2xl p-5 bg-gray-50/70">
                    <h4 className="font-black text-base text-gray-900">Regras rápidas</h4>
                    <ul className="mt-3 space-y-2 text-sm text-gray-600 list-disc list-inside">
                      <li>Saídas não podem deixar o estoque negativo.</li>
                      <li>Todo ajuste gera movimentação no histórico.</li>
                      <li>Itens com 5 unidades ou menos entram como críticos.</li>
                    </ul>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-2xl p-5 bg-white shadow-sm flex flex-col min-h-[420px]">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <h4 className="font-black text-base text-gray-900">Últimas movimentações</h4>
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{productMovements.length} registros</span>
                  </div>
                  {productMovements.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-sm text-gray-500 text-center">
                      Ainda não há movimentações registradas para este produto.
                    </div>
                  ) : (
                    <div className="space-y-3 overflow-auto pr-1">
                      {productMovements.map((movement) => (
                        <div key={movement.id} className="rounded-xl border border-gray-100 bg-gray-50/80 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-bold text-gray-900">{movement.movement_type === 'IN' ? 'Entrada' : 'Saída'} • {movement.quantity} un</p>
                              <p className="text-sm text-gray-500 mt-1">{movement.reason || 'Ajuste manual'}</p>
                            </div>
                            <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${movement.movement_type === 'IN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {movement.movement_type}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-3">{new Date(movement.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</p>
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
  const tones = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    orange: 'bg-orange-50 text-orange-700 border-orange-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    green: 'bg-green-50 text-green-700 border-green-100',
  } as const;

  return (
    <div className={`rounded-2xl border p-5 ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-black mt-2">{value}</p>
        </div>
        <div className="opacity-90">{icon}</div>
      </div>
    </div>
  );
}
