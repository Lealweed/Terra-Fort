import { useEffect, useState, type ReactNode } from 'react';
import { ExternalLink, MapPin, Phone, Truck } from 'lucide-react';
import type { AdminOrderRow } from './admin-types';
import { buildDeliveryDraft, buildMapsSearchUrl, buildPhoneHref, summarizeDeliveryAddress } from '../../services/admin/delivery';

type Props = {
  order?: AdminOrderRow;
  deliveryStatuses: string[];
  onStatusChange: (status: string) => Promise<void> | void;
  onSaveMeta: (driverName: string, note: string) => Promise<void> | void;
};

export default function AdminDeliveryPage({ order, deliveryStatuses, onStatusChange, onSaveMeta }: Props) {
  const [driverName, setDriverName] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    const draft = buildDeliveryDraft(order?.delivery_address);
    setDriverName(draft.driverName);
    setNote(draft.note);
  }, [order?.id, order?.delivery_address]);

  if (!order) {
    return <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-3xl text-sm text-gray-500">Selecione um pedido para gerenciar a logística.</div>;
  }

  const addressLabel = summarizeDeliveryAddress(order.delivery_address);
  const mapsUrl = buildMapsSearchUrl(order.delivery_address);
  const phoneHref = buildPhoneHref(order.customer_phone);
  const proofUrl = typeof order.delivery_address?.proofUrl === 'string' ? order.delivery_address.proofUrl : '';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5 max-w-4xl shadow-sm">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h3 className="font-black text-lg">Logística do pedido {order.order_code || order.id.slice(0, 8).toUpperCase()}</h3>
          <p className="text-sm text-gray-500 mt-1">Cliente: {order.customer_name} • Pagamento: {order.payment_status}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {phoneHref && <a href={phoneHref} className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-3 py-2 text-sm font-bold text-white"><Phone className="w-4 h-4" />Ligar</a>}
          {mapsUrl && <a href={mapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold text-white"><MapPin className="w-4 h-4" />Abrir rota</a>}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <Tile label="Status atual" value={order.status} icon={<Truck className="w-4 h-4" />} />
        <Tile label="Entregador" value={driverName || 'Não atribuído'} icon={<Truck className="w-4 h-4" />} />
        <Tile label="Endereço" value={addressLabel} icon={<MapPin className="w-4 h-4" />} />
      </div>

      <select value={order.status} onChange={(e) => onStatusChange(e.target.value)} className="w-full border border-gray-200 rounded px-3 py-2 text-sm">
        {deliveryStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
      </select>
      <Input label="Motorista responsável" value={driverName} onChange={setDriverName} />
      <Input label="Ocorrência" value={note} onChange={setNote} />
      {proofUrl && <a href={proofUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-bold text-brand-orange hover:underline"><ExternalLink className="w-4 h-4" />Abrir comprovante atual</a>}
      <button onClick={() => onSaveMeta(driverName, note)} className="bg-brand-black text-white px-4 py-2 rounded text-sm font-bold">Salvar dados logísticos</button>
    </div>
  );
}

function Tile({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-500">{icon}{label}</div>
      <p className="mt-2 text-sm font-bold text-gray-900">{value}</p>
    </div>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-gray-200 rounded px-3 py-2 text-sm" />
    </div>
  );
}
