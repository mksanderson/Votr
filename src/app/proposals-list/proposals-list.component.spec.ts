import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { ProposalsListComponent } from './proposals-list.component';
import { ProposalService } from '../services/proposal.service';
import { UserService } from '../services/user.service';

class MockProposalService {
  proposals$ = of([]);
}

class MockUserService {
  getCurrentUserId() { return 'user1'; }
}

describe('ProposalsListComponent', () => {
  let component: ProposalsListComponent;
  let fixture: ComponentFixture<ProposalsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, ProposalsListComponent],
      providers: [
        { provide: ProposalService, useClass: MockProposalService },
        { provide: UserService, useClass: MockUserService }
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ProposalsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
