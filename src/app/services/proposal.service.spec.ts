import { TestBed } from '@angular/core/testing';
import { ProposalService } from './proposal.service';
import { PocketbaseService } from './pocketbase.service';
import { CreateProposalRequest, VoteRequest, Proposal } from '../models/proposal.model';

// simple in-memory localStorage mock
class LocalStorageMock {
  private store: Record<string, string> = {};
  getItem(key: string): string | null { return this.store[key] ?? null; }
  setItem(key: string, value: string) { this.store[key] = value; }
  removeItem(key: string) { delete this.store[key]; }
  clear() { this.store = {}; }
}

describe('ProposalService', () => {
    let service: ProposalService;
    let mockClient: { collection: jasmine.Spy<(name: string) => unknown> };
    let localStorageMock: LocalStorageMock;

  beforeEach(async () => {
    localStorageMock = new LocalStorageMock();
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, configurable: true });

      const proposalsCollection = {
        create: jasmine.createSpy('create').and.returnValue(Promise.resolve()),
        delete: jasmine.createSpy('delete').and.returnValue(Promise.resolve()),
        getOne: jasmine.createSpy('getOne').and.returnValue(Promise.resolve({ id: '1', created_by: 'user1' } as Proposal)),
        getFullList: jasmine.createSpy('getFullList').and.returnValue(Promise.resolve([])),
        subscribe: jasmine.createSpy('subscribe').and.returnValue(Promise.resolve(() => undefined))
      };

      const votesCollection = {
        create: jasmine.createSpy('create').and.returnValue(Promise.resolve()),
        getList: jasmine.createSpy('getList').and.returnValue(Promise.resolve({ items: [] })),
        subscribe: jasmine.createSpy('subscribe').and.returnValue(Promise.resolve(() => undefined))
      };

      mockClient = {
        collection: jasmine.createSpy('collection').and.callFake((name: string) => {
          return name === 'proposals' ? proposalsCollection : votesCollection;
        })
      };

      const proto = ProposalService.prototype as unknown as {
        loadProposals: () => Promise<void>;
        subscribeToRealtimeUpdates: () => Promise<void>;
      };
      spyOn(proto, 'loadProposals').and.returnValue(Promise.resolve());
      spyOn(proto, 'subscribeToRealtimeUpdates').and.returnValue(Promise.resolve());

    await TestBed.configureTestingModule({
      providers: [
        ProposalService,
        { provide: PocketbaseService, useValue: { client: mockClient } }
      ]
    }).compileComponents();

    service = TestBed.inject(ProposalService);
  });

  it('should create a proposal via pocketbase', async () => {
    const request: CreateProposalRequest = { title: 't', description: 'd', duration_hours: 1, minimum_votes: 1 };
    await service.createProposal(request, 'user1');
    expect(mockClient.collection).toHaveBeenCalledWith('proposals');
    const proposalsColl = mockClient.collection.calls.first().returnValue as { create: jasmine.Spy };
    expect(proposalsColl.create).toHaveBeenCalled();
  });

  it('should record a vote and mark local storage', async () => {
    spyOn(service, 'hasUserVoted').and.returnValue(Promise.resolve(false));
    const voteRequest: VoteRequest = { proposal_id: '1', voter_id: 'user2', vote: 'yes' };
    await service.vote(voteRequest);
    const votesColl = mockClient.collection.calls.mostRecent().returnValue as { create: jasmine.Spy };
    expect(votesColl.create).toHaveBeenCalled();
    expect(localStorageMock.getItem('voted_1')).toBe('true');
    expect(localStorageMock.getItem('vote_choice_1')).toBe('yes');
  });
});
