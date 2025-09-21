-- Fix companies table RLS policies
-- The user should be able to read their own company data

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Allow all operations on companies" ON companies;
DROP POLICY IF EXISTS "Users can create company" ON companies;

-- Create proper RLS policies for companies
CREATE POLICY "authenticated_users_own_companies_select" ON companies
  FOR SELECT USING (
    id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "authenticated_users_own_companies_insert" ON companies
  FOR INSERT WITH CHECK (true);

CREATE POLICY "authenticated_users_own_companies_update" ON companies
  FOR UPDATE USING (
    id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "authenticated_users_own_companies_delete" ON companies
  FOR DELETE USING (
    id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );
