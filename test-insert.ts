import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vyipbnojljoitpmytzzm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5aXBibm9qbGpvaXRwbXl0enptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1ODE2MTAsImV4cCI6MjA4ODE1NzYxMH0.xkAAAAjNlr03_e57uZngw1JnuL_wXSY3Q6FnI4pROWE'; // from .env.local

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const { data, error } = await supabase.from('accounts').insert({
    name: 'Test Account',
    type: 'Conta Corrente',
    balance: 0
  }).select();

  if (error) {
    console.error('Insert Error:', error);
  } else {
    console.log('Inserted Successfully:', data);
    
    // Clean up
    if (data && data.length > 0) {
       await supabase.from('accounts').delete().eq('id', data[0].id);
    }
  }
}

testInsert();
