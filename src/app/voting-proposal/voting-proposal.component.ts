import { Component, Input, OnInit, OnChanges, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Proposal } from '../models/proposal.model';
import { ProposalService } from '../services/proposal.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-voting-proposal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './voting-proposal.component.html',
  styleUrl: './voting-proposal.component.scss'
})
export class VotingProposalComponent implements OnInit, OnChanges, OnDestroy {
  @Input() proposal!: Proposal;
  @Input() showVotingButtons = false;
  @Input() voterId = '';
  @Input() isCreator = false;
  @Input() currentUserId = '';

  isVoting = false;
  isDeleting = false;
  voteMessage = '';
  copyMessage = '';
  deleteMessage = '';
  private proposalsSubscription?: Subscription;

  proposalService = inject(ProposalService);
  cd = inject(ChangeDetectorRef);

  constructor() {
    // Subscribe to real-time proposal updates
    this.proposalsSubscription = this.proposalService.proposals$.subscribe(proposals => {
      // Find updated proposal data
      if (this.proposal) {
        const updatedProposal = proposals.find(p => p.id === this.proposal.id);
        if (updatedProposal) {
          this.proposal = updatedProposal;
          this.cd.detectChanges();
        }
      }
    });
  }

  get voteLink(): string {
    return this.proposal ? `${window.location.origin}/vote/${this.proposal.id}` : '';
  }

  get totalVotes(): number {
    return this.proposal ? this.proposal.votes.yes + this.proposal.votes.no : 0;
  }

  get yesPercentage(): number {
    return this.totalVotes > 0 ? Math.round((this.proposal.votes.yes / this.totalVotes) * 100) : 0;
  }

  get noPercentage(): number {
    return this.totalVotes > 0 ? Math.round((this.proposal.votes.no / this.totalVotes) * 100) : 0;
  }

  get isExpired(): boolean {
    return this.proposal ? new Date() > new Date(this.proposal.expires_at) : false;
  }

  get statusColor(): string {
    if (!this.proposal) return 'bg-gray-100 text-gray-800';
    switch (this.proposal.status) {
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'passed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  get statusText(): string {
    if (!this.proposal) return 'No proposal available';
    switch (this.proposal.status) {
      case 'active': return `Voting is live and closes on ${new Date(this.proposal.expires_at).toLocaleString()}.`;
      case 'passed': return `Proposal passed! Voting closed on ${new Date(this.proposal.expires_at).toLocaleString()}.`;
      case 'failed': return `Proposal failed. Voting closed on ${new Date(this.proposal.expires_at).toLocaleString()}.`;
      case 'expired': return `Voting expired on ${new Date(this.proposal.expires_at).toLocaleString()}.`;
      default: return `Status: ${this.proposal.status}`;
    }
  }

  get canVote(): boolean {
    return this.showVotingButtons && 
           this.proposal &&
           this.proposal.status === 'active' && 
           !!this.voterId && 
           !this.hasUserVoted();
  }

  userHasVoted = false;
  userVote: 'yes' | 'no' | null = null;
  isLoadingVoteStatus = true;

  async ngOnInit(): Promise<void> {
    await this.loadVoteStatus();
  }

  async ngOnChanges(): Promise<void> {
    if (this.proposal && this.voterId) {
      await this.loadVoteStatus();
    }
  }

  private async loadVoteStatus(): Promise<void> {
    if (this.voterId && this.proposal) {
      try {
        this.isLoadingVoteStatus = true;
        this.userHasVoted = await this.proposalService.hasUserVoted(this.proposal.id, this.voterId);
        this.userVote = await this.proposalService.getUserVote(this.proposal.id, this.voterId);
      } catch (error) {
        console.error('Error loading vote status:', error);
      } finally {
        this.isLoadingVoteStatus = false;
      }
    } else {
      this.isLoadingVoteStatus = false;
    }
  }

  hasUserVoted(): boolean {
    return this.userHasVoted;
  }

  getUserVote(): 'yes' | 'no' | null {
    return this.userVote;
  }

  ngOnDestroy(): void {
    // Clean up subscription
    if (this.proposalsSubscription) {
      this.proposalsSubscription.unsubscribe();
    }
  }

  async vote(voteChoice: 'yes' | 'no'): Promise<void> {
    if (!this.canVote) return;

    this.isVoting = true;
    this.voteMessage = '';

    try {
      await this.proposalService.vote({
        proposal_id: this.proposal.id,
        vote: voteChoice,
        voter_id: this.voterId
      });
      this.voteMessage = `Your vote for "${voteChoice}" has been recorded!`;
      this.userHasVoted = true;
      this.userVote = voteChoice;
      
      // Store vote in local storage so it persists across browser sessions,
      // deterring multiple votes from the same device
      const sessionKey = `voted_${this.proposal.id}`;
      const voteChoiceKey = `vote_choice_${this.proposal.id}`;
      localStorage.setItem(sessionKey, 'true');
      localStorage.setItem(voteChoiceKey, voteChoice);
      
      setTimeout(() => this.voteMessage = '', 3000);
    } catch (error: unknown) {
      this.voteMessage = (error as Error).message || 'Failed to record vote. Please try again.';
      console.error('Error voting:', error);
    } finally {
      this.isVoting = false;
    }
  }

  async deleteProposal(): Promise<void> {
    if (!this.currentUserId || this.proposal.created_by !== this.currentUserId) {
      this.deleteMessage = 'You can only delete proposals you created.';
      setTimeout(() => this.deleteMessage = '', 3000);
      return;
    }

    if (!confirm('Are you sure you want to delete this proposal? This action cannot be undone.')) {
      return;
    }

    this.isDeleting = true;
    this.deleteMessage = '';

    try {
      await this.proposalService.deleteProposal(this.proposal.id, this.currentUserId);
      this.deleteMessage = 'Proposal deleted successfully!';
      setTimeout(() => this.deleteMessage = '', 3000);
    } catch (error: unknown) {
      this.deleteMessage = (error as Error).message || 'Failed to delete proposal. Please try again.';
      console.error('Error deleting proposal:', error);
      setTimeout(() => this.deleteMessage = '', 3000);
    } finally {
      this.isDeleting = false;
    }
  }

  get canDeleteProposal(): boolean {
    return !!this.currentUserId && this.proposal && this.proposal.created_by === this.currentUserId;
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.copyMessage = 'Link copied to clipboard!';
      setTimeout(() => this.copyMessage = '', 2000);
    }).catch(err => {
      this.copyMessage = 'Failed to copy link';
      console.error('Failed to copy link: ', err);
      setTimeout(() => this.copyMessage = '', 2000);
    });
  }
}
