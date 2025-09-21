-- Fix storage policies for multi-tenant logo uploads
-- Each user should only access their own company logo

-- Drop existing storage policies
DROP POLICY IF EXISTS "Allow authenticated users to upload branding files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to branding files" ON storage.objects;

-- Create new policies that use company-specific file naming
-- Users can upload files named logo-{their_company_id}.*
CREATE POLICY "authenticated_users_upload_own_logo" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'branding' 
    AND auth.role() = 'authenticated'
    AND name ~ ('^logo-' || (
      SELECT company_id::text 
      FROM profiles 
      WHERE id = auth.uid()
    ) || '\.(png|jpg|jpeg|gif|svg)$')
  );

-- Users can update their own company logo
CREATE POLICY "authenticated_users_update_own_logo" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'branding' 
    AND auth.role() = 'authenticated'
    AND name ~ ('^logo-' || (
      SELECT company_id::text 
      FROM profiles 
      WHERE id = auth.uid()
    ) || '\.(png|jpg|jpeg|gif|svg)$')
  );

-- Users can delete their own company logo
CREATE POLICY "authenticated_users_delete_own_logo" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'branding' 
    AND auth.role() = 'authenticated'
    AND name ~ ('^logo-' || (
      SELECT company_id::text 
      FROM profiles 
      WHERE id = auth.uid()
    ) || '\.(png|jpg|jpeg|gif|svg)$')
  );

-- Public read access to all branding files (for displaying logos)
CREATE POLICY "public_read_branding_files" ON storage.objects
  FOR SELECT USING (bucket_id = 'branding');
