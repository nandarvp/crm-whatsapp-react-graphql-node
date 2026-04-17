import { Component, OnInit, OnDestroy, signal, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService, Contact, Message } from '../../services/api.service';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="flex flex-col h-full bg-gray-50">
      <!-- Header -->
      <header class="bg-white border-b px-4 py-3 flex items-center gap-3">
        <a routerLink="/contacts" class="text-gray-500 hover:text-gray-700 p-1 rounded">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </a>
        @if (contact()) {
          <div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold">
            {{ contact()!.name[0].toUpperCase() }}
          </div>
          <div>
            <p class="font-semibold text-gray-900">{{ contact()!.name }}</p>
            <p class="text-xs text-gray-500">{{ contact()!.phone }}</p>
          </div>
        }
      </header>

      <!-- Messages -->
      <div #scrollContainer class="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        @if (loading()) {
          <div class="flex items-center justify-center h-16 text-gray-400 text-sm">Loading messages…</div>
        } @else if (messages().length === 0) {
          <div class="flex items-center justify-center h-16 text-gray-400 text-sm">No messages yet. Say hello!</div>
        } @else {
          @for (msg of messages(); track msg.id) {
            <div class="flex" [class.justify-end]="msg.direction === 'outbound'">
              <div [class]="msg.direction === 'outbound'
                  ? 'bg-green-500 text-white rounded-2xl rounded-br-sm px-4 py-2 max-w-xs shadow-sm'
                  : 'bg-white text-gray-900 rounded-2xl rounded-bl-sm px-4 py-2 max-w-xs shadow-sm border'">
                <p class="text-sm">{{ msg.body }}</p>
                <p class="text-xs mt-1 opacity-60 text-right">{{ formatTime(msg.timestamp) }}</p>
              </div>
            </div>
          }
        }
      </div>

      <!-- Compose -->
      <div class="bg-white border-t px-4 py-3 flex gap-3 items-end">
        <textarea [(ngModel)]="draft" (keydown.enter)="onEnter($event)"
          placeholder="Type a message…" rows="1"
          class="flex-1 border rounded-2xl px-4 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500 max-h-32 overflow-y-auto">
        </textarea>
        <button (click)="send()" [disabled]="!draft.trim() || sending()"
          class="bg-green-600 text-white w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
          </svg>
        </button>
      </div>
    </div>
  `,
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef<HTMLDivElement>;

  contact = signal<Contact | null>(null);
  messages = signal<Message[]>([]);
  loading = signal(true);
  sending = signal(false);
  draft = '';

  private contactId = '';
  private pollSub?: Subscription;
  private shouldScroll = false;

  constructor(private route: ActivatedRoute, private router: Router, private api: ApiService) {}

  ngOnInit() {
    this.contactId = this.route.snapshot.paramMap.get('id')!;

    this.api.getContact(this.contactId).subscribe({
      next: data => this.contact.set(data.contact),
      error: () => this.router.navigate(['/contacts']),
    });

    this.loadMessages();

    // Poll for new messages every 3 s
    this.pollSub = interval(3000).pipe(
      switchMap(() => this.api.getMessages(this.contactId))
    ).subscribe(data => {
      if (data.messages.length !== this.messages().length) {
        this.messages.set(data.messages);
        this.shouldScroll = true;
      }
    });
  }

  ngOnDestroy() {
    this.pollSub?.unsubscribe();
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  loadMessages() {
    this.api.getMessages(this.contactId).subscribe({
      next: data => {
        this.messages.set(data.messages);
        this.loading.set(false);
        this.shouldScroll = true;
      },
      error: () => this.loading.set(false),
    });
  }

  send() {
    const body = this.draft.trim();
    if (!body) return;

    this.sending.set(true);
    this.draft = '';

    this.api.sendMessage(this.contactId, body).subscribe({
      next: data => {
        this.messages.update(list => [...list, data.sendMessage]);
        this.sending.set(false);
        this.shouldScroll = true;
      },
      error: () => this.sending.set(false),
    });
  }

  onEnter(event: Event) {
    const ke = event as KeyboardEvent;
    if (!ke.shiftKey) {
      ke.preventDefault();
      this.send();
    }
  }

  private scrollToBottom() {
    try {
      const el = this.scrollContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    } catch {}
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
