import { useMemo, useState, type ReactNode } from 'react';
import { Bot, CheckCheck, ClipboardList, MessageSquareMore, Search, ShieldAlert, UserRoundCheck, Users } from 'lucide-react';
import type { AdminSupportTicketDraft, AdminSupportTicketRow, AdminSupportStatus } from './admin-types';
import { buildSupportSummary, filterSupportTickets } from '../../services/admin/support';

type BulkSupportPatch = {
  status?: AdminSupportStatus;
  assigned_to?: string;
  handoff_requested?: boolean;
};

type Props = {
  tickets: AdminSupportTicketRow[];
  selectedTicketId: string;
  search: string;
  statusFilter: string;
  draftTicket: AdminSupportTicketDraft;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onSelectTicket: (ticketId: string) => void;
  onDraftChange: (updater: (draft: AdminSupportTicketDraft) => AdminSupportTicketDraft) => void;
  onSaveTicket: () => Promise<void> | void;
  onBulkUpdateTickets: (ticketIds: string[], patch: BulkSupportPatch) => Promise<void> | void;
};

const statusLabels: Record<AdminSupportStatus, string> = {
  new: 'Novo',
  bot: 'Bot',
  waiting_human: 'Aguardando humano',
  in_progress: 'Em atendimento',
  resolved: 'Resolvido',
};

const queueStatuses: AdminSupportStatus[] = ['new', 'waiting_human', 'in_progress', 'resolved', 'bot'];

function getSlaMinutes(ticket: AdminSupportTicketRow) {
  const from = ticket.updated_at || ticket.created_at;
  const diffMs = Date.now() - new Date(from).getTime();
  return Math.max(0, Math.floor(diffMs / 60000));
}

function formatSla(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h${String(mins).padStart(2, '0')}`;
}

export default function AdminSupportPage({
  tickets,
  selectedTicketId,
  search,
  statusFilter,
  draftTicket,
  onSearchChange,
  onStatusFilterChange,
  onSelectTicket,
  onDraftChange,
  onSaveTicket,
  onBulkUpdateTickets,
}: Props) {
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);
  const [bulkAssignee, setBulkAssignee] = useState('');

  const filtered = useMemo(() => filterSupportTickets(tickets, search, statusFilter), [tickets, search, statusFilter]);
  const summary = useMemo(() => buildSupportSummary(filtered), [filtered]);
  const selectedTicket = useMemo(() => tickets.find((ticket) => ticket.id === selectedTicketId) || null, [tickets, selectedTicketId]);
  const internalNote = typeof selectedTicket?.metadata?.internal_note === 'string' ? selectedTicket.metadata.internal_note : '';

  const queueCounts = useMemo(() => {
    return queueStatuses.reduce<Record<AdminSupportStatus, number>>((acc, status) => {
      acc[status] = filtered.filter((ticket) => ticket.status === status).length;
      return acc;
    }, { new: 0, waiting_human: 0, in_progress: 0, resolved: 0, bot: 0 });
  }, [filtered]);

  const selectedInFilterCount = useMemo(() => filtered.filter((ticket) => selectedTicketIds.includes(ticket.id)).length, [filtered, selectedTicketIds]);

  const urgentCount = useMemo(() => {
    return filtered.filter((ticket) => ticket.status !== 'resolved' && getSlaMinutes(ticket) >= 30).length;
  }, [filtered]);

  const toggleSelection = (ticketId: string) => {
    setSelectedTicketIds((current) => current.includes(ticketId) ? current.filter((id) => id !== ticketId) : [...current, ticketId]);
  };

  const toggleSelectAllFiltered = () => {
    const ids = filtered.map((ticket) => ticket.id);
    if (ids.length > 0 && ids.every((id) => selectedTicketIds.includes(id))) {
      setSelectedTicketIds((current) => current.filter((id) => !ids.includes(id)));
      return;
    }
    setSelectedTicketIds((current) => Array.from(new Set([...current, ...ids])));
  };

  const runBulk = async (patch: BulkSupportPatch) => {
    if (selectedTicketIds.length === 0) return;
    await onBulkUpdateTickets(selectedTicketIds, patch);
    setSelectedTicketIds([]);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <MetricCard title="Tickets filtrados" value={String(summary.total)} icon={<ClipboardList className="w-5 h-5" />} tone="slate" />
        <MetricCard title="Aguardando humano" value={String(summary.waitingHuman)} icon={<ShieldAlert className="w-5 h-5" />} tone="orange" />
        <MetricCard title="Em atendimento" value={String(summary.inProgress)} icon={<UserRoundCheck className="w-5 h-5" />} tone="blue" />
        <MetricCard title="Pedidos de orçamento" value={String(summary.quotes)} icon={<MessageSquareMore className="w-5 h-5" />} tone="green" />
        <MetricCard title="SLA crítico (+30m)" value={String(urgentCount)} icon={<Users className="w-5 h-5" />} tone="red" />
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm min-h-[680px]">
          <p className="font-black text-gray-900">Filas</p>
          <p className="text-xs text-gray-500 mt-1">Clique para filtrar por etapa operacional.</p>
          <div className="mt-4 space-y-2">
            <QueueChip active={statusFilter === 'todos'} label="Todos" count={filtered.length} onClick={() => onStatusFilterChange('todos')} />
            {queueStatuses.map((status) => (
              <QueueChip
                key={status}
                active={statusFilter === status}
                label={statusLabels[status]}
                count={queueCounts[status]}
                onClick={() => onStatusFilterChange(status)}
              />
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex flex-col min-h-[680px]">
          <div className="p-5 border-b border-gray-100 bg-gray-50/60 space-y-3">
            <div>
              <p className="font-black text-gray-900">Tickets</p>
              <p className="text-xs text-gray-500 mt-1">Lista densa para alto volume com foco em triagem.</p>
            </div>
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder="Buscar por cliente, contato ou mensagem" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-orange" />
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <label className="inline-flex items-center gap-2 font-semibold cursor-pointer">
                <input type="checkbox" checked={filtered.length > 0 && filtered.every((t) => selectedTicketIds.includes(t.id))} onChange={toggleSelectAllFiltered} className="h-4 w-4 rounded border-gray-300 text-brand-orange focus:ring-brand-orange" />
                Selecionar todos filtrados
              </label>
              <span>{selectedInFilterCount} selecionados</span>
            </div>
          </div>

          <div className="flex-1 overflow-auto divide-y divide-gray-100">
            {filtered.map((ticket) => {
              const slaMinutes = getSlaMinutes(ticket);
              const isCritical = ticket.status !== 'resolved' && slaMinutes >= 30;
              return (
                <div key={ticket.id} className={`p-3 transition-colors ${selectedTicketId === ticket.id ? 'bg-orange-50' : 'hover:bg-gray-50'}`}>
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={selectedTicketIds.includes(ticket.id)}
                      onChange={() => toggleSelection(ticket.id)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-orange focus:ring-brand-orange"
                    />
                    <button onClick={() => onSelectTicket(ticket.id)} className="flex-1 text-left">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-sm text-gray-900">{ticket.customer_name || 'Lead do site'}</p>
                          <p className="text-xs text-gray-500 mt-1">{ticket.customer_phone || ticket.customer_email || '-'} • {new Date(ticket.updated_at).toLocaleString('pt-BR')}</p>
                          <p className="text-xs text-gray-500 mt-2 line-clamp-2">{ticket.last_message || 'Sem mensagem registrada.'}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <StatusBadge status={ticket.status} />
                          <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${isCritical ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                            SLA {formatSla(slaMinutes)}
                          </span>
                          {ticket.handoff_requested && <span className="rounded-full bg-red-100 px-3 py-1 text-[11px] font-bold text-red-700">Handoff</span>}
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && <div className="p-6 text-sm text-gray-500">Nenhum ticket encontrado.</div>}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-gray-500">Ações em lote</p>
                <p className="text-sm text-gray-600 mt-1">Padronize filas em massa para reduzir tempo operacional.</p>
              </div>
              <span className="text-xs font-bold text-gray-500">{selectedTicketIds.length} selecionados</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <button disabled={selectedTicketIds.length === 0} onClick={() => void runBulk({ status: 'in_progress', handoff_requested: false })} className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 disabled:opacity-50">
                Assumir selecionados
              </button>
              <button disabled={selectedTicketIds.length === 0} onClick={() => void runBulk({ status: 'waiting_human', handoff_requested: true })} className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-bold text-orange-700 disabled:opacity-50">
                Marcar aguardando humano
              </button>
              <button disabled={selectedTicketIds.length === 0} onClick={() => void runBulk({ status: 'resolved', handoff_requested: false, assigned_to: '' })} className="rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm font-bold text-green-700 disabled:opacity-50">
                Resolver selecionados
              </button>
              <div className="flex gap-2">
                <input value={bulkAssignee} onChange={(e) => setBulkAssignee(e.target.value)} placeholder="atendente@email.com" className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-orange" />
                <button disabled={selectedTicketIds.length === 0 || !bulkAssignee.trim()} onClick={() => void runBulk({ assigned_to: bulkAssignee.trim(), status: 'in_progress', handoff_requested: false })} className="rounded-xl bg-brand-black px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                  Atribuir
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-gray-500">Gestão do atendimento</p>
                <h3 className="text-2xl font-black text-gray-900 mt-1">{selectedTicket?.customer_name || 'Selecione um ticket'}</h3>
                <p className="text-sm text-gray-500 mt-2">Assuma, encaminhe e resolva o atendimento sem depender do WhatsApp.</p>
              </div>
              {selectedTicket && <StatusBadge status={selectedTicket.status} />}
            </div>

            {!selectedTicket ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/70 p-6 text-sm text-gray-600">
                Selecione um ticket para ver contexto, status atual e responsável pelo atendimento.
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <InfoTile label="Origem" value={selectedTicket.source} />
                  <InfoTile label="Intenção" value={selectedTicket.intent} />
                  <InfoTile label="Contato" value={selectedTicket.customer_phone || selectedTicket.customer_email || '-'} />
                  <InfoTile label="Responsável" value={selectedTicket.assigned_to || 'Não atribuído'} highlight={selectedTicket.status === 'in_progress'} />
                </div>

                <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4 space-y-3">
                  <p className="text-xs font-black uppercase tracking-wider text-gray-500">Última mensagem do cliente</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedTicket.last_message || 'Sem mensagem registrada.'}</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Status</label>
                    <select value={draftTicket.status} onChange={(e) => onDraftChange((draft) => ({ ...draft, status: e.target.value as AdminSupportStatus }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-orange">
                      <option value="new">Novo</option>
                      <option value="bot">Bot</option>
                      <option value="waiting_human">Aguardando humano</option>
                      <option value="in_progress">Em atendimento</option>
                      <option value="resolved">Resolvido</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Responsável humano</label>
                    <input value={draftTicket.assigned_to} onChange={(e) => onDraftChange((draft) => ({ ...draft, assigned_to: e.target.value }))} placeholder="email do atendente / responsável" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-orange" />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">
                    <input type="checkbox" checked={draftTicket.handoff_requested} onChange={(e) => onDraftChange((draft) => ({ ...draft, handoff_requested: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-brand-orange focus:ring-brand-orange" />
                    Solicitação de handoff humano ativa
                  </label>
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                    <p className="font-bold text-gray-800">Nota atual</p>
                    <p className="mt-1 line-clamp-2">{internalNote || 'Nenhuma anotação interna salva.'}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Anotação interna</label>
                  <textarea value={draftTicket.internal_note} onChange={(e) => onDraftChange((draft) => ({ ...draft, internal_note: e.target.value }))} rows={4} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-orange" placeholder="Resumo do atendimento, próximos passos, contexto interno..." />
                </div>

                <button onClick={() => void onSaveTicket()} className="inline-flex items-center gap-2 rounded-xl bg-brand-black px-5 py-3 text-sm font-bold text-white hover:bg-gray-800 transition-colors">
                  <Bot className="w-4 h-4" /> Salvar atendimento
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, tone }: { title: string; value: string; icon: ReactNode; tone: 'slate' | 'orange' | 'blue' | 'green' | 'red' }) {
  const tones = {
    slate: 'bg-white text-gray-800 border-gray-100',
    orange: 'bg-orange-50 text-orange-700 border-orange-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    red: 'bg-red-50 text-red-700 border-red-100',
  } as const;

  return (
    <div className={`rounded-2xl border p-5 ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-black mt-2">{value}</p>
        </div>
        <div>{icon}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: AdminSupportStatus }) {
  const tones = {
    new: 'bg-slate-100 text-slate-700',
    bot: 'bg-purple-100 text-purple-700',
    waiting_human: 'bg-orange-100 text-orange-700',
    in_progress: 'bg-blue-100 text-blue-700',
    resolved: 'bg-green-100 text-green-700',
  } as const;

  return <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${tones[status]}`}>{statusLabels[status]}</span>;
}

function InfoTile({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${highlight ? 'border-blue-100 bg-blue-50' : 'border-gray-100 bg-gray-50/70'}`}>
      <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">{label}</p>
      <p className="text-sm font-bold text-gray-900 mt-1">{value || '-'}</p>
    </div>
  );
}

function QueueChip({ active, label, count, onClick }: { active: boolean; label: string; count: number; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center justify-between rounded-xl border px-3 py-2 text-sm font-bold transition ${active ? 'border-brand-orange bg-orange-50 text-orange-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}>
      <span>{label}</span>
      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{count}</span>
    </button>
  );
}
