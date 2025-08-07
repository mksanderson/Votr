import { Component, EventEmitter, inject, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProposalService } from '../services/proposal.service';
import { UserService } from '../services/user.service';
import { CreateProposalRequest } from '../models/proposal.model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-create-proposal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-proposal.component.html',
  styleUrl: './create-proposal.component.scss'
})
export class CreateProposalComponent {
  @Output() proposalCreated = new EventEmitter<void>();

  formData: CreateProposalRequest = {
    title: '',
    description: '',
    duration_hours: 24,
    minimum_votes: 3
  };

  isSubmitting = false;
  errorMessage = '';

  proposalService = inject(ProposalService);
  userService = inject(UserService);
  router = inject(Router);

  async onSubmit(): Promise<void> {
    if (this.isFormValid()) {
      this.isSubmitting = true;
      this.errorMessage = '';

      const creatorId = this.userService.getCurrentUserId();
      
      try {
        await this.proposalService.createProposal(this.formData, creatorId);
        console.log('Proposal created successfully');
        this.resetForm();
        this.proposalCreated.emit();
        await this.router.navigate(['/']);
      } catch (error) {
        this.errorMessage = 'Failed to create proposal. Please try again.';
        console.error('Error creating proposal:', error);
      } finally {
        this.isSubmitting = false;
      }
    }
  }

  private isFormValid(): boolean {
    return this.formData.title.trim().length > 0 && 
           this.formData.description.trim().length > 0 &&
           this.formData.duration_hours > 0 &&
           this.formData.minimum_votes > 0;
  }

  private resetForm(): void {
    this.formData = {
      title: '',
      description: '',
      duration_hours: 24,
      minimum_votes: 3
    };
  }
}
