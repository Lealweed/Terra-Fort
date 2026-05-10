import { useEffect, useState } from 'react';
import type { AdminOrderRow } from './admin-types';
import { buildDeliveryDraft } from '../../services/admin/delivery';

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

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 max-w-3xl">
      <h3 className="font-black text-lg">Logística do pedido {order.order_code || order.id.slice(0, 8).toUpperCase()}</h3>
      <select value={order.status} onChange={(e) => onStatusChange(e.target.value)} className="w-full border border-gray-200 rounded px-3 py-2 text-sm">
        {deliveryStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
      </select>
      <Input label="Motorista responsável" value={driverName} onChange={setDriverName} />
      <Input label="Ocorrência" value={note} onChange={setNote} />
      <button onClick={() => onSaveMeta(driverName, note)} className="bg-brand-black text-white px-4 py-2 rounded text-sm font-bold">Salvar dados logísticos</button>
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
