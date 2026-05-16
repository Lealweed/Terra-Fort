import type { AdminDriverDraft, AdminDriverRow, AdminDriverStatus } from '../../pages/admin/admin-types';

async function getSupabase() {
  const mod = await import('../../lib/supabase');
  return mod.supabase;
}

const validStatuses: AdminDriverStatus[] = ['available', 'busy', 'inactive'];

export function toDriverDraft(driver?: AdminDriverRow | null): AdminDriverDraft {
  return {
    name: driver?.name || '',
    phone: driver?.phone || '',
    document: driver?.document || '',
    status: validStatuses.includes(driver?.status as AdminDriverStatus) ? (driver?.status as AdminDriverStatus) : 'available',
    notes: driver?.notes || '',
  };
}

export function validateDriverDraft(draft: AdminDriverDraft) {
  if (!draft.name.trim()) return 'Informe o nome do entregador.';
  if (!draft.phone.trim()) return 'Informe o telefone do entregador.';
  return null;
}

export function buildDriverPayload(draft: AdminDriverDraft) {
  return {
    name: draft.name.trim(),
    phone: draft.phone.trim(),
    document: draft.document.trim() || null,
    status: validStatuses.includes(draft.status) ? draft.status : 'available',
    notes: draft.notes.trim() || null,
  };
}

export async function listDrivers(): Promise<AdminDriverRow[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('delivery_drivers')
    .select('id,name,phone,document,status,notes,created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as AdminDriverRow[];
}

export async function createDriver(draft: AdminDriverDraft): Promise<AdminDriverRow> {
  const validationError = validateDriverDraft(draft);
  if (validationError) throw new Error(validationError);

  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('delivery_drivers')
    .insert(buildDriverPayload(draft))
    .select('id,name,phone,document,status,notes,created_at')
    .single();

  if (error) throw error;
  return data as AdminDriverRow;
}

export async function updateDriver(id: string, draft: AdminDriverDraft) {
  const validationError = validateDriverDraft(draft);
  if (validationError) throw new Error(validationError);

  const supabase = await getSupabase();
  const { error } = await supabase
    .from('delivery_drivers')
    .update(buildDriverPayload(draft))
    .eq('id', id);

  if (error) throw error;
}
