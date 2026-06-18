import { useEffect, useState, type ChangeEvent } from 'react';
import { Plus, Trash2, Save, FilePlus, ExternalLink } from 'lucide-react';
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
            <h3 className="font-black text-lg text-slate-800 tracking-tight">Catálogo da Loja</h3>
            <span className="text-[10px] font-black bg-slate-100 border text-gray-500 px-3 py-1 rounded-full shadow-sm">{products.length} itens</span>
          </div>
          <button
            onClick={onNewProduct}
            className="bg-brand-orange hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:shadow transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Novo Produto
          </button>
        </div>
        <div className="flex-1 overflow-auto max-h-[700px] p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50/30">
          {loading ? (
            <div className="p-12 col-span-full text-center text-gray-400 font-bold italic">Carregando catálogo...</div>
          ) : (
            products.map((p) => {
              const isSelected = selectedProductId === p.id;
              return (
                <button 
                  key={p.id} 
                  onClick={() => onSelectProduct(p.id)} 
                  className={`w-full text-left bg-white rounded-xl border p-4 flex gap-4 transition-all duration-300 group relative overflow-hidden ${
                    isSelected 
                      ? 'border-brand-orange shadow-md ring-4 ring-brand-orange/5' 
                      : 'border-slate-100 hover:border-orange-200 hover:shadow-sm'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-0 left-0 w-[4px] h-full bg-brand-orange"></div>
                  )}
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-50 shrink-0 border border-slate-100 flex items-center justify-center p-2">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <span className="text-gray-300 text-[10px] font-bold uppercase tracking-wider text-center">Sem foto</span>
                    )}
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`font-black text-sm line-clamp-2 leading-snug ${isSelected ? 'text-brand-orange' : 'text-slate-800 group-hover:text-brand-orange'} transition-colors`}>{p.name}</p>
                      {!p.is_active && <span className="bg-red-50 text-red-650 text-[9px] font-black uppercase px-2 py-0.5 rounded border border-red-100 shrink-0 tracking-wider">Oculto</span>}
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">{p.category}</p>
                    <div className="mt-auto pt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${p.stock_level > 5 ? 'bg-green-500' : p.stock_level > 0 ? 'bg-orange-500' : 'bg-red-500'}`}></span>
                        <span className="text-xs font-semibold text-gray-500">{p.stock_level} un</span>
                      </div>
                      <p className="font-black text-sm text-slate-800">{money(p.price)}</p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col shadow-sm">
        <div className="flex border-b border-gray-100 bg-gray-50/50 p-2 gap-2">
          <button onClick={() => setProductTab('basic')} className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${productTab === 'basic' ? 'bg-white shadow-sm text-brand-orange' : 'text-gray-500 hover:text-slate-800 hover:bg-slate-100/70'}`}>Básico</button>
          <button onClick={() => setProductTab('details')} className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${productTab === 'details' ? 'bg-white shadow-sm text-brand-orange' : 'text-gray-500 hover:text-slate-800 hover:bg-slate-100/70'}`}>Detalhes</button>
        </div>

        <div className="p-5 space-y-4 overflow-auto flex-1">
          <div className="rounded-xl border border-orange-100 bg-orange-50/50 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-orange-700">Estoque</p>
                <p className="text-xs text-gray-600 mt-1 font-medium leading-relaxed">Gerencie ajustes e histórico no módulo dedicado de estoque.</p>
              </div>
              <button onClick={() => onOpenInventory(selectedProductId || undefined)} className="shrink-0 rounded-lg bg-brand-black px-3 py-2 text-xs font-bold text-white hover:bg-gray-800 transition-colors shadow-sm flex items-center gap-1.5">
                Estoque <ExternalLink className="w-3.5 h-3.5" />
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
                <Input label="Preço Original (Riscado)" type="number" value={String(draftProduct.original_price || '')} onChange={(v) => onDraftChange((d) => ({ ...d, original_price: Number(v) || null }))} />
              </div>

              <div className="group/input">
                <label className="block text-[10px] font-black text-gray-400 mb-1.5 uppercase tracking-wider">Imagem do Produto</label>
                <div className="flex flex-col gap-3">
                  <div className="flex-1 w-full">
                    <input type="text" value={draftProduct.image_url} onChange={(e) => onDraftChange((d) => ({ ...d, image_url: e.target.value }))} placeholder="Cole a URL ou faça upload" className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:bg-white focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10 transition-all font-medium text-slate-800" />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-xs font-bold uppercase">ou</span>
                    <label className={`cursor-pointer bg-brand-black hover:bg-gray-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 ${uploadingImage ? 'opacity-70 cursor-not-allowed' : ''}`}>
                      {uploadingImage ? 'Enviando...' : 'Subir Imagem'}
                      <input type="file" accept="image/*" onChange={onImageUpload} className="hidden" disabled={uploadingImage} />
                    </label>
                  </div>
                </div>
                {draftProduct.image_url && (
                  <div className="mt-3 p-2 border border-slate-100 rounded-xl bg-slate-50/50 inline-block shadow-sm">
                    <img src={draftProduct.image_url} alt="Preview" className="h-24 w-auto object-contain mix-blend-multiply" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-2.5 cursor-pointer p-3 border border-slate-150 rounded-xl bg-slate-50/55 hover:bg-slate-50 transition-colors">
                  <input type="checkbox" checked={draftProduct.sob_consulta} onChange={(e) => onDraftChange((d) => ({ ...d, sob_consulta: e.target.checked }))} className="w-4 h-4 rounded text-brand-orange focus:ring-brand-orange accent-brand-orange" />
                  Sob consulta
                </label>
                <label className="text-xs font-bold text-slate-700 flex items-center gap-2.5 cursor-pointer p-3 border border-slate-150 rounded-xl bg-slate-50/55 hover:bg-slate-50 transition-colors">
                  <input type="checkbox" checked={draftProduct.is_active} onChange={(e) => onDraftChange((d) => ({ ...d, is_active: e.target.checked }))} className="w-4 h-4 rounded text-brand-orange focus:ring-brand-orange accent-brand-orange" />
                  Ativo na loja
                </label>
              </div>

              <div className="pt-2 group/input">
                <label className="block text-[10px] font-black text-gray-400 mb-1.5 uppercase tracking-wider group-focus-within/input:text-brand-orange transition-colors">Descrição</label>
                <textarea value={draftProduct.description} onChange={(e) => onDraftChange((d) => ({ ...d, description: e.target.value }))} className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:bg-white focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10 transition-all font-medium text-slate-800" rows={4} />
              </div>
            </>
          )}

          {productTab === 'details' && (
            <div className="space-y-6">
              <div>
                <h4 className="font-black text-xs mb-2.5 uppercase text-slate-800 tracking-wider">Características (Features)</h4>
                <div className="flex gap-2 mb-3">
                  <input value={newFeature} onChange={(e) => setNewFeature(e.target.value)} onKeyDown={(e) => {
                    if (e.key === 'Enter' && newFeature) {
                      onDraftChange((d) => ({ ...d, features: [...(d.features || []), newFeature] }));
                      setNewFeature('');
                    }
                  }} placeholder="Ex: Impermeável (Aperte Enter)" className="flex-1 bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:bg-white focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10 transition-all font-medium text-slate-800" />
                  <button onClick={() => {
                    if (newFeature) {
                      onDraftChange((d) => ({ ...d, features: [...(d.features || []), newFeature] }));
                      setNewFeature('');
                    }
                  }} className="bg-brand-orange text-white px-4 rounded-xl text-sm font-bold hover:bg-orange-600 transition-colors shadow-sm">+</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(draftProduct.features || []).length === 0 && <span className="text-xs text-gray-400 font-medium italic">Nenhuma característica adicionada.</span>}
                  {(draftProduct.features || []).map((f, i) => (
                    <span key={i} className="bg-orange-50/50 text-orange-850 text-xs font-bold px-3 py-1 rounded-full border border-orange-100 flex items-center gap-2">
                      {f} <button onClick={() => onDraftChange((d) => ({ ...d, features: d.features?.filter((_, idx) => idx !== i) || [] }))} className="text-red-500 hover:text-red-700 font-bold ml-1">×</button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h4 className="font-black text-xs mb-2.5 uppercase text-slate-800 tracking-wider">Especificações Técnicas</h4>
                <div className="flex flex-col sm:flex-row gap-2 mb-3">
                  <input value={newSpecKey} onChange={(e) => setNewSpecKey(e.target.value)} placeholder="Atributo (ex: Peso)" className="flex-1 bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:bg-white focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10 transition-all font-medium text-slate-800" />
                  <input value={newSpecValue} onChange={(e) => setNewSpecValue(e.target.value)} onKeyDown={(e) => {
                    if (e.key === 'Enter' && newSpecKey && newSpecValue) {
                      onDraftChange((d) => ({ ...d, specifications: { ...(d.specifications || {}), [newSpecKey]: newSpecValue } }));
                      setNewSpecKey('');
                      setNewSpecValue('');
                    }
                  }} placeholder="Valor (ex: 5kg)" className="flex-1 bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:bg-white focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10 transition-all font-medium text-slate-800" />
                  <button onClick={() => {
                    if (newSpecKey && newSpecValue) {
                      onDraftChange((d) => ({ ...d, specifications: { ...(d.specifications || {}), [newSpecKey]: newSpecValue } }));
                      setNewSpecKey('');
                      setNewSpecValue('');
                    }
                  }} className="bg-brand-orange text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-orange-600 transition-colors shadow-sm">+</button>
                </div>
                <div className="space-y-2">
                  {Object.keys(draftProduct.specifications || {}).length === 0 && <span className="text-xs text-gray-400 font-medium italic">Nenhuma especificação técnica.</span>}
                  {Object.entries(draftProduct.specifications || {}).map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center border border-gray-100 rounded-xl px-4 py-2.5 text-xs bg-slate-50/50">
                      <span className="font-bold text-slate-700">{k}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-600 font-semibold">{v}</span>
                        <button onClick={() => onDraftChange((d) => {
                          const nextSpecs = { ...(d.specifications || {}) };
                          delete nextSpecs[k];
                          return { ...d, specifications: nextSpecs };
                        })} className="text-red-500 hover:text-red-700 font-bold font-sans">×</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 p-5 border-t bg-gray-50/70 mt-auto animate-fade-in">
          <button onClick={() => void onCreateProduct()} className="bg-green-600 hover:bg-green-700 transition-colors text-white py-3 rounded-xl text-sm font-bold shadow-sm">Criar</button>
          <button onClick={() => void onSaveProduct()} className="bg-brand-black hover:bg-gray-800 transition-colors text-white py-3 rounded-xl text-sm font-bold shadow-sm">Salvar</button>
          <button onClick={() => void onDeleteProduct()} className="bg-red-600 hover:bg-red-700 transition-colors text-white py-3 rounded-xl text-sm font-bold shadow-sm">Excluir</button>
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="group/input">
      <label className="block text-[10px] font-black text-gray-400 mb-1.5 uppercase tracking-wider group-focus-within/input:text-brand-orange transition-colors">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:bg-white focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10 transition-all font-medium text-slate-800" />
    </div>
  );
}
