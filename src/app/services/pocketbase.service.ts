import { Injectable } from '@angular/core';
import PocketBase from 'pocketbase';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class PocketbaseService {
  private pocketbase: PocketBase;

  constructor() {
    this.pocketbase = new PocketBase(environment.pocketbase.url);
  }

  get client() {
    return this.pocketbase;
  }
}
