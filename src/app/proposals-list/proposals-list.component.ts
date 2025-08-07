import { Component, inject, OnDestroy, OnInit } from '@angular/core';
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
  currentUserId = '';
  private destroy$ = new Subject<void>();

  proposalService = inject(ProposalService);
  userService = inject(UserService);

  constructor() {
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
        },
        error: (error) => {
          console.error('Error loading proposals:', error);
          // Reset arrays on error
          this.myProposals = [];
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  
}
