import { inject, Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Proposal, CreateProposalRequest, VoteRequest } from '../models/proposal.model';
import { PocketbaseService } from './pocketbase.service';

@Injectable({
  providedIn: 'root'
})
export class ProposalService implements OnDestroy {
  private proposalsSubject = new BehaviorSubject<Proposal[]>([]);
  public proposals$ = this.proposalsSubject.asObservable();

  private proposalsUnsubscribe: (() => void) | null = null;
  private votesUnsubscribe: (() => void) | null = null;

  pocketbaseService = inject(PocketbaseService);

  constructor() {
    this.loadProposals();
    this.subscribeToRealtimeUpdates();
  }

  private async subscribeToRealtimeUpdates(): Promise<void> {
    try {
      this.proposalsUnsubscribe = await this.pocketbaseService.client
        .collection('proposals')
        .subscribe('*', () => {
          console.log('Proposal change received');
          this.loadProposals();
        });

      this.votesUnsubscribe = await this.pocketbaseService.client
        .collection('votes')
        .subscribe('*', () => {
          console.log('Vote change received');
          this.loadProposals();
        });
    } catch (err) {
      console.error('Error subscribing to realtime updates:', err);
    }
  }

  private async loadProposals(): Promise<void> {
    try {
      const proposals = await this.pocketbaseService.client
        .collection('proposals')
        .getFullList<Proposal>();

      const updatedProposals = proposals.map((p: Proposal) => this.updateProposalStatus(p));
      this.proposalsSubject.next(updatedProposals);
    } catch (error) {
      console.error('Error loading proposals:', error);
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

    try {
      await this.pocketbaseService.client.collection('proposals').create(newProposal);
      this.loadProposals();
    } catch (error) {
      console.error('Error creating proposal:', error);
      throw error;
    }
  }

  async deleteProposal(proposalId: string, userId: string): Promise<void> {
    try {
      const proposal = await this.pocketbaseService.client.collection('proposals').getOne<Proposal>(proposalId);

      if (proposal.created_by !== userId) {
        throw new Error('You can only delete proposals you created');
      }

      await this.pocketbaseService.client.collection('proposals').delete(proposalId);
      await this.loadProposals();
    } catch (err: unknown) {
      console.error('Error deleting proposal:', err);
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to delete proposal: ${message}`);
    }
  }

  getProposal(id: string): Observable<Proposal | undefined> {
    const cachedProposal = this.proposalsSubject.value.find(p => p.id === id);
    if (cachedProposal) {
      return new BehaviorSubject(cachedProposal).asObservable();
    }

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
    try {
      const proposal = await this.pocketbaseService.client.collection('proposals').getOne<Proposal>(id);
      return this.updateProposalStatus(proposal);
    } catch (error) {
      console.error('Error fetching proposal by ID:', error);
      return undefined;
    }
  }

  async vote(voteRequest: VoteRequest): Promise<void> {
    const hasVoted = await this.hasUserVoted(voteRequest.proposal_id, voteRequest.voter_id);
    if (hasVoted) {
      throw new Error('You have already voted on this proposal');
    }

    try {
      await this.pocketbaseService.client.collection('votes').create({
        proposal_id: voteRequest.proposal_id,
        voter_id: voteRequest.voter_id,
        vote: voteRequest.vote,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error recording vote:', error);
      throw error;
    }

    const sessionKey = `voted_${voteRequest.proposal_id}`;
    const voteChoiceKey = `vote_choice_${voteRequest.proposal_id}`;
    localStorage.setItem(sessionKey, 'true');
    localStorage.setItem(voteChoiceKey, voteRequest.vote);

    this.loadProposals();
  }

  async hasUserVoted(proposalId: string, voterId: string): Promise<boolean> {
    const sessionKey = `voted_${proposalId}`;
    const hasVotedLocally = localStorage.getItem(sessionKey) === 'true';

    if (hasVotedLocally) {
      return true;
    }

    try {
      const result = await this.pocketbaseService.client.collection('votes').getList(1, 1, {
        filter: `proposal_id="${proposalId}" && voter_id="${voterId}"`
      });
      const hasVotedInDb = result.items.length > 0;
      if (hasVotedInDb) {
        localStorage.setItem(sessionKey, 'true');
      }
      return hasVotedInDb;
    } catch (error) {
      console.error('Error checking if user voted:', error);
      return false;
    }
  }

  async getUserVote(proposalId: string, voterId: string): Promise<'yes' | 'no' | null> {
    const voteChoiceKey = `vote_choice_${proposalId}`;
    const localVoteChoice = localStorage.getItem(voteChoiceKey) as 'yes' | 'no' | null;

    if (localVoteChoice) {
      return localVoteChoice;
    }

    try {
      const result = await this.pocketbaseService.client.collection('votes').getList(1, 1, {
        filter: `proposal_id="${proposalId}" && voter_id="${voterId}"`
      });
      const dbVoteChoice = result.items.length > 0 ? result.items[0]['vote'] : null;
      if (dbVoteChoice) {
        localStorage.setItem(voteChoiceKey, dbVoteChoice);
        const sessionKey = `voted_${proposalId}`;
        localStorage.setItem(sessionKey, 'true');
      }
      return dbVoteChoice;
    } catch (error) {
      console.error('Error getting user vote:', error);
      return null;
    }
  }

  ngOnDestroy(): void {
    if (this.proposalsUnsubscribe) {
      this.proposalsUnsubscribe();
    }
    if (this.votesUnsubscribe) {
      this.votesUnsubscribe();
    }
  }

  private generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
