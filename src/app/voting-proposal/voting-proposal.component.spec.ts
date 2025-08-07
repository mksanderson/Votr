import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VotingProposalComponent } from './voting-proposal.component';

describe('VotingProposalComponent', () => {
  let component: VotingProposalComponent;
  let fixture: ComponentFixture<VotingProposalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VotingProposalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(VotingProposalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
