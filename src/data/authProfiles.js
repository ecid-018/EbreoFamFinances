// The pre-login "who's using this" picker needs to know the two household
// members' names/emails before any authentication exists, so this can't be
// fetched from Supabase (RLS blocks all reads until signed in). Emails come
// from env vars rather than being hardcoded so they don't sit in this
// public repo's git history — see .env.example.
export const AUTH_PROFILES = [
  { key: 'daddy', displayName: 'Daddy Cid', email: import.meta.env.VITE_DADDY_EMAIL },
  { key: 'mommy', displayName: 'Mommy Chelle', email: import.meta.env.VITE_MOMMY_EMAIL },
];
