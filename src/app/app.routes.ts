import { Routes } from '@angular/router';
import { VotePageComponent } from './vote-page/vote-page.component';
import { HomeComponent } from './home/home.component';
import { CreateProposalComponent } from './create-proposal/create-proposal.component';

export const routes: Routes = [
  { path: 'vote/:id', component: VotePageComponent },
  { path: 'create-proposal', component: CreateProposalComponent },
  { path: '', component: HomeComponent, pathMatch: 'full' }
];
