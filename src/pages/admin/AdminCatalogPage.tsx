import { useEffect, useState, type ChangeEvent } from 'react';
import { Plus } from 'lucide-react';
import type { ProductDraft, ProductRow } from './admin-types';

type Props = {
  loading: boolean;
  products: ProductRow[];
  selectedProductId: string;
  draftProduct: ProductDraft;
  uploadingImage: boolean;
  onSelectProduct: (productId: string) => void;
  onNewProduct: () => void;
  onDraftChange: (updater: (draft: ProductDraft) => ProductDraft) => void;
  onCreateProduct: () => Promise<void> | void;
  onSaveProduct: () => Promise<void> | void;
  onDeleteProduct: () => Promise<void> | void;
  onImageUpload: (event: ChangeEvent<HTMLInputElement>) => Promise<void> | void;
  onOpenInventory: (productId?: string) => void;
};

type ProductEditorTab = 'basic' | 'details';

export default function AdminCatalogPage({
  loading,
  products,
  selectedProductId,
  draftProduct,
  uploadingImage,
  onSelectProduct,
  onNewProduct,
  onDraftChange,
  onCreateProduct,
  onSaveProduct,
  onDeleteProduct,
  onImageUpload,
  onOpenInventory,
}: Props) {
  const [productTab, setProductTab] = useState<ProductEditorTab>('basic');
  const [newFeature, setNewFeature] = useState('');
  const [newSpecKey, setNewSpecKey] = useState('');
  const [newSpecValue, setNewSpecValue] = useState('');

  useEffect(() => {
    setProductTab('basic');
  }, [selectedProductId]);

  const money = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex flex-col">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-3">
            <h3 className="font-black text-lg text-gray-900">Catálogo da Loja</h3>
            <span className="text-xs font-bold bg-gray-200 text-gray-700 px-3 py-1 rounded-full shadow-sm">{products.length} itens</span>
          </div>
          <button
            onClick={onNewProduct}
            className="bg-brand-orange hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow hover:shadow-md transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Novo Produto
          </button>
        </div>
        <div className="flex-1 overflow-auto max-h-[700px] p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50/30">
          {loading ? <div className="p-4 col-span-full text-center text-gray-400 font-bold">Carregando catálogo...</div> : products.map((p) => (
            <button key={p.id} onClick={() => onSelectProduct(p.id)} className={`w-full text-left bg-white rounded-xl border p-4 flex gap-4 transition-all duration-300 group ${selectedProductId === p.id ? 'border-brand-orange shadow-md ring-1 ring-brand-orange/20' : 'border-gray-100 hover:border-orange-200 hover:shadow-sm'}`}>
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-50 shrink-0 border border-gray-100 flex items-center justify-center">
                {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform" /> : <span className="text-gray-300 text-xs font-medium">Sem foto</span>}
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`font-bold text-sm line-clamp-2 ${selectedProductId === p.id ? 'text-brand-orange' : 'text-gray-900 group-hover:text-brand-orange'} transition-colors`}>{p.name}</p>
                  {!p.is_active && <span className="bg-red-50 text-red-600 text-[10px] font-black uppercase px-2 py-0.5 rounded border border-red-100 shrink-0">Oculto</span>}
                </div>
                <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">{p.category}</p>
                <div className="mt-auto pt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${p.stock_level > 5 ? 'bg-green-500' : p.stock_level > 0 ? 'bg-orange-500' : 'bg-red-500'}`}></span>
                    <span className="text-xs font-bold text-gray-600">{p.stock_level} un</span>
                  </div>
                  <p className="font-black text-gray-900">{money(p.price)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col shadow-sm">
        <div className="flex border-b border-gray-100 bg-gray-50/50 p-2 gap-2">
          <button onClick={() => setProductTab('basic')} className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${productTab === 'basic' ? 'bg-white shadow-sm text-brand-orange' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'}`}>Básico</button>
          <button onClick={() => setProductTab('details')} className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${productTab === 'details' ? 'bg-white shadow-sm text-brand-orange' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'}`}>Detalhes</button>
        </div>

        <div className="p-5 space-y-4 overflow-auto flex-1">
          <div className="rounded-xl border border-orange-100 bg-orange-50/70 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-orange-700">Estoque</p>
                <p className="text-sm text-gray-700 mt-1">Gerencie ajustes e histórico no módulo dedicado de estoque.</p>
              </div>
              <button onClick={() => onOpenInventory(selectedProductId || undefined)} className="shrink-0 rounded-lg bg-brand-black px-3 py-2 text-xs font-bold text-white hover:bg-gray-800 transition-colors">
                Abrir estoque
              </button>
            </div>
          </div>

          {productTab === 'basic' && (
            <>
              <Input label="Nome" value={draftProduct.name} onChange={(v) => onDraftChange((d) => ({ ...d, name: v }))} />
              <Input label="Categoria" value={draftProduct.category} onChange={(v) => onDraftChange((d) => ({ ...d, category: v }))} />
              <Input label="Marca" value={draftProduct.brand || ''} onChange={(v) => onDraftChange((d) => ({ ...d, brand: v || null }))} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Preço (Venda)" type="number" value={String(draftProduct.price)} onChange={(v) => onDraftChange((d) => ({ ...d, price: Number(v || 0) }))} />
                <Input label="Preço Original (Corta)" type="number" value={String(draftProduct.original_price || '')} onChange={(v) => onDraftChange((d) => ({ ...d, original_price: Number(v) || null }))} />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider transition-colors">Imagem do Produto</label>
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <div className="flex-1 w-full">
                    <input type="text" value={draftProduct.image_url} onChange={(e) => onDraftChange((d) => ({ ...d, image_url: e.target.value }))} placeholder="Cole a URL ou faça upload" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:bg-white focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10 transition-all font-medium text-gray-800" />
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <span className="text-gray-400 text-xs font-bold uppercase hidden sm:inline">ou</span>
                    <label className={`cursor-pointer bg-brand-black hover:bg-gray-800 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2 w-full sm:w-auto ${uploadingImage ? 'opacity-70 cursor-not-allowed' : ''}`}>
                      {uploadingImage ? 'Enviando...' : 'Subir Imagem'}
                      <input type="file" accept="image/*" onChange={onImageUpload} className="hidden" disabled={uploadingImage} />
                    </label>
                  </div>
                </div>
                {draftProduct.image_url && (
                  <div className="mt-3 p-2 border border-gray-100 rounded-xl bg-gray-50/50 inline-block shadow-sm">
                    <img src={draftProduct.image_url} alt="Preview" className="h-24 w-auto object-contain mix-blend-multiply" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                <label className="text-sm font-medium flex items-center gap-2 cursor-pointer p-2 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <input type="checkbox" checked={draftProduct.sob_consulta} onChange={(e) => onDraftChange((d) => ({ ...d, sob_consulta: e.target.checked }))} className="w-4 h-4 accent-brand-orange" />
                  Sob consulta
                </label>
                <label className="text-sm font-medium flex items-center gap-2 cursor-pointer p-2 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <input type="checkbox" checked={draftProduct.is_active} onChange={(e) => onDraftChange((d) => ({ ...d, is_active: e.target.checked }))} className="w-4 h-4 accent-brand-orange" />
                  Ativo na loja
                </label>
              </div>
              <div className="pt-2">
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Descrição</label>
                <textarea value={draftProduct.description} onChange={(e) => onDraftChange((d) => ({ ...d, description: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-brand-orange focus:ring-1 focus:ring-brand-orange outline-none" rows={4} />
              </div>
            </>
          )}

          {productTab === 'details' && (
            <div className="space-y-6">
              <div>
                <h4 className="font-bold text-sm mb-2 uppercase text-gray-500 tracking-wider">Características (Features)</h4>
                <div className="flex gap-2 mb-3">
                  <input value={newFeature} onChange={(e) => setNewFeature(e.target.value)} onKeyDown={(e) => {
                    if (e.key === 'Enter' && newFeature) {
                      onDraftChange((d) => ({ ...d, features: [...(d.features || []), newFeature] }));
                      setNewFeature('');
                    }
                  }} placeholder="Ex: Produto impermeável (Aperte Enter)" className="flex-1 border border-gray-200 rounded px-3 py-2 text-sm" />
                  <button onClick={() => {
                    if (newFeature) {
                      onDraftChange((d) => ({ ...d, features: [...(d.features || []), newFeature] }));
                      setNewFeature('');
                    }
                  }} className="bg-brand-orange text-white px-4 rounded text-sm font-bold hover:bg-orange-600 transition-colors">+</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(draftProduct.features || []).length === 0 && <span className="text-xs text-gray-400">Nenhuma característica adicionada.</span>}
                  {(draftProduct.features || []).map((f, i) => (
                    <span key={i} className="bg-orange-50 text-orange-800 text-sm px-3 py-1 rounded-full border border-orange-200 flex items-center gap-2">
                      {f} <button onClick={() => onDraftChange((d) => ({ ...d, features: d.features?.filter((_, idx) => idx !== i) || [] }))} className="text-red-500 hover:text-red-700 font-bold ml-1">×</button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h4 className="font-bold text-sm mb-2 uppercase text-gray-500 tracking-wider">Especificações Técnicas</h4>
                <div className="flex gap-2 mb-3">
                  <input value={newSpecKey} onChange={(e) => setNewSpecKey(e.target.value)} placeholder="Atributo (ex: Peso)" className="flex-1 border border-gray-200 rounded px-3 py-2 text-sm" />
                  <input value={newSpecValue} onChange={(e) => setNewSpecValue(e.target.value)} onKeyDown={(e) => {
                    if (e.key === 'Enter' && newSpecKey && newSpecValue) {
                      onDraftChange((d) => ({ ...d, specifications: { ...(d.specifications || {}), [newSpecKey]: newSpecValue } }));
                      setNewSpecKey('');
                      setNewSpecValue('');
                    }
                  }} placeholder="Valor (ex: 5kg)" className="flex-1 border border-gray-200 rounded px-3 py-2 text-sm" />
                  <button onClick={() => {
                    if (newSpecKey && newSpecValue) {
                      onDraftChange((d) => ({ ...d, specifications: { ...(d.specifications || {}), [newSpecKey]: newSpecValue } }));
                      setNewSpecKey('');
                      setNewSpecValue('');
                    }
                  }} className="bg-brand-orange text-white px-4 rounded text-sm font-bold hover:bg-orange-600 transition-colors">+</button>
                </div>
                <div className="space-y-2">
                  {Object.keys(draftProduct.specifications || {}).length === 0 && <span className="text-xs text-gray-400">Nenhuma especificação técnica.</span>}
                  {Object.entries(draftProduct.specifications || {}).map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center border border-gray-100 rounded-lg px-3 py-2 text-sm bg-gray-50">
                      <span className="font-semibold text-gray-700">{k}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-600">{v}</span>
                        <button onClick={() => onDraftChange((d) => {
                          const nextSpecs = { ...(d.specifications || {}) };
                          delete nextSpecs[k];
                          return { ...d, specifications: nextSpecs };
                        })} className="text-red-500 hover:text-red-700 font-bold">×</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 p-5 border-t bg-gray-50 mt-auto">
          <button onClick={() => void onCreateProduct()} className="bg-green-600 hover:bg-green-700 transition-colors text-white py-2.5 rounded-lg text-sm font-bold">Criar</button>
          <button onClick={() => void onSaveProduct()} className="bg-brand-black hover:bg-gray-800 transition-colors text-white py-2.5 rounded-lg text-sm font-bold">Salvar</button>
          <button onClick={() => void onDeleteProduct()} className="bg-red-600 hover:bg-red-700 transition-colors text-white py-2.5 rounded-lg text-sm font-bold">Excluir</button>
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-brand-orange focus:ring-1 focus:ring-brand-orange outline-none" />
    </div>
  );
}
