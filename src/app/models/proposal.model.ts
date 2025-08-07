export interface Proposal {
  id: string;
  title: string;
  description: string;
  created_at: string;
  expires_at: string;
  minimum_votes: number;
  created_by: string; // ID of the user who created the proposal
  votes: {
    yes: number;
    no: number;
  };
  status: 'active' | 'passed' | 'failed' | 'expired';
}

export interface CreateProposalRequest {
  title: string;
  description: string;
  duration_hours: number;
  minimum_votes: number;
}

export interface VoteRequest {
  proposal_id: string;
  vote: 'yes' | 'no';
  voter_id: string;
}
