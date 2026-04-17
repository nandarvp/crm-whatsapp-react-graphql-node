const contacts = [
  { id: '1', name: 'Alice Johnson', phone: '+1234567890', lastMessage: null, updatedAt: new Date().toISOString() },
  { id: '2', name: 'Bob Smith', phone: '+0987654321', lastMessage: null, updatedAt: new Date().toISOString() },
];

const messages = [];

let contactIdCounter = 3;
let messageIdCounter = 1;

module.exports = {
  contacts,
  messages,
  getNextContactId: () => String(contactIdCounter++),
  getNextMessageId: () => String(messageIdCounter++),
};
