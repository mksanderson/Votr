import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly USER_ID_KEY = 'votr_user_id';
  private userId: string;

  constructor() {
    this.userId = this.getOrCreateUserId();
  }

  private getOrCreateUserId(): string {
    let userId = localStorage.getItem(this.USER_ID_KEY);
    if (!userId) {
      userId = this.generateUserId();
      localStorage.setItem(this.USER_ID_KEY, userId);
    }
    return userId;
  }

  private generateUserId(): string {
    return 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  getCurrentUserId(): string {
    return this.userId;
  }

  generateVoterIdFromUrl(): string {
    const urlParams = new URLSearchParams(window.location.search);
    const voterId = urlParams.get('voter') || this.generateUserId();
    return voterId;
  }
}
