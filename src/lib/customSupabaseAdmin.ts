import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://jfbqlsotaizreqwvzxfu.supabase.co";
const supabaseServiceRoleKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmYnFsc290YWl6cmVxd3Z6eGZ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM2MjIyMiwiZXhwIjoyMDc0OTM4MjIyfQ.6Hdyy4nEMOvI7NidsqvyclkWdKUhtjJwjAjO9CO38wo";

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
