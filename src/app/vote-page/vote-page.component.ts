import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ProposalService } from '../services/proposal.service';
import { UserService } from '../services/user.service';
import { VotingProposalComponent } from '../voting-proposal/voting-proposal.component';
import { Proposal } from '../models/proposal.model';
import { Observable, of, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-vote-page',
  standalone: true,
  imports: [CommonModule, VotingProposalComponent],
  templateUrl: './vote-page.component.html',
  styleUrl: './vote-page.component.scss'
})
export class VotePageComponent implements OnInit, OnDestroy {
  proposal$: Observable<Proposal | undefined> = of(undefined);
  voterId: string = '';
  loading = true;
  error = '';
  private proposalId: string = '';
  private proposalsSubscription?: Subscription;
  public currentProposal?: Proposal;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private proposalService: ProposalService,
    private userService: UserService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Generate a unique voter ID for this voting session
    this.voterId = this.generateVoterIdForVotingLink();
    
    this.proposal$ = this.route.params.pipe(
      switchMap(params => {
        const proposalId = params['id'];
        if (!proposalId) {
          this.error = 'Invalid voting link';
          this.loading = false;
          return of(undefined);
        }
        return this.proposalService.getProposal(proposalId);
      })
    );

    this.proposal$.subscribe({
      next: (proposal) => {
        if (!proposal) {
          this.error = 'Proposal not found';
        } else {
          this.currentProposal = proposal;
          this.proposalId = proposal.id;
          this.subscribeToRealtimeUpdates();
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load proposal';
        this.loading = false;
        console.error('Error loading proposal:', err);
      }
    });
  }

  private subscribeToRealtimeUpdates(): void {
    if (this.proposalsSubscription) {
      this.proposalsSubscription.unsubscribe();
    }
    
    this.proposalsSubscription = this.proposalService.proposals$.subscribe(proposals => {
      if (this.proposalId) {
        const updatedProposal = proposals.find(p => p.id === this.proposalId);
        if (updatedProposal) {
          this.currentProposal = updatedProposal;
          this.cd.detectChanges();
        }
      }
    });
  }

  ngOnDestroy(): void {
    if (this.proposalsSubscription) {
      this.proposalsSubscription.unsubscribe();
    }
  }

  private generateVoterIdForVotingLink(): string {
    // Generate a unique voter ID that's different from the session creator
    // In a real app, this would be tied to user authentication
    return 'voter_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
