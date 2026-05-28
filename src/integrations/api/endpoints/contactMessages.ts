/**
 * Contact Us Messages API Endpoints
 * Dixie Amateur Golf Tournament — UUID-gated customer portal feature.
 * Lists real (non-bot) Contact Us submissions from dixieamateur.com.
 */
import { apiClient } from '../client';

// ---- Types ----

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  created_at: string;
}

// ---- API ----

export const contactMessagesApi = {
  /** List real (non-bot) Contact Us submissions, most recent first */
  listMessages: (): Promise<{ messages: ContactMessage[] }> =>
    apiClient.get('/api/customers/contact-messages'),
};
