-- Add tournament_year to both Dixie Amateur tables.
-- New rows default to the current calendar year; existing rows are backfilled to 2026.

ALTER TABLE player_invitations
  ADD COLUMN tournament_year integer NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::int;

ALTER TABLE players
  ADD COLUMN tournament_year integer NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::int;

-- One-time backfill of existing rows to 2026 (the current tournament year at the
-- time this column was introduced).
UPDATE player_invitations SET tournament_year = 2026;
UPDATE players SET tournament_year = 2026;

-- Indexes to keep the year filter cheap as data accumulates.
CREATE INDEX IF NOT EXISTS idx_player_invitations_tournament_year
  ON player_invitations(tournament_year);

CREATE INDEX IF NOT EXISTS idx_players_tournament_year
  ON players(tournament_year);
