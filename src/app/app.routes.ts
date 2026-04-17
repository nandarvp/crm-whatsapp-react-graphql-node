import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'contacts', pathMatch: 'full' },
  {
    path: 'contacts',
    loadComponent: () =>
      import('./pages/contacts/contacts.component').then(m => m.ContactsComponent),
  },
  {
    path: 'chat/:id',
    loadComponent: () =>
      import('./pages/chat/chat.component').then(m => m.ChatComponent),
  },
];
