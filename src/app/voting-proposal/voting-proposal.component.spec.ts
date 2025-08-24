import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { VotingProposalComponent } from './voting-proposal.component';
import { ProposalService } from '../services/proposal.service';
import { Proposal } from '../models/proposal.model';

class MockProposalService {
  proposals$ = of([]);
  hasUserVoted() { return Promise.resolve(false); }
  getUserVote() { return Promise.resolve(null); }
  vote() { return Promise.resolve(); }
}

describe('VotingProposalComponent', () => {
  let component: VotingProposalComponent;
  let fixture: ComponentFixture<VotingProposalComponent>;
  let mockService: MockProposalService;

  beforeEach(async () => {
    mockService = new MockProposalService();
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, VotingProposalComponent],
      providers: [{ provide: ProposalService, useValue: mockService }]
    }).compileComponents();

    fixture = TestBed.createComponent(VotingProposalComponent);
    component = fixture.componentInstance;
    component.proposal = {
      id: '1',
      title: 'Test',
      description: '',
      created_by: '',
      status: 'active',
      votes: { yes: 0, no: 0 },
      expires_at: new Date().toISOString()
    } as Proposal;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
