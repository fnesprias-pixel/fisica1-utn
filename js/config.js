// Credenciales de Supabase — no compartir públicamente
const SUPABASE_URL = 'https://mtsqqxjefcxiifundphf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10c3FxeGplZmN4aWlmdW5kcGhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNzE1NDYsImV4cCI6MjA5MjY0NzU0Nn0.3lJDxU5RnWuqv0dxBbn5tFv5Ghg5hyzMbl0YbG4rAJA';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
