const { PubSub } = require('graphql-subscriptions');
const { contacts, messages, getNextContactId, getNextMessageId } = require('./store');
const { sendWhatsAppMessage } = require('./whatsappService');

const pubsub = new PubSub();
const MESSAGE_RECEIVED = 'MESSAGE_RECEIVED';
const CONTACT_UPDATED = 'CONTACT_UPDATED';

const resolvers = {
  Query: {
    contacts: () => [...contacts].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
    contact: (_, { id }) => contacts.find(c => c.id === id),
    messages: (_, { contactId }) =>
      messages.filter(m => m.contactId === contactId).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
  },

  Contact: {
    messages: (contact) =>
      messages.filter(m => m.contactId === contact.id).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
  },

  Mutation: {
    sendMessage: async (_, { contactId, body }) => {
      const contact = contacts.find(c => c.id === contactId);
      if (!contact) throw new Error(`Contact ${contactId} not found`);

      await sendWhatsAppMessage(contact.phone, body);

      const message = {
        id: getNextMessageId(),
        contactId,
        body,
        direction: 'outbound',
        timestamp: new Date().toISOString(),
        status: 'sent',
      };
      messages.push(message);

      contact.lastMessage = body;
      contact.updatedAt = message.timestamp;

      pubsub.publish(MESSAGE_RECEIVED, { messageReceived: message });
      pubsub.publish(CONTACT_UPDATED, { contactUpdated: contact });

      return message;
    },

    addContact: (_, { name, phone }) => {
      if (contacts.find(c => c.phone === phone)) {
        throw new Error(`Contact with phone ${phone} already exists`);
      }
      const contact = {
        id: getNextContactId(),
        name,
        phone,
        lastMessage: null,
        updatedAt: new Date().toISOString(),
      };
      contacts.push(contact);
      return contact;
    },

    deleteContact: (_, { id }) => {
      const index = contacts.findIndex(c => c.id === id);
      if (index === -1) return false;
      contacts.splice(index, 1);
      return true;
    },
  },

  Subscription: {
    messageReceived: {
      subscribe: () => pubsub.asyncIterableIterator([MESSAGE_RECEIVED]),
    },
    contactUpdated: {
      subscribe: () => pubsub.asyncIterableIterator([CONTACT_UPDATED]),
    },
  },
};

module.exports = { resolvers, pubsub, MESSAGE_RECEIVED, CONTACT_UPDATED };
