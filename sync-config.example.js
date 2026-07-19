// SYNCHRONIZÁCIA PC <-> MOBIL (voliteľné)
// 1) Skopíruj tento súbor a premenuj kópiu na  sync-config.js
// 2) Vyplň údaje z tvojho Supabase projektu (návod v HOSTING.md)
// Kým sync-config.js neexistuje, appka funguje normálne, len bez synchronizácie.
window.SYNC_CONFIG = {
  url: "https://TVOJ-PROJEKT.supabase.co",  // Settings -> API -> Project URL
  key: "TVOJ-ANON-PUBLIC-KLUC",             // Settings -> API -> anon public
  id:  "moja-domacnost"                      // spoločné heslo pre tvoje zariadenia (rovnaké na PC aj mobile)
};
