import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const storage = {
  sessionStore: null, // Not needed with Supabase Auth

  async createUser(userData: any) {
    const { data, error } = await supabase
      .from('profile')
      .insert({
        email: userData.email,
        username: userData.username,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getUser(id: string) {
    const { data, error } = await supabase
      .from('profile')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data;
  },

  async getUserByUsernameOrEmail(usernameOrEmail: string) {
    const { data, error } = await supabase
      .from('profile')
      .select('*')
      .or(`username.eq.${usernameOrEmail},email.eq.${usernameOrEmail}`)
      .single();

    if (error) return null;
    return data;
  },

  async getUserByEmail(email: string) {
    const { data, error } = await supabase
      .from('profile')
      .select('*')
      .eq('email', email)
      .single();

    if (error) return null;
    return data;
  },
};
