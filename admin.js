
SELECT
    c.table_name,
    c.ordinal_position,
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.column_default
FROM information_schema.columns AS c
WHERE c.table_schema = 'public'
  AND c.table_name IN (
    'activity_logs',
    'business_reminders',
    'communication_logs',
    'customers',
    'enquiries',
    'expense_categories',
    'expenses',
    'invoice_items',
    'invoices',
    'message_templates',
    'notifications',
    'payments',
    'profiles',
    'project_tasks',
    'project_updates',
    'projects',
    'quotation_items',
    'quotations'
  )
ORDER BY
    c.table_name,
    c.ordinal_position;
