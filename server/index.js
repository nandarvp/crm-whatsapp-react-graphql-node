require('dotenv').config({ path: '../.env' });

const http = require('http');
const express = require('express');
const cors = require('cors');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { WebSocketServer } = require('ws');
const { useServer } = require('graphql-ws/lib/use/ws');

const { typeDefs } = require('./schema');
const { resolvers, pubsub, MESSAGE_RECEIVED, CONTACT_UPDATED } = require('./resolvers');
const { contacts, messages, getNextContactId, getNextMessageId } = require('./store');

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:4200' }));
app.use(express.json());

// ── WhatsApp webhook verification (GET) ──────────────────────────────────────
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    console.log('[WhatsApp] Webhook verified');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ── WhatsApp webhook — receive inbound messages (POST) ───────────────────────
app.post('/webhook', (req, res) => {
  const body = req.body;
  if (body.object !== 'whatsapp_business_account') return res.sendStatus(404);

  body.entry?.forEach(entry => {
    entry.changes?.forEach(change => {
      if (change.field !== 'messages') return;

      change.value?.messages?.forEach(msg => {
        const fromPhone = `+${msg.from}`;
        let contact = contacts.find(c => c.phone === fromPhone || c.phone === msg.from);

        if (!contact) {
          const displayName = change.value?.contacts?.[0]?.profile?.name || fromPhone;
          contact = {
            id: getNextContactId(),
            name: displayName,
            phone: fromPhone,
            lastMessage: null,
            updatedAt: new Date().toISOString(),
          };
          contacts.push(contact);
        }

        const body = msg.type === 'text' ? msg.text.body : `[${msg.type}]`;

        const message = {
          id: getNextMessageId(),
          contactId: contact.id,
          body,
          direction: 'inbound',
          timestamp: new Date(Number(msg.timestamp) * 1000).toISOString(),
          status: 'received',
        };
        messages.push(message);

        contact.lastMessage = body;
        contact.updatedAt = message.timestamp;

        pubsub.publish(MESSAGE_RECEIVED, { messageReceived: message });
        pubsub.publish(CONTACT_UPDATED, { contactUpdated: contact });
      });
    });
  });

  res.sendStatus(200);
});

// ── Apollo GraphQL ────────────────────────────────────────────────────────────
const schema = makeExecutableSchema({ typeDefs, resolvers });

async function startServer() {
  const httpServer = http.createServer(app);

  const wsServer = new WebSocketServer({ server: httpServer, path: '/graphql' });
  const wsCleanup = useServer({ schema }, wsServer);

  const apollo = new ApolloServer({
    schema,
    plugins: [
      {
        async serverWillStart() {
          return { async drainServer() { await wsCleanup.dispose(); } };
        },
      },
    ],
  });

  await apollo.start();
  app.use('/graphql', expressMiddleware(apollo));

  const PORT = process.env.PORT || 4000;
  httpServer.listen(PORT, () => {
    console.log(`🚀  GraphQL ready at  http://localhost:${PORT}/graphql`);
    console.log(`🔌  WebSocket ready at ws://localhost:${PORT}/graphql`);
    console.log(`📱  WhatsApp webhook  http://localhost:${PORT}/webhook`);
  });
}

startServer().catch(err => { console.error(err); process.exit(1); });
