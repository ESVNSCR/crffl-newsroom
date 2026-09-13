// Web Push VAPID Configuration
// Standard RFC 8291 / RFC 8292 Application Server Keys for Web Push Notifications

export const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BHDHXZ3FrC6FtJi2LqjbMIKRI8Vew0X04vWWUvtvB0y5bsg-S3m3XYbCRB7b9LOdBwQxS_1uJ2jWIplbKVG8E-Y';

export const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ||
  'jkdTH1VEM-EEiZBe2RUvZvmdzlvhaNiZS9TQxjFnDyI';

export const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || 'mailto:esvnscr@gmail.com';
