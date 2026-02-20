/**
 * Player Invitations & Players API Endpoints
 * Dixie Amateur Golf Tournament — UUID-gated customer portal feature
 */
import { apiClient } from '../client';

// ---- Types ----

export type InvitationStatus = 'pending' | 'accepted' | 'declined';
export type Division = 'mens' | 'womens' | 'senior';
export type PlayerSource = 'invitation' | 'csv_import';

export interface PlayerInvitation {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  division: Division;
  status: InvitationStatus;
  access_code: string | null;
  created_at: string;
  // Full detail fields (populated on single-record fetch)
  street_address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  zip?: string | null;
  club?: string | null;
  handicap_index?: number | null;
  birth_month?: number | null;
  birth_day?: number | null;
  birth_year?: number | null;
  shirt_size?: string | null;
  wagr?: string | null;
  wagr_url?: string | null;
  golf_resume?: string | null;
  resume_file_url?: string | null;
  agree_policy?: boolean;
}

export interface Player {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  division: Division | null;
  club: string | null;
  handicap_index: number | null;
  birth_year: number | null;
  birth_month: number | null;
  birth_day: number | null;
  shirt_size: string | null;
  wagr: string | null;
  street_address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zip: string | null;
  source: PlayerSource;
  invitation_id: string | null;
  access_code: string | null;
  created_at: string;
  updated_at: string;
}

export type PlayerUpdateFields = Partial<Pick<Player,
  'first_name' | 'last_name' | 'email' | 'phone' | 'division' | 'club' |
  'handicap_index' | 'birth_year' | 'birth_month' | 'birth_day' |
  'shirt_size' | 'wagr' | 'street_address' | 'city' | 'state' | 'country' | 'zip'
>>;

export interface PlayerImportRow {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  division?: string;
  club?: string;
  handicap_index?: number;
  birth_year?: number;
  birth_month?: number;
  birth_day?: number;
  shirt_size?: string;
  wagr?: string;
  street_address?: string;
  city?: string;
  state?: string;
  country?: string;
  zip?: string;
}

// ---- API Functions ----

export const playerInvitationsApi = {
  /** List all invitation requests for the Dixie Amateur portal */
  listInvitations: (): Promise<{ invitations: PlayerInvitation[] }> =>
    apiClient.get('/api/customers/player-invitations'),

  /** Get full detail of a single invitation (for the side drawer) */
  getInvitation: (id: string): Promise<PlayerInvitation> =>
    apiClient.get(`/api/customers/player-invitations/${id}`),

  /** Accept an invitation — generates access code and sends email */
  acceptInvitation: (id: string): Promise<{ success: boolean; access_code: string; email_sent: boolean }> =>
    apiClient.post(`/api/customers/player-invitations/${id}/accept`),

  /** Decline an invitation */
  declineInvitation: (id: string): Promise<{ success: boolean }> =>
    apiClient.post(`/api/customers/player-invitations/${id}/decline`),

  /** List all players (accepted from invitations + CSV imports) */
  listPlayers: (): Promise<{ players: Player[] }> =>
    apiClient.get('/api/customers/players'),

  /** Bulk import players from CSV (after field mapping in the UI) */
  importPlayers: (players: PlayerImportRow[]): Promise<{ success: boolean; imported: number }> =>
    apiClient.post('/api/customers/players/import', { players }),

  /** Update editable fields on a player record */
  updatePlayer: (id: string, updates: PlayerUpdateFields): Promise<Player> =>
    apiClient.patch(`/api/customers/players/${id}`, updates),
};
