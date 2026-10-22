// Simple bit flags for roles (shared client/server)
export const PERMS = {
  VIEW_CHANNELS: 1 << 0,
  SEND_MESSAGES: 1 << 1,
  MANAGE_MESSAGES: 1 << 2,
  KICK_MEMBERS: 1 << 3,
  BAN_MEMBERS: 1 << 4,
  MANAGE_CHANNELS: 1 << 5,
  MANAGE_ROLES: 1 << 6,
  ADMINISTRATOR: 1 << 7,
} as const;

export type PermKey = keyof typeof PERMS;
