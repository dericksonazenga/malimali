// The permanent super admin — cannot be deleted, edited, or demoted by anyone.
// Only this user can assign the "admin" role to others.
export const SUPER_ADMIN_EMAIL = "wandrop20@gmail.com";
export const SUPER_ADMIN_USER_ID = "a41a57cf-b03a-4e69-964f-176b8b20420f";
export const SUPER_ADMIN_DISPLAY_NAME = "Wan Drop";

export const isSuperAdmin = (userId?: string | null) => userId === SUPER_ADMIN_USER_ID;
export const isSuperAdminProfile = (displayName?: string | null) =>
  displayName?.toLowerCase() === SUPER_ADMIN_DISPLAY_NAME.toLowerCase();
export const isSuperAdminEmail = (email?: string | null) =>
  email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
