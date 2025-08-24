import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { VotePageComponent } from './vote-page.component';
import { ProposalService } from '../services/proposal.service';
import { UserService } from '../services/user.service';

class MockProposalService {
  proposals$ = of([]);
  getProposal() { return of(undefined); }
}

class MockUserService {
  getCurrentUserId() { return ''; }
}

describe('VotePageComponent', () => {
  let component: VotePageComponent;
  let fixture: ComponentFixture<VotePageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, VotePageComponent],
      providers: [
        { provide: ProposalService, useClass: MockProposalService },
        { provide: UserService, useClass: MockUserService }
      ]
    }).compileComponents();
    
    fixture = TestBed.createComponent(VotePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
