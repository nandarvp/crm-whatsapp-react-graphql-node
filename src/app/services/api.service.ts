import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

const GQL_URL = 'http://localhost:4000/graphql';

export interface Contact {
  id: string;
  name: string;
  phone: string;
  lastMessage: string | null;
  updatedAt: string;
}

export interface Message {
  id: string;
  contactId: string;
  body: string;
  direction: 'inbound' | 'outbound';
  timestamp: string;
  status: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  private query<T>(query: string, variables?: Record<string, unknown>): Observable<T> {
    return this.http
      .post<{ data: T }>(GQL_URL, { query, variables })
      .pipe(map(res => res.data));
  }

  getContacts(): Observable<{ contacts: Contact[] }> {
    return this.query(`
      query {
        contacts {
          id name phone lastMessage updatedAt
        }
      }
    `);
  }

  getContact(id: string): Observable<{ contact: Contact }> {
    return this.query(`
      query GetContact($id: ID!) {
        contact(id: $id) {
          id name phone lastMessage updatedAt
        }
      }
    `, { id });
  }

  getMessages(contactId: string): Observable<{ messages: Message[] }> {
    return this.query(`
      query GetMessages($contactId: ID!) {
        messages(contactId: $contactId) {
          id contactId body direction timestamp status
        }
      }
    `, { contactId });
  }

  sendMessage(contactId: string, body: string): Observable<{ sendMessage: Message }> {
    return this.query(`
      mutation SendMessage($contactId: ID!, $body: String!) {
        sendMessage(contactId: $contactId, body: $body) {
          id contactId body direction timestamp status
        }
      }
    `, { contactId, body });
  }

  addContact(name: string, phone: string): Observable<{ addContact: Contact }> {
    return this.query(`
      mutation AddContact($name: String!, $phone: String!) {
        addContact(name: $name, phone: $phone) {
          id name phone lastMessage updatedAt
        }
      }
    `, { name, phone });
  }

  deleteContact(id: string): Observable<{ deleteContact: boolean }> {
    return this.query(`
      mutation DeleteContact($id: ID!) {
        deleteContact(id: $id)
      }
    `, { id });
  }
}
