import { Routes } from '@angular/router';
import { VotePageComponent } from './vote-page/vote-page.component';
import { HomeComponent } from './home/home.component';

export const routes: Routes = [
  { path: 'vote/:id', component: VotePageComponent },
  { path: '', component: HomeComponent, pathMatch: 'full' }
];
