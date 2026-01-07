// Re-export types and hook from NotificationsContext
// This ensures all components use the same shared state through the context

export type { NotificationType, Notification } from "@/contexts/NotificationsContext";
export { useNotifications } from "@/contexts/NotificationsContext";
