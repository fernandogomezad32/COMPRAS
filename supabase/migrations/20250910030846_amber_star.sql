/*
  # Remove reports table and related functionality

  1. Remove Table
    - Drop `reports` table completely
    - Remove all associated indexes, policies, and triggers
  
  2. Clean Up
    - Remove any orphaned data
    - Clean up related functions if they exist
*/

-- Drop the reports table and all its dependencies
DROP TABLE IF EXISTS reports CASCADE;

-- Drop any related functions that might exist
DROP FUNCTION IF EXISTS update_reports_updated_at() CASCADE;