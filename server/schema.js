const { gql } = require('graphql-tag');

const typeDefs = gql`
  type Contact {
    id: ID!
    name: String!
    phone: String!
    lastMessage: String
    updatedAt: String!
    messages: [Message!]!
  }

  type Message {
    id: ID!
    contactId: ID!
    body: String!
    direction: String!
    timestamp: String!
    status: String!
  }

  type Query {
    contacts: [Contact!]!
    contact(id: ID!): Contact
    messages(contactId: ID!): [Message!]!
  }

  type Mutation {
    sendMessage(contactId: ID!, body: String!): Message!
    addContact(name: String!, phone: String!): Contact!
    deleteContact(id: ID!): Boolean!
  }

  type Subscription {
    messageReceived: Message!
    contactUpdated: Contact!
  }
`;

module.exports = { typeDefs };
