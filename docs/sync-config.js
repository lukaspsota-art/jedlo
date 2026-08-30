// SYNCHRONIZÁCIA PC <-> MOBIL (voliteľné)
// 1) Skopíruj tento súbor a premenuj kópiu na  sync-config.js
// 2) Vyplň údaje z tvojho Supabase projektu (návod v HOSTING.md)
// Kým sync-config.js neexistuje, appka funguje normálne, len bez synchronizácie.
window.SYNC_CONFIG = {
  url: "https://sjnrnaomrbhniaizzceh.supabase.co",  // Settings -> API -> Project URL
  key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqbnJuYW9tcmJobmlhaXp6Y2VoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2MDQ2NjIsImV4cCI6MjEwMDE4MDY2Mn0.TagYutuz84R5mLiLxPh5XqZQm7mh2Jv1K5XgNptadv4",             // Settings -> API -> anon public
  id:  ""                      // spoločné heslo pre tvoje zariadenia (rovnaké na PC aj mobile)
};
