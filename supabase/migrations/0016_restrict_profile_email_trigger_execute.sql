-- Trigger execution does not require exposing this function as a public RPC.
REVOKE EXECUTE ON FUNCTION public.sync_profile_email_from_auth_user() FROM PUBLIC, anon, authenticated;
