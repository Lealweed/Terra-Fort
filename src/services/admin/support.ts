import type { AdminSupportStatus, AdminSupportTicketDraft, AdminSupportTicketRow } from '../../pages/admin/admin-types';

type SupportMetadata = Record<string, unknown>;

async function getSupabase() {
  const mod = await import('../../lib/supabase');
  return mod.supabase;
}

const validStatuses: AdminSupportStatus[] = ['new', 'bot', 'waiting_human', 'in_progress', 'resolved'];

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
