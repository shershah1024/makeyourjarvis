// Google OAuth scopes configuration
// Non-sensitive scopes
export const NON_SENSITIVE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.app.created',
  'https://www.googleapis.com/auth/drive.file'
] as const;

// Sensitive scopes
export const SENSITIVE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/presentations',
  'https://www.googleapis.com/auth/presentations.readonly'
] as const;

// Gmail scopes
export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.compose'
] as const;

// Combined scopes for OAuth request
export const ALL_SCOPES = [
  ...NON_SENSITIVE_SCOPES,
  ...SENSITIVE_SCOPES,
  ...GMAIL_SCOPES
] as const;

// Type definitions
export type NonSensitiveScope = typeof NON_SENSITIVE_SCOPES[number];
export type SensitiveScope = typeof SENSITIVE_SCOPES[number];
export type GmailScope = typeof GMAIL_SCOPES[number];
export type GoogleScope = typeof ALL_SCOPES[number];

// Scope descriptions for user-facing UI
export const SCOPE_DESCRIPTIONS: Record<GoogleScope, string> = {
  'https://www.googleapis.com/auth/calendar.app.created': 'Make secondary Google calendars, and see, create, change, and delete events on them',
  'https://www.googleapis.com/auth/drive.file': 'See, edit, create, and delete only the specific Google Drive files you use with this app',
  'https://www.googleapis.com/auth/calendar.events': 'View and edit events on all your calendars',
  'https://www.googleapis.com/auth/presentations': 'See, edit, create, and delete all your Google Slides presentations',
  'https://www.googleapis.com/auth/presentations.readonly': 'See all your Google Slides presentations',
  'https://www.googleapis.com/auth/gmail.modify': 'Read, compose, and send emails from your Gmail account',
  'https://www.googleapis.com/auth/gmail.compose': 'Manage drafts and send emails'
}; 