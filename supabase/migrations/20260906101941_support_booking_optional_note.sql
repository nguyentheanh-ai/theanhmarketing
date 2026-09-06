-- A topic is required, but the customer may leave the optional detail blank.
-- Preserve existing notes, NOT NULL, and the 2,000-character upper bound.
begin;
alter table public.support_bookings
  drop constraint support_bookings_note_check;
alter table public.support_bookings
  add constraint support_bookings_note_check check (char_length(note) between 0 and 2000);
commit;
