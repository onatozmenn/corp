import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://lcedyozohlcubgeiokjf.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjZWR5b3pvaGxjdWJnZWlva2pmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1ODY4NzYsImV4cCI6MjA2NzE2Mjg3Nn0.58cniOlnLXirBnfwB0eSYVM8YWlAcgYQ95v8K98zFXc"

export const supabase = createClient(supabaseUrl, supabaseAnonKey) 