import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProposalService } from '../services/proposal.service';
import { UserService } from '../services/user.service';
import { VotingProposalComponent } from '../voting-proposal/voting-proposal.component';
import { Proposal } from '../models/proposal.model';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-proposals-list',
  standalone: true,
  imports: [CommonModule, VotingProposalComponent],
  templateUrl: './proposals-list.component.html',
  styleUrl: './proposals-list.component.scss'
})
export class ProposalsListComponent implements OnInit, OnDestroy {
  proposals$: Observable<Proposal[]>;
  myProposals: Proposal[] = [];
  otherProposals: Proposal[] = [];
  currentUserId: string = '';
  activeTab: string = 'myProposals';
  private destroy$ = new Subject<void>();

  constructor(
    private proposalService: ProposalService,
    private userService: UserService
  ) {
    console.log("STARTING UPPP!!!");
    this.proposals$ = this.proposalService.proposals$;
  }

  ngOnInit(): void {
    this.currentUserId = this.userService.getCurrentUserId();
    this.proposals$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (proposals) => {
          this.myProposals = proposals.filter(proposal => proposal.created_by === this.currentUserId);
          this.otherProposals = proposals.filter(proposal => proposal.created_by !== this.currentUserId);
        },
        error: (error) => {
          console.error('Error loading proposals:', error);
          // Reset arrays on error
          this.myProposals = [];
          this.otherProposals = [];
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  canUserVoteOnProposal(proposal: Proposal): boolean {
    // User cannot vote on their own proposals
    return proposal.created_by !== this.currentUserId;
  }

  trackByProposalId(index: number, proposal: Proposal): string {
    return proposal.id;
  }

  setActiveTab(tabName: string): void {
    this.activeTab = tabName;
  }
}
