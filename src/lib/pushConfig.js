// Web Push VAPID Configuration
// Standard RFC 8291 / RFC 8292 Application Server Keys for Web Push Notifications

export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

export const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';

export const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || 'mailto:esvnscr@gmail.com';

