-- Run this query in your Railway Database Console to check current tables

-- Show ALL current tables
SELECT 
  table_name,
  table_type,
  CASE 
    WHEN table_name LIKE '%chat%' OR 
         table_name LIKE '%message%' OR 
         table_name LIKE '%conversation%' OR 
         table_name LIKE '%typing%' THEN 'CHAT TABLE ❌'
    ELSE 'NON-CHAT ✅'
  END as table_category
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Count chat tables specifically  
SELECT 
  'CHAT TABLES COUNT' as category,
  COUNT(*) as total
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (
  table_name LIKE '%chat%' OR 
  table_name LIKE '%message%' OR 
  table_name LIKE '%conversation%' OR
  table_name LIKE '%typing%'
);

-- Total table count
SELECT 
  'TOTAL TABLES' as category,
  COUNT(*) as total
FROM information_schema.tables 
WHERE table_schema = 'public';