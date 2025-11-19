import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jfbqlsotaizreqwvzxfu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmYnFsc290YWl6cmVxd3Z6eGZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNjIyMjIsImV4cCI6MjA3NDkzODIyMn0.nadKcSjhSvYHZiS-FLPbEt5YkV8xPBFQ80bx9WeIDZI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);