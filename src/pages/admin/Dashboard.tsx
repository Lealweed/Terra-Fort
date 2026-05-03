import { PackageCheck, FileText, CheckCircle, Clock3, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { Product, Order } from '../../types';

// Mock Data
const mockOrders: Order[] = [
  { id: 'ORD-001', customer_name: 'Construtora Vale', total: 4500.00, status: 'Em rota de entrega', date: '2026-05-03' },
  { id: 'ORD-002', customer_name: 'João Silva', total: 250.50, status: 'Pago', date: '2026-05-03' },
  { id: 'ORD-003', customer_name: 'Maria Engenharia', total: 12500.00, status: 'Pendente', date: '2026-05-03' },
];

const mockInventory: Product[] = [
  { id: '1', name: 'Cimento CP II-E 32 RS', category: 'Materiais Brutos', price: 45.90, description: '', image_url: '', sob_consulta: false, stock_level: 150 },
  { id: '2', name: 'Cabo Flexível 2,5mm 750V', category: 'Elétrica', price: 189.90, description: '', image_url: '', sob_consulta: false, stock_level: 8 }, // Low
  { id: '3', name: 'Tubo PVC Soldável 25mm', category: 'Hidráulica', price: 32.50, description: '', image_url: '', sob_consulta: false, stock_level: 200 },
  { id: '5', name: 'Pia Inox com Cuba 150cm', category: 'Acabamento', price: 450.00, description: '', image_url: '', sob_consulta: false, stock_level: 2 }, // Critical
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'orders'>('overview');

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const getStockStatusColor = (level: number) => {
    if (level <= 5) return 'bg-red-100 text-red-800 border-red-200';
    if (level <= 20) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  const getOrderStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'Pendente': return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-sm font-bold uppercase">Pendente</span>;
      case 'Pago': return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-sm font-bold uppercase">Pago</span>;
      case 'Em rota de entrega': return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-sm font-bold uppercase flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Em Rota</span>;
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Admin Header Sub-nav */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-8">
            {['overview', 'inventory', 'orders'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-4 font-bold uppercase text-sm border-b-2 transition-colors ${
                  activeTab === tab 
                  ? 'border-brand-orange text-brand-black' 
                  : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                {tab === 'overview' && 'Visão Geral'}
                {tab === 'inventory' && 'Estoque'}
                {tab === 'orders' && 'Pedidos'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-brand-black">Resumo de Hoje</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-start gap-4">
                <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-gray-500 text-sm font-medium">Faturamento do Dia</p>
                  <p className="text-3xl font-black text-brand-black mt-1">R$ 17.250,50</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-start gap-4">
                <div className="p-3 bg-brand-orange/20 text-brand-orange rounded-lg">
                  <PackageCheck className="w-6 h-6 border-brand-orange" />
                </div>
                <div>
                  <p className="text-gray-500 text-sm font-medium">Pedidos Recebidos</p>
                  <p className="text-3xl font-black text-brand-black mt-1">12</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-orange-200 flex items-start gap-4">
                <div className="p-3 bg-red-100 text-red-600 rounded-lg">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-red-600 text-sm font-bold">Alertas de Estoque</p>
                  <p className="text-3xl font-black text-brand-black mt-1">3 <span className="text-sm font-normal text-gray-500">itens críticos</span></p>
                </div>
              </div>
            </div>

            {/* Recents */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-bold text-lg">Pedidos Recentes</h3>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <th className="p-4 font-bold">ID</th>
                    <th className="p-4 font-bold">Cliente</th>
                    <th className="p-4 font-bold">Valor</th>
                    <th className="p-4 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {mockOrders.map(order => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="p-4 font-medium">{order.id}</td>
                      <td className="p-4">{order.customer_name}</td>
                      <td className="p-4 font-bold">{formatCurrency(order.total)}</td>
                      <td className="p-4">{getOrderStatusBadge(order.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-lg">Controle de Estoque</h3>
              <button className="text-sm bg-brand-black text-brand-offwhite px-4 py-2 rounded-sm font-bold">+ Novo Produto</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <th className="p-4 font-bold">Produto</th>
                    <th className="p-4 font-bold">Categoria</th>
                    <th className="p-4 font-bold text-right">Preço</th>
                    <th className="p-4 font-bold text-center">Nível de Estoque</th>
                    <th className="p-4 font-bold text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {mockInventory.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-brand-black">{item.name}</p>
                        <p className="text-xs text-gray-400">SKU: TF-{item.id.padStart(4, '0')}</p>
                      </td>
                      <td className="p-4"><span className="bg-gray-100 px-2 py-1 rounded text-xs text-gray-600 font-medium">{item.category}</span></td>
                      <td className="p-4 font-mono text-right">{formatCurrency(item.price)}</td>
                      <td className="p-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${getStockStatusColor(item.stock_level)}`}>
                          {item.stock_level} un
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button className="text-brand-orange hover:underline font-medium text-sm">Editar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-xl font-bold text-brand-black">Link de Pagamento Rápido</h3>
                <p className="text-sm text-gray-500">Gere um link para enviar no WhatsApp do cliente.</p>
              </div>
              
              <div className="flex w-full md:w-auto items-center gap-2">
                <input 
                  type="text" 
                  id="paymentDesc"
                  placeholder="Descrição (ex: Pedido João)"
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm flex-1 md:w-48"
                />
                <input 
                  type="number" 
                  id="paymentAmount"
                  placeholder="R$ 0,00"
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm w-32"
                />
                <button 
                  onClick={async () => {
                    const descInput = document.getElementById('paymentDesc') as HTMLInputElement;
                    const amountInput = document.getElementById('paymentAmount') as HTMLInputElement;
                    const btn = document.getElementById('generateBtn') as HTMLButtonElement;
                    
                    if (!amountInput.value) return;
                    
                    const originalText = btn.innerText;
                    btn.innerText = 'Gerando...';
                    btn.disabled = true;
                    
                    try {
                        const response = await fetch('/api/create-payment-link', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                amount: parseFloat(amountInput.value),
                                description: descInput.value
                            })
                        });
                        const data = await response.json();
                        
                        if (data.url) {
                            await navigator.clipboard.writeText(data.url);
                            btn.innerText = 'Copiado!';
                            setTimeout(() => { btn.innerText = originalText; btn.disabled = false; }, 3000);
                        }
                    } catch (error) {
                        alert('Erro ao gerar link');
                        btn.innerText = originalText;
                        btn.disabled = false;
                    }
                  }}
                  id="generateBtn"
                  className="bg-brand-black text-white px-6 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-brand-orange transition-colors whitespace-nowrap"
                >
                  Gerar e Copiar Link
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-bold text-lg">Todos os Pedidos</h3>
              </div>
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <th className="p-4 font-bold">ID</th>
                    <th className="p-4 font-bold">Cliente</th>
                    <th className="p-4 font-bold">Data</th>
                    <th className="p-4 font-bold">Valor</th>
                    <th className="p-4 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {mockOrders.map(order => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="p-4 font-medium text-brand-black">{order.id}</td>
                      <td className="p-4">{order.customer_name}</td>
                      <td className="p-4 text-sm text-gray-500">{order.date}</td>
                      <td className="p-4 font-bold">{formatCurrency(order.total)}</td>
                      <td className="p-4">{getOrderStatusBadge(order.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
