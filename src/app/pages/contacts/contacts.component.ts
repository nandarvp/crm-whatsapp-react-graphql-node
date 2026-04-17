import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, Contact } from '../../services/api.service';

@Component({
  selector: 'app-contacts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col h-full">
      <header class="bg-white border-b px-6 py-4 flex items-center justify-between">
        <h1 class="text-xl font-semibold text-gray-800">Contacts</h1>
        <button (click)="showAddForm.set(true)"
          class="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition">
          + Add Contact
        </button>
      </header>

      @if (showAddForm()) {
        <div class="bg-green-50 border-b px-6 py-4 flex gap-3 items-end">
          <div class="flex-1">
            <label class="block text-xs font-medium text-gray-600 mb-1">Name</label>
            <input [(ngModel)]="newName" placeholder="Full name"
              class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <div class="flex-1">
            <label class="block text-xs font-medium text-gray-600 mb-1">WhatsApp Phone</label>
            <input [(ngModel)]="newPhone" placeholder="+1234567890"
              class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <button (click)="addContact()"
            class="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition">
            Save
          </button>
          <button (click)="showAddForm.set(false)"
            class="text-gray-500 px-4 py-2 rounded-lg text-sm hover:bg-gray-100 transition">
            Cancel
          </button>
        </div>
      }

      @if (error()) {
        <div class="bg-red-50 border-b border-red-200 px-6 py-3 text-sm text-red-700">
          {{ error() }}
        </div>
      }

      <div class="flex-1 overflow-y-auto">
        @if (loading()) {
          <div class="flex items-center justify-center h-32 text-gray-400">Loading…</div>
        } @else if (contacts().length === 0) {
          <div class="flex flex-col items-center justify-center h-48 text-gray-400">
            <p class="text-lg">No contacts yet</p>
            <p class="text-sm mt-1">Add a contact to start messaging</p>
          </div>
        } @else {
          @for (contact of contacts(); track contact.id) {
            <div (click)="openChat(contact)"
              class="flex items-center gap-4 px-6 py-4 bg-white border-b hover:bg-gray-50 cursor-pointer transition">
              <div class="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold text-lg flex-shrink-0">
                {{ contact.name[0].toUpperCase() }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-medium text-gray-900 truncate">{{ contact.name }}</p>
                <p class="text-sm text-gray-500 truncate">{{ contact.lastMessage || contact.phone }}</p>
              </div>
              <div class="flex flex-col items-end gap-2">
                <span class="text-xs text-gray-400">{{ formatTime(contact.updatedAt) }}</span>
                <button (click)="deleteContact($event, contact)"
                  class="text-gray-300 hover:text-red-500 transition p-1 rounded">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>
          }
        }
      </div>
    </div>
  `,
})
export class ContactsComponent implements OnInit {
  contacts = signal<Contact[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  showAddForm = signal(false);
  newName = '';
  newPhone = '';

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit() {
    this.loadContacts();
  }

  loadContacts() {
    this.loading.set(true);
    this.api.getContacts().subscribe({
      next: data => { this.contacts.set(data.contacts); this.loading.set(false); },
      error: err => { this.error.set('Failed to load contacts: ' + err.message); this.loading.set(false); },
    });
  }

  addContact() {
    if (!this.newName.trim() || !this.newPhone.trim()) return;
    this.api.addContact(this.newName.trim(), this.newPhone.trim()).subscribe({
      next: data => {
        this.contacts.update(list => [data.addContact, ...list]);
        this.newName = '';
        this.newPhone = '';
        this.showAddForm.set(false);
      },
      error: err => this.error.set(err.message),
    });
  }

  deleteContact(event: Event, contact: Contact) {
    event.stopPropagation();
    if (!confirm(`Delete ${contact.name}?`)) return;
    this.api.deleteContact(contact.id).subscribe({
      next: () => this.contacts.update(list => list.filter(c => c.id !== contact.id)),
      error: err => this.error.set(err.message),
    });
  }

  openChat(contact: Contact) {
    this.router.navigate(['/chat', contact.id]);
  }

  formatTime(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}
