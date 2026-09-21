-- Security-definer RPCs require a signed-in user; PostgreSQL grants EXECUTE
-- to PUBLIC by default unless explicitly revoked.
revoke execute on function
  public.request_specialty_training(text,text),
  public.review_specialty_training(uuid,text),
  public.admin_set_specialty(uuid,text,boolean),
  public.create_support_ticket(text,text,text),
  public.comment_support_ticket(uuid,text),
  public.update_support_ticket_status(uuid,text)
from public, anon;

grant execute on function
  public.request_specialty_training(text,text),
  public.review_specialty_training(uuid,text),
  public.admin_set_specialty(uuid,text,boolean),
  public.create_support_ticket(text,text,text),
  public.comment_support_ticket(uuid,text),
  public.update_support_ticket_status(uuid,text)
to authenticated;
