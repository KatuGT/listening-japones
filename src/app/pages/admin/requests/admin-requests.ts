import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../services/supabase.service';

@Component({
  selector: 'app-admin-requests',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-requests.html',
  styleUrls: ['./admin-requests.scss'],
})
export class AdminRequests {
  private supabase = inject(SupabaseService);
  clipRequestsList = signal<any[]>([]);

  constructor() {
    this.loadClipRequests();
  }

  async loadClipRequests() {
    try {
      const requests = await this.supabase.getAllClipRequests();
      this.clipRequestsList.set(requests);
    } catch (err) {
      console.error('Error loading clip requests', err);
    }
  }

  async toggleClipRequestVisibility(request: any) {
    try {
      await this.supabase.updateClipRequest(request.id, { is_visible: !request.is_visible });
      this.loadClipRequests();
    } catch (err) {
      console.error('Error toggling visibility', err);
    }
  }

  async updateClipRequestStatus(request: any, status: string) {
    try {
      await this.supabase.updateClipRequest(request.id, { status });
      this.loadClipRequests();
    } catch (err) {
      console.error('Error updating status', err);
    }
  }
}
