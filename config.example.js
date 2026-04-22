// Example runtime config for FoldNote.
// For GitHub Pages/static hosting, put these values in config.js.
// Only use Supabase anon public keys here. Never expose a service role key.
window.FOLDNOTE_SUPABASE = {
  url: "https://YOUR_PROJECT_ID.supabase.co",
  anonKey: "YOUR_SUPABASE_ANON_KEY"
};

// Optional: leave empty unless you later add a serverless AI endpoint.
window.FOLDNOTE_AI = {
  endpoint: "",
  token: "",
  model: ""
};
