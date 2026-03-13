-- Insert view_dashboard permission for admin role (admin already gets all via code, but for completeness in the permissions manager)
-- No insert needed since admin bypasses permission checks in code.
-- Just ensure the permission exists for other roles that need it.
SELECT 1;