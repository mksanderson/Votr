import { inject, Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Proposal, CreateProposalRequest, VoteRequest } from '../models/proposal.model';
import { SupabaseService } from './supabase.service';
import { RealtimeChannel } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class ProposalService implements OnDestroy {
  private proposalsSubject = new BehaviorSubject<Proposal[]>([]);
  public proposals$ = this.proposalsSubject.asObservable();

  private proposalsChannel: RealtimeChannel | null = null;
  private votesChannel: RealtimeChannel | null = null;

  supabaseService = inject(SupabaseService);

  constructor() {
    this.loadProposals();
    this.subscribeToRealtimeUpdates();
  }

  private subscribeToRealtimeUpdates(): void {
    this.proposalsChannel = this.supabaseService.client
      .channel('public:proposals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proposals' }, payload => {
        console.log('Proposal change received:', payload);
        this.loadProposals();
      })
      .subscribe();

    this.votesChannel = this.supabaseService.client
      .channel('public:votes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, payload => {
        console.log('Vote change received:', payload);
        this.loadProposals();
      })
      .subscribe();
  }

  private async loadProposals(): Promise<void> {
    const { data: proposals, error } = await this.supabaseService.client
      .from('proposals')
      .select('*');

    if (error) {
      console.error('Error loading proposals:', error);
      return;
    }

    if (proposals) {
      const updatedProposals = proposals.map((p: Proposal) => this.updateProposalStatus(p as Proposal));
      this.proposalsSubject.next(updatedProposals);
    }
  }

  private updateProposalStatus(proposal: Proposal): Proposal {
    const now = new Date();
    const expiresAt = new Date(proposal.expires_at);
    const totalVotes = proposal.votes.yes + proposal.votes.no;
    
    if (now > expiresAt) {
      if (totalVotes >= proposal.minimum_votes && proposal.votes.yes > proposal.votes.no) {
        proposal.status = 'passed';
      } else {
        proposal.status = 'failed';
      }
    } else {
      proposal.status = 'active';
    }
    
    return proposal;
  }

  async createProposal(request: CreateProposalRequest, createdBy: string): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (request.duration_hours * 60 * 60 * 1000));
    
    const newProposal: Proposal = {
      id: this.generateId(),
      title: request.title,
      description: request.description,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      minimum_votes: request.minimum_votes,
      created_by: createdBy,
      votes: {
        yes: 0,
        no: 0
      },
      status: 'active'
    };

    const { error } = await this.supabaseService.client
      .from('proposals')
      .insert(newProposal);

    if (error) {
      console.error('Error creating proposal:', error);
      throw error;
    }

    this.loadProposals();
  }

  async deleteProposal(proposalId: string, userId: string): Promise<void> {
    console.log('Starting delete process for proposal:', proposalId, 'by user:', userId);
    
    // First verify the user is the creator of this proposal
    const { data: proposal, error: fetchError } = await this.supabaseService.client
      .from('proposals')
      .select('created_by')
      .eq('id', proposalId)
      .single();

    if (fetchError) {
      console.error('Error fetching proposal for deletion:', fetchError);
      throw new Error('Failed to verify proposal ownership');
    }

    if (proposal.created_by !== userId) {
      throw new Error('You can only delete proposals you created');
    }

    console.log('User verified as creator, proceeding with deletion...');

    // Delete the proposal (votes will be automatically deleted due to CASCADE constraint)
    const { error: deleteError, count } = await this.supabaseService.client
      .from('proposals')
      .delete({ count: 'exact' })
      .eq('id', proposalId);

    if (deleteError) {
      console.error('Error deleting proposal:', deleteError);
      console.error('Delete error details:', {
        message: deleteError.message,
        details: deleteError.details,
        hint: deleteError.hint,
        code: deleteError.code
      });
      throw new Error(`Failed to delete proposal: ${deleteError.message}`);
    }

    console.log('Delete operation completed. Rows affected:', count);
    
    if (count === 0) {
      console.warn('No rows were deleted. This might indicate an RLS policy issue.');
      throw new Error('Proposal was not deleted. This might be a permissions issue.');
    }

    console.log('Proposal deleted successfully, reloading proposals...');
    
    // Reload proposals to update the UI
    await this.loadProposals();
  }

  getProposal(id: string): Observable<Proposal | undefined> {
    // First check if proposal is already in cache
    const cachedProposal = this.proposalsSubject.value.find(p => p.id === id);
    if (cachedProposal) {
      return new BehaviorSubject(cachedProposal).asObservable();
    }

    // If not in cache, fetch directly from Supabase
    return new Observable(observer => {
      this.fetchProposalById(id).then(proposal => {
        observer.next(proposal);
        observer.complete();
      }).catch(error => {
        console.error('Error fetching proposal:', error);
        observer.next(undefined);
        observer.complete();
      });
    });
  }

  private async fetchProposalById(id: string): Promise<Proposal | undefined> {
    const { data: proposal, error } = await this.supabaseService.client
      .from('proposals')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching proposal by ID:', error);
      return undefined;
    }

    if (proposal) {
      return this.updateProposalStatus(proposal as Proposal);
    }

    return undefined;
  }

  async vote(voteRequest: VoteRequest): Promise<void> {
    // Check if user has already voted
    const hasVoted = await this.hasUserVoted(voteRequest.proposal_id, voteRequest.voter_id);
    if (hasVoted) {
      throw new Error('You have already voted on this proposal');
    }

    // Record the individual vote (trigger will automatically update vote counts)
    const { error: voteError } = await this.supabaseService.client
      .from('votes')
      .insert({
        proposal_id: voteRequest.proposal_id,
        voter_id: voteRequest.voter_id,
        vote: voteRequest.vote,
        created_at: new Date().toISOString()
      });

    if (voteError) {
      console.error('Error recording vote:', voteError);
      throw voteError;
    }

    // Mark vote in local storage so it persists across sessions,
    // deterring multiple votes from the same browser
    const sessionKey = `voted_${voteRequest.proposal_id}`;
    const voteChoiceKey = `vote_choice_${voteRequest.proposal_id}`;
    localStorage.setItem(sessionKey, 'true');
    localStorage.setItem(voteChoiceKey, voteRequest.vote);

    // Reload proposals to get updated vote counts
    this.loadProposals();
  }

  async hasUserVoted(proposalId: string, voterId: string): Promise<boolean> {
    // First check local storage to track votes across sessions and deter multiple votes
    const sessionKey = `voted_${proposalId}`;
    const hasVotedLocally = localStorage.getItem(sessionKey) === 'true';
    
    if (hasVotedLocally) {
      return true;
    }

    // Then check database as backup
    const { data: votes, error } = await this.supabaseService.client
      .from('votes')
      .select('id')
      .eq('proposal_id', proposalId)
      .eq('voter_id', voterId)
      .limit(1);

    if (error) {
      console.error('Error checking if user voted:', error);
      return false;
    }

    const hasVotedInDb = votes && votes.length > 0;
    
    // If they voted in DB but not marked locally, mark it in local storage
    if (hasVotedInDb) {
      localStorage.setItem(sessionKey, 'true');
    }

    return hasVotedInDb;
  }

  async getUserVote(proposalId: string, voterId: string): Promise<'yes' | 'no' | null> {
    // First check local storage to persist vote choice across sessions and discourage re-voting
    const voteChoiceKey = `vote_choice_${proposalId}`;
    const localVoteChoice = localStorage.getItem(voteChoiceKey) as 'yes' | 'no' | null;
    
    if (localVoteChoice) {
      return localVoteChoice;
    }

    // Then check database as backup
    const { data: votes, error } = await this.supabaseService.client
      .from('votes')
      .select('vote')
      .eq('proposal_id', proposalId)
      .eq('voter_id', voterId)
      .limit(1);

    if (error) {
      console.error('Error getting user vote:', error);
      return null;
    }

    const dbVoteChoice = votes && votes.length > 0 ? votes[0].vote : null;
    
    // If they voted in DB but not stored locally, store it in local storage
    if (dbVoteChoice) {
      localStorage.setItem(voteChoiceKey, dbVoteChoice);
      // Also mark that they voted
      const sessionKey = `voted_${proposalId}`;
      localStorage.setItem(sessionKey, 'true');
    }

    return dbVoteChoice;
  }

  ngOnDestroy(): void {
    // Clean up real-time subscriptions
    if (this.proposalsChannel) {
      this.supabaseService.client.removeChannel(this.proposalsChannel);
    }
    if (this.votesChannel) {
      this.supabaseService.client.removeChannel(this.votesChannel);
    }
  }

  private generateId(): string {
    // Generate a UUID v4 compatible string
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
