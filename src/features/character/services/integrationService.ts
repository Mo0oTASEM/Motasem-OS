import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '../../../lib/supabase/client';
import type { CharacterTaskIntegration, CharacterGoalIntegration, CharacterMemoryIntegration } from '../types';

const COLLECTION = 'character';
const DOC_ID = 'integrations';

interface IntegrationDoc {
  taskIntegrations: CharacterTaskIntegration[];
  goalIntegrations: CharacterGoalIntegration[];
  memoryIntegrations: CharacterMemoryIntegration[];
}

function getSupabase(): SupabaseClient | null {
  return getSupabaseBrowserClient();
}

export async function loadIntegrations(userId: string): Promise<IntegrationDoc> {
  const supabase = getSupabase();
  if (!supabase) {
    return { taskIntegrations: [], goalIntegrations: [], memoryIntegrations: [] };
  }

  const { data, error } = await supabase
    .from('nova_user_docs')
    .select('payload')
    .eq('user_id', userId)
    .eq('collection_name', COLLECTION)
    .eq('doc_id', DOC_ID)
    .maybeSingle();

  if (error) {
    console.error('Failed to load integrations:', error);
    return { taskIntegrations: [], goalIntegrations: [], memoryIntegrations: [] };
  }

  if (!data) {
    return { taskIntegrations: [], goalIntegrations: [], memoryIntegrations: [] };
  }

  const payload = data.payload as Record<string, unknown>;
  return {
    taskIntegrations: (payload.taskIntegrations || []) as CharacterTaskIntegration[],
    goalIntegrations: (payload.goalIntegrations || []) as CharacterGoalIntegration[],
    memoryIntegrations: (payload.memoryIntegrations || []) as CharacterMemoryIntegration[],
  };
}

export async function saveIntegrations(
  userId: string,
  integrations: IntegrationDoc,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase.from('nova_user_docs').upsert({
    user_id: userId,
    collection_name: COLLECTION,
    doc_id: DOC_ID,
    payload: integrations,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error('Failed to save integrations:', error);
    throw new Error('Failed to save integrations.');
  }
}
