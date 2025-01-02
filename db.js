const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hdmpatmfxugqszkkvfkw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkbXBhdG1meHVncXN6a2t2Zmt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU4MTM3MDIsImV4cCI6MjA1MTM4OTcwMn0.5tfGflm2krpZz0Zvn2hSxaQi5tY05fzbrrtIJER8znM';
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;