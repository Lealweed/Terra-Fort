import type { AdminSupportStatus, AdminSupportTicketDraft, AdminSupportTicketRow } from '../../pages/admin/admin-types';

type SupportMetadata = Record<string, unknown>;

export type AdminSupportTicketCreateDraft = {
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  source: string;
  intent: string;
  last_message: string;
  handoff_requested: boolean;
};

async function getSupabase() {
  const mod = await import('../../lib/supabase');
  return mod.supabase;
}

const validStatuses: AdminSupportStatus[] = ['new', 'bot', 'waiting_human', 'in_progress', 'resolved'];

// Produção: tickets de atendimento não devem ser deletados fisicamente.
// Política: usar arquivamento lógico (resolved + metadados) para manter histórico e auditoria.

export function normalizeSupportStatus(status?: string | null): AdminSupportStatus {
  return validStatuses.includes(status as AdminSupportStatus) ? (status as AdminSupportStatus) : 'new';
}

export function filterSupportTickets(tickets: AdminSupportTicketRow[], query: string, statusFilter: string) {
  const term = query.trim().toLowerCase();
  return tickets.filter((ticket) => {
    const matchesStatus = statusFilter === 'todos' || ticket.status === statusFilter;
    if (!matchesStatus) return false;
    if (!term) return true;

    const haystack = [
      ticket.customer_name,
      ticket.customer_phone,
      ticket.customer_email,
      ticket.last_message,
      ticket.source,
      ticket.intent,
      ticket.assigned_to,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(term);
  });
}

export function buildSupportSummary(tickets: AdminSupportTicketRow[]) {
  return {
    total: tickets.length,
    waitingHuman: tickets.filter((ticket) => ticket.status === 'waiting_human').length,
    inProgress: tickets.filter((ticket) => ticket.status === 'in_progress').length,
    quotes: tickets.filter((ticket) => ticket.intent === 'quote_request').length,
  };
}

export function toSupportTicketDraft(ticket?: AdminSupportTicketRow | null): AdminSupportTicketDraft {
  const internalNote = typeof ticket?.metadata?.internal_note === 'string' ? ticket.metadata.internal_note : '';

  return {
    status: normalizeSupportStatus(ticket?.status),
    assigned_to: ticket?.assigned_to || '',
    handoff_requested: !!ticket?.handoff_requested,
    internal_note: internalNote,
  };
}

export function validateSupportTicketDraft(draft: AdminSupportTicketDraft) {
  if (!validStatuses.includes(draft.status)) return 'Status do atendimento é inválido.';
  if (draft.status === 'in_progress' && !draft.assigned_to.trim()) return 'Informe quem assumiu o atendimento humano.';
  return null;
}

export function buildSupportTicketPayload(draft: AdminSupportTicketDraft) {
  return {
    status: normalizeSupportStatus(draft.status),
    assigned_to: draft.assigned_to.trim() || null,
    handoff_requested: !!draft.handoff_requested,
    internal_note: draft.internal_note.trim(),
  };
}

export function buildCreateSupportTicketPayload(draft: AdminSupportTicketCreateDraft) {
  const customerName = draft.customer_name.trim();
  const customerPhone = draft.customer_phone.trim();
  const customerEmail = draft.customer_email.trim();
  const source = draft.source.trim() || 'admin_manual';
  const intent = draft.intent.trim() || 'manual_followup';
  const lastMessage = draft.last_message.trim() || 'Ticket criado manualmente pelo admin.';

  if (!customerName) throw new Error('Nome do cliente é obrigatório para abrir ticket manual.');
  if (!customerPhone && !customerEmail) throw new Error('Informe telefone ou e-mail para abrir ticket manual.');

  return {
    customer_name: customerName,
    customer_phone: customerPhone || null,
    customer_email: customerEmail || null,
    source,
    intent,
    status: 'new' as AdminSupportStatus,
    handoff_requested: !!draft.handoff_requested,
    assigned_to: null,
    last_message: lastMessage,
    metadata: {
      created_by: 'admin_panel',
      created_manually: true,
    },
  };
}

export function buildSupportTicketMetadata(currentMetadata: SupportMetadata | null | undefined, payload: ReturnType<typeof buildSupportTicketPayload>, now = new Date().toISOString()) {
  const baseMetadata = (currentMetadata && typeof currentMetadata === 'object') ? currentMetadata : {};
  const existingInternalNote = typeof baseMetadata.internal_note === 'string' ? baseMetadata.internal_note : null;
  const existingUpdatedAt = typeof baseMetadata.internal_note_updated_at === 'string' ? baseMetadata.internal_note_updated_at : null;
  const nextInternalNote = payload.internal_note || existingInternalNote || null;

  return {
    ...baseMetadata,
    internal_note: nextInternalNote,
    internal_note_updated_at: payload.internal_note ? now : existingUpdatedAt,
  };
}

export async function listSupportTickets(): Promise<AdminSupportTicketRow[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('support_tickets')
    .select('id,customer_name,customer_phone,customer_email,source,intent,status,handoff_requested,assigned_to,last_message,metadata,context,created_at,updated_at')
    .order('updated_at', { ascending: false })
    .limit(300);

  if (error) throw new Error(error.message);
  return ((data || []) as AdminSupportTicketRow[]).map((ticket) => ({
    ...ticket,
    status: normalizeSupportStatus(ticket.status),
    handoff_requested: !!ticket.handoff_requested,
  }));
}

export async function updateSupportTicket(id: string, draft: AdminSupportTicketDraft) {
  const validationError = validateSupportTicketDraft(draft);
  if (validationError) throw new Error(validationError);

  const supabase = await getSupabase();
  const payload = buildSupportTicketPayload(draft);
  const { data: current, error: currentError } = await supabase
    .from('support_tickets')
    .select('metadata')
    .eq('id', id)
    .single();

  if (currentError) throw new Error(currentError.message);

  const nextMetadata = buildSupportTicketMetadata(current?.metadata as SupportMetadata | null | undefined, payload);

  const { error } = await supabase
    .from('support_tickets')
    .update({
      status: payload.status,
      assigned_to: payload.assigned_to,
      handoff_requested: payload.handoff_requested,
      metadata: nextMetadata,
    })
    .eq('id', id);

  if (error) throw new Error(error.message);
}

export async function createSupportTicket(draft: AdminSupportTicketCreateDraft): Promise<AdminSupportTicketRow> {
  const supabase = await getSupabase();
  const payload = buildCreateSupportTicketPayload(draft);

  const { data, error } = await supabase
    .from('support_tickets')
    .insert(payload)
    .select('id,customer_name,customer_phone,customer_email,source,intent,status,handoff_requested,assigned_to,last_message,metadata,context,created_at,updated_at')
    .single();

  if (error) throw new Error(error.message);

  return {
    ...(data as AdminSupportTicketRow),
    status: normalizeSupportStatus((data as AdminSupportTicketRow).status),
    handoff_requested: !!(data as AdminSupportTicketRow).handoff_requested,
  };
}

export async function archiveSupportTicket(id: string, reason = '') {
  const supabase = await getSupabase();
  const archiveReason = reason.trim();

  const { data: current, error: currentError } = await supabase
    .from('support_tickets')
    .select('metadata')
    .eq('id', id)
    .single();

  if (currentError) throw new Error(currentError.message);

  const baseMetadata = (current?.metadata && typeof current.metadata === 'object') ? (current.metadata as SupportMetadata) : {};
  const nextMetadata = {
    ...baseMetadata,
    archived: true,
    archived_at: new Date().toISOString(),
    archived_reason: archiveReason || 'Arquivado manualmente no painel admin.',
  };

  const { error } = await supabase
    .from('support_tickets')
    .update({
      status: 'resolved',
      handoff_requested: false,
      assigned_to: null,
      metadata: nextMetadata,
    })
    .eq('id', id);

  if (error) throw new Error(error.message);
}
