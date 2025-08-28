// Email configuration for Community Observer forms
export const emailConfig = {
  // All form recipients (both contact and submission forms)
  recipients: [
    'info@thecommunityobserver.com',
    'jjoseph@cbaol.com',
  ],
  
  // General info email (for display purposes)
  general: 'info@thecommunityobserver.com',
  
  // Reply-to email for automated responses
  noreply: 'noreply@mail.thecommunityobserver.com'
};

// Helper function to get recipients (same for all form types)
export function getRecipients(formType) {
  return emailConfig.recipients;
}
