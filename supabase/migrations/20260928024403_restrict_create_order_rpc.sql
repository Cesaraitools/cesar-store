-- Order creation is exposed only through trusted server routes. The app calls
-- this RPC with the service-role client; browsers never need direct EXECUTE.
revoke execute on function public.create_order_atomic(
  uuid, jsonb, jsonb, text, text
) from public, anon, authenticated;

grant execute on function public.create_order_atomic(
  uuid, jsonb, jsonb, text, text
) to service_role;
