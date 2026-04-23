-- Update birthdays category check constraint
ALTER TABLE birthdays DROP CONSTRAINT birthdays_category_check;
ALTER TABLE birthdays ADD CONSTRAINT birthdays_category_check CHECK (category IN ('family', 'close_friend', 'friend', 'kid_friend'));
