import { Printer } from 'lucide-react';
import type { AdminOrderRow, AdminOrderItemRow } from './admin-types';
import { formatPrice } from '../../lib/utils';

type Props = {
  order: AdminOrderRow;
  orderItems: AdminOrderItemRow[];
  onClose: () => void;
};

export default function AdminOrderReceipt({ order, orderItems, onClose }: Props) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:p-0 print:bg-white print:block">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-auto shadow-2xl print:shadow-none print:rounded-none print:max-h-none print:w-full print:max-w-none relative flex flex-col">
        
        {/* Header - Hidden on Print */}
        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex justify-between items-center print:hidden z-10 shrink-0">
          <h2 className="font-black text-xl">Recibo Digital</h2>
          <div className="flex items-center gap-3">
            <button onClick={handlePrint} className="flex items-center gap-2 bg-brand-orange text-white px-4 py-2 rounded-lg font-bold hover:bg-orange-600 transition-colors">
              <Printer className="w-4 h-4" /> Imprimir
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-900 font-bold p-2">
              Fechar
            </button>
          </div>
        </div>

        {/* Receipt Content */}
        <div className="p-8 print:p-0 flex-1 overflow-y-auto" id="receipt-content">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-brand-orange tracking-tighter">Terra<span className="text-brand-black">Fort</span></h1>
            <p className="text-sm text-gray-500 mt-1 font-medium">A maior variedade de materiais para sua obra.</p>
            <div className="mt-4 border-t border-b border-dashed border-gray-200 py-3 text-sm text-gray-600">
              <p>CNPJ: 00.000.000/0000-00</p>
              <p>Parauapebas, PA</p>
            </div>
          </div>

          <div className="flex justify-between items-start mb-8">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Cliente</p>
              <p className="font-black text-lg text-gray-900 mt-1">{order.customer_name || 'Consumidor Final'}</p>
              {order.customer_phone && <p className="text-sm text-gray-600">{order.customer_phone}</p>}
              {order.customer_email && <p className="text-sm text-gray-600">{order.customer_email}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pedido / Recibo</p>
              <p className="font-black text-lg text-gray-900 mt-1">{order.order_code || order.id.slice(0,8).toUpperCase()}</p>
              <p className="text-sm text-gray-600">{new Date(order.created_at).toLocaleDateString('pt-BR')} às {new Date(order.created_at).toLocaleTimeString('pt-BR')}</p>
            </div>
          </div>

          <div className="mb-8">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Endereço de Entrega</p>
            <div className="bg-gray-50 rounded-lg p-4 print:bg-transparent print:border print:border-gray-200">
              {typeof order.delivery_address === 'object' && order.delivery_address ? (
                <p className="text-sm text-gray-800">
                  {order.delivery_address.address || 'Endereço não preenchido'}
                  {order.delivery_address.number ? `, ${order.delivery_address.number}` : ''}
                  {order.delivery_address.complement ? ` - ${order.delivery_address.complement}` : ''}
                  <br />
                  {order.delivery_address.neighborhood && order.delivery_address.city ? `${order.delivery_address.neighborhood} - ${order.delivery_address.city}` : ''}
                  <br />
                  {order.delivery_address.cep ? `CEP: ${order.delivery_address.cep}` : ''}
                </p>
              ) : (
                <p className="text-sm text-gray-800">Retirada na loja / Endereço não informado</p>
              )}
            </div>
          </div>

          <div className="mb-8">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b-2 border-gray-800 text-gray-900 font-black uppercase text-xs">
                  <th className="py-3">Qtd</th>
                  <th className="py-3">Descrição</th>
                  <th className="py-3 text-right">Unit.</th>
                  <th className="py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orderItems.map((item, idx) => (
                  <tr key={item.id || idx} className="text-gray-700">
                    <td className="py-3 font-bold">{item.quantity}</td>
                    <td className="py-3">{item.product_name}</td>
                    <td className="py-3 text-right">{formatPrice(Number(item.unit_price || 0))}</td>
                    <td className="py-3 text-right font-bold">{formatPrice(Number(item.line_total || 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end mb-8">
            <div className="w-full max-w-sm space-y-3">
              <div className="flex justify-between text-gray-600 text-sm">
                <span>Subtotal</span>
                <span>{formatPrice(Number(order.total))}</span>
              </div>
              <div className="flex justify-between border-t-2 border-gray-800 pt-3 text-xl font-black text-gray-900">
                <span>Total GERAL</span>
                <span>{formatPrice(Number(order.total))}</span>
              </div>
            </div>
          </div>

          <div className="text-center mt-12 border-t border-gray-200 pt-8">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Status do Pagamento</p>
            <p className="font-black text-lg text-gray-900">{order.payment_status}</p>
            <div className="mt-8 text-xs text-gray-400">
              <p>Este é um documento não fiscal válido como recibo simples.</p>
              <p>Obrigado por comprar na TerraFort!</p>
            </div>
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #receipt-content, #receipt-content * {
            visibility: visible;
          }
          #receipt-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}} />
    </div>
  );
}
