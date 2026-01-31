-- Allow the auth trigger to insert into public.users.
-- The trigger runs in a context where auth.uid() may not be set, so the
-- "Users can insert own profile" policy fails. This policy allows insert
-- when the row's id exists in auth.users (i.e. the user was just created).
CREATE POLICY "Allow insert user profile from auth trigger"
  ON users FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = users.id)
  );
