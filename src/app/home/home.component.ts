import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CreateProposalComponent } from '../create-proposal/create-proposal.component';
import { ProposalsListComponent } from '../proposals-list/proposals-list.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, CreateProposalComponent, ProposalsListComponent, RouterOutlet],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  title = 'votr';
  showCreateForm = false;

  toggleCreateForm(): void {
    this.showCreateForm = !this.showCreateForm;
  }

  onProposalCreated(): void {
    this.showCreateForm = false;
  }
}
