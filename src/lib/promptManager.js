import { supabase } from './supabase.js';
import { REPORTER_PERSONAS } from './reporterPersonas.js';

/**
 * Returns the effective prompt guidelines for a given reporter persona,
 * checking Supabase for custom Commissioner overrides and falling back to default guidelines.
 */
export async function getEffectiveReporterPrompt(reporterId) {
  const defaultPersona = REPORTER_PERSONAS[reporterId] || REPORTER_PERSONAS.commissioner;
  const defaultPrompt = defaultPersona?.promptGuidelines || '';

  try {
    const { data, error } = await supabase
      .from('reporter_prompts')
      .select('prompt_guidelines, updated_at, updated_by')
      .eq('reporter_id', reporterId)
      .single();

    if (!error && data?.prompt_guidelines && data.prompt_guidelines.trim()) {
      return {
        prompt: data.prompt_guidelines.trim(),
        isCustom: true,
        updatedAt: data.updated_at,
        updatedBy: data.updated_by || 'Commissioner'
      };
    }
  } catch (err) {
    console.warn(`Could not load custom prompt for ${reporterId} from database:`, err.message);
  }

  return {
    prompt: defaultPrompt,
    isCustom: false,
    updatedAt: null,
    updatedBy: null
  };
}

/**
 * Returns all reporter personas with their current effective prompt guidelines and customization status.
 */
export async function getAllReporterPrompts() {
  // 1. Fetch any overrides from Supabase
  let overridesMap = {};
  try {
    const { data, error } = await supabase
      .from('reporter_prompts')
      .select('*');

    if (!error && data) {
      data.forEach(row => {
        overridesMap[row.reporter_id] = row;
      });
    }
  } catch (err) {
    console.warn('Could not load reporter prompts list from database:', err.message);
  }

  // 2. Merge with REPORTER_PERSONAS
  const result = {};
  for (const [id, persona] of Object.entries(REPORTER_PERSONAS)) {
    const override = overridesMap[id];
    result[id] = {
      id,
      name: persona.name,
      desk: persona.desk,
      category: persona.category,
      avatar: persona.avatar,
      tagline: persona.tagline,
      bio: persona.bio,
      defaultPrompt: persona.promptGuidelines || '',
      effectivePrompt: (override?.prompt_guidelines && override.prompt_guidelines.trim()) ? override.prompt_guidelines.trim() : (persona.promptGuidelines || ''),
      isCustom: Boolean(override?.prompt_guidelines && override.prompt_guidelines.trim()),
      updatedAt: override?.updated_at || null,
      updatedBy: override?.updated_by || null
    };
  }

  return result;
}

/**
 * Saves a customized prompt guideline for a reporter persona in Supabase.
 */
export async function saveReporterPrompt(reporterId, promptGuidelines, updatedBy = 'Commissioner') {
  if (!reporterId || !promptGuidelines || !promptGuidelines.trim()) {
    throw new Error('Missing reporter_id or prompt_guidelines.');
  }

  const { data, error } = await supabase
    .from('reporter_prompts')
    .upsert({
      reporter_id: reporterId,
      prompt_guidelines: promptGuidelines.trim(),
      updated_at: new Date().toISOString(),
      updated_by: updatedBy
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Resets a reporter prompt back to its default factory guidelines by deleting the row from Supabase.
 */
export async function resetReporterPrompt(reporterId) {
  if (!reporterId) throw new Error('Missing reporter_id.');

  const { error } = await supabase
    .from('reporter_prompts')
    .delete()
    .eq('reporter_id', reporterId);

  if (error) throw error;
  return true;
}
