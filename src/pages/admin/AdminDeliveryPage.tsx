import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ExternalLink, MapPin, Phone, PlusCircle, Save, Truck, UserRound } from 'lucide-react';
import type { AdminDriverDraft, AdminDriverRow, AdminOrderRow } from './admin-types';
import { buildDeliveryDraft, buildMapsSearchUrl, buildPhoneHref, summarizeDeliveryAddress } from '../../services/admin/delivery';

type Props = {
  order?: AdminOrderRow;
  drivers: AdminDriverRow[];
  draftDriver: AdminDriverDraft;
  selectedDriverAdminId: string;
  deliveryStatuses: string[];
  onStatusChange: (status: string) => Promise<void> | void;
  onSaveMeta: (driverId: string, note: string) => Promise<void> | void;
  onDriverDraftChange: (updater: (current: AdminDriverDraft) => AdminDriverDraft) => void;
  onSelectDriverAdmin: (driverId: string) => void;
  onSaveDriver: () => Promise<void> | void;
  onNewDriver: () => void;
};

export default function AdminDeliveryPage({
  order,
  drivers,
  draftDriver,
  selectedDriverAdminId,
  deliveryStatuses,
  onStatusChange,
  onSaveMeta,
  onDriverDraftChange,
  onSelectDriverAdmin,
  onSaveDriver,
  onNewDriver,
}: Props) {
  const deliveryDraft = useMemo(() => buildDeliveryDraft(order), [order?.id, order?.assigned_driver_id, order?.delivery_address]);
  const [assignedDriverId, setAssignedDriverId] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    setAssignedDriverId(deliveryDraft.driverId);
    setNote(deliveryDraft.note);
  }, [deliveryDraft]);

  const selectedAssignedDriver = useMemo(
    () => drivers.find((driver) => driver.id === assignedDriverId) || null,
    [drivers, assignedDriverId],
  );
  const currentDriverLabel = selectedAssignedDriver?.name || deliveryDraft.driverName || 'Não atribuído';

  if (!order) {
    return <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-3xl text-sm text-gray-500">Selecione um pedido para gerenciar a logística.</div>;
  }

  const addressLabel = summarizeDeliveryAddress(order.delivery_address);
  const mapsUrl = buildMapsSearchUrl(order.delivery_address);
  const phoneHref = buildPhoneHref(order.customer_phone);
  const proofUrl = typeof order.delivery_address?.proofUrl === 'string' ? order.delivery_address.proofUrl : '';

  return (
    <div className="grid xl:grid-cols-[1.2fr_0.8fr] gap-6 max-w-6xl">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5 shadow-sm">
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
          <Tile label="Entregador" value={currentDriverLabel} icon={<UserRound className="w-4 h-4" />} />
          <Tile label="Endereço" value={addressLabel} icon={<MapPin className="w-4 h-4" />} />
        </div>

        <select value={order.status} onChange={(e) => onStatusChange(e.target.value)} className="w-full border border-gray-200 rounded px-3 py-2 text-sm">
          {deliveryStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
        </select>

        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Entregador responsável</label>
          <select value={assignedDriverId} onChange={(e) => setAssignedDriverId(e.target.value)} className="w-full border border-gray-200 rounded px-3 py-2 text-sm">
            <option value="">Selecione um entregador</option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>{driver.name} {driver.phone ? `• ${driver.phone}` : ''}</option>
            ))}
          </select>
          {!assignedDriverId && deliveryDraft.driverName && (
            <p className="mt-2 text-xs text-amber-700">Legado salvo no pedido: {deliveryDraft.driverName}</p>
          )}
        </div>

        {selectedAssignedDriver && (
          <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4 text-sm text-gray-700 space-y-1">
            <p><strong>Telefone:</strong> {selectedAssignedDriver.phone || '-'}</p>
            <p><strong>Status cadastral:</strong> {driverStatusLabel(selectedAssignedDriver.status)}</p>
            <p><strong>Documento:</strong> {selectedAssignedDriver.document || '-'}</p>
          </div>
        )}

        <Input label="Ocorrência" value={note} onChange={setNote} />
        {proofUrl && <a href={proofUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-bold text-brand-orange hover:underline"><ExternalLink className="w-4 h-4" />Abrir comprovante atual</a>}
        <button onClick={() => onSaveMeta(assignedDriverId, note)} className="bg-brand-black text-white px-4 py-2 rounded text-sm font-bold">Salvar dados logísticos</button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-black text-lg">Entregadores</h3>
            <p className="text-sm text-gray-500">Cadastre e mantenha a equipe de entrega visível no admin.</p>
          </div>
          <button onClick={onNewDriver} className="inline-flex items-center gap-2 rounded-xl bg-orange-50 px-3 py-2 text-sm font-bold text-brand-orange">
            <PlusCircle className="w-4 h-4" /> Novo
          </button>
        </div>

        <div className="space-y-2 max-h-56 overflow-auto pr-1">
          {drivers.length === 0 && <p className="text-sm text-gray-500">Nenhum entregador cadastrado ainda.</p>}
          {drivers.map((driver) => (
            <button
              key={driver.id}
              onClick={() => onSelectDriverAdmin(driver.id)}
              className={`w-full rounded-2xl border px-4 py-3 text-left transition ${selectedDriverAdminId === driver.id ? 'border-orange-200 bg-orange-50' : 'border-gray-100 bg-gray-50 hover:bg-gray-100'}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-sm text-gray-900">{driver.name}</p>
                  <p className="text-xs text-gray-500">{driver.phone || 'Sem telefone'}{driver.document ? ` • ${driver.document}` : ''}</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-gray-600 border border-gray-200">{driverStatusLabel(driver.status)}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="space-y-3 border-t border-gray-100 pt-4">
          <h4 className="text-sm font-black uppercase tracking-wider text-gray-500">{selectedDriverAdminId ? 'Editar entregador' : 'Cadastrar entregador'}</h4>
          <Input label="Nome" value={draftDriver.name} onChange={(value) => onDriverDraftChange((current) => ({ ...current, name: value }))} />
          <Input label="Telefone" value={draftDriver.phone} onChange={(value) => onDriverDraftChange((current) => ({ ...current, phone: value }))} />
          <Input label="Documento" value={draftDriver.document} onChange={(value) => onDriverDraftChange((current) => ({ ...current, document: value }))} />
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Status</label>
            <select value={draftDriver.status} onChange={(e) => onDriverDraftChange((current) => ({ ...current, status: e.target.value as AdminDriverRow['status'] }))} className="w-full border border-gray-200 rounded px-3 py-2 text-sm">
              <option value="available">Disponível</option>
              <option value="busy">Em rota</option>
              <option value="inactive">Inativo</option>
            </select>
          </div>
          <Input label="Observações" value={draftDriver.notes} onChange={(value) => onDriverDraftChange((current) => ({ ...current, notes: value }))} />
          <button onClick={onSaveDriver} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-black px-4 py-2 text-sm font-bold text-white w-full">
            <Save className="w-4 h-4" /> {selectedDriverAdminId ? 'Salvar entregador' : 'Cadastrar entregador'}
          </button>
        </div>
      </div>
    </div>
  );
}

function driverStatusLabel(status: AdminDriverRow['status']) {
  if (status === 'busy') return 'Em rota';
  if (status === 'inactive') return 'Inativo';
  return 'Disponível';
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
