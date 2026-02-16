# OpenClaw Fork - Enhanced with Maton API Integrations

This fork of OpenClaw includes additional tool extensions for popular SaaS platforms and messaging channel enhancements.

## 🆕 New Tool Extensions

### Maton-Based API Integrations

All Maton-based extensions require a `MATON_API_KEY` from [maton.ai](https://maton.ai/). These provide OAuth-managed access to various SaaS platforms through Maton's gateway.

#### 1. **ClickUp API** (`extensions/clickup-api`)

Manage ClickUp tasks, lists, folders, spaces, and workspaces.

**Setup:**
```bash
export MATON_API_KEY="your_maton_api_key"
```

**Available Actions:**
- `getTeams` - List workspaces/teams
- `getSpaces` - List spaces in a team
- `getFolders` - List folders in a space
- `getLists` - List lists in a folder
- `getTasks` - List tasks in a list
- `getTask` - Get specific task
- `createTask` - Create new task
- `updateTask` - Update existing task
- `deleteTask` - Delete task

**Example Usage:**
```javascript
// List all teams
{ "action": "getTeams" }

// Create a task
{
  "action": "createTask",
  "listId": "901234",
  "data": {
    "name": "Complete API integration",
    "description": "Integrate with the new payment API",
    "priority": 2,
    "assignees": [123]
  }
}
```

#### 2. **Asana API** (`extensions/asana-api`)

Manage Asana tasks, projects, and workspaces.

**Available Actions:**
- `getTasks`, `getTask`, `createTask`, `updateTask`, `deleteTask`
- `getProjects`, `getProject`
- `getWorkspaces`

**Example Usage:**
```javascript
{
  "action": "createTask",
  "data": {
    "name": "Review quarterly report",
    "projects": ["1234567890"],
    "due_on": "2026-03-20"
  }
}
```

#### 3. **Airtable API** (`extensions/airtable-api`)

Manage Airtable bases, tables, and records.

**Available Actions:**
- `listBases` - List all bases
- `getBaseSchema` - Get base schema/tables
- `listRecords` - List records from a table
- `getRecord` - Get specific record
- `createRecords` - Create new records
- `updateRecords` - Update records (PATCH)
- `deleteRecords` - Delete records

**Example Usage:**
```javascript
{
  "action": "createRecords",
  "baseId": "appXXXXX",
  "tableIdOrName": "Tasks",
  "records": [
    {
      "fields": {
        "Name": "New Task",
        "Status": "Todo",
        "Priority": "High"
      }
    }
  ]
}
```

#### 4. **Notion API** (`extensions/notion-api`)

Manage Notion pages, databases (data sources), and blocks.

**Setup:**
```bash
# Create Notion integration at https://notion.so/my-integrations
mkdir -p ~/.config/notion
echo "ntn_your_key_here" > ~/.config/notion/api_key
```

**Available Actions:**
- `search` - Search pages and databases
- `getPage` - Get page details
- `getBlocks` - Get page content blocks
- `createPage` - Create new page
- `updatePage` - Update page properties
- `queryDatabase` - Query database with filters
- `createDatabase` - Create new database
- `addBlocks` - Add content blocks

**Example Usage:**
```javascript
{
  "action": "createPage",
  "databaseId": "abc123",
  "properties": {
    "Name": { "title": [{ "text": { "content": "New Project" } }] },
    "Status": { "select": { "name": "In Progress" } }
  }
}
```

#### 5. **WhatsApp Business API** (`extensions/whatsapp-business-api`)

Send WhatsApp Business messages via Maton OAuth gateway.

**Available Actions:**
- `sendText` - Send text message
- `sendTemplate` - Send template message
- `sendImage`, `sendDocument`, `sendVideo`, `sendAudio` - Send media
- `sendLocation` - Send location
- `markRead` - Mark message as read
- `getPhoneNumber`, `getBusinessProfile` - Get account info

**Example Usage:**
```javascript
{
  "phoneNumberId": "123456789",
  "action": "sendText",
  "to": "1234567890",
  "text": "Hello from WhatsApp Business!"
}
```

#### 6. **Brave Search API** (`extensions/brave-search-api`)

Perform web searches using Brave Search API.

**Setup:**
```bash
export BRAVE_API_KEY="your_brave_api_key"
# Get one at https://brave.com/search/api/
```

**Example Usage:**
```javascript
{
  "query": "OpenClaw AI assistant",
  "count": 10
}
```

## 📦 Installation

1. Clone this fork:
```bash
git clone git@github.com:redevops-io/openclaw.git
cd openclaw
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
export MATON_API_KEY="your_maton_api_key"
export BRAVE_API_KEY="your_brave_api_key"
```

4. Build and run:
```bash
pnpm build
pnpm openclaw gateway run
```

## 🔧 Configuration

Add extensions to your `openclaw.yaml`:

```yaml
plugins:
  - "@openclaw/clickup-api"
  - "@openclaw/asana-api"
  - "@openclaw/airtable-api"
  - "@openclaw/notion-api"
  - "@openclaw/whatsapp-business-api"
  - "@openclaw/brave-search-api"
```

## 📊 Enhanced Messaging Channels

The existing Telegram, Slack, and Discord extensions remain fully functional with all their native features:

### Telegram
- Direct messages, groups, channels, threads
- Reactions, polls, media, native commands
- Block streaming support
- Pairing-based security

### Slack
- Direct messages, channels, threads
- Reactions, media, native commands
- Message actions
- Webhook support

### Discord
- Direct messages, channels, threads
- Reactions, polls, media
- Role-based permissions
- Guild/channel allowlists

## 🔄 Integrating with Your RAG Platform

### For telegrambot.ai Integration

Your existing `rag-saas-platform` uses a Python-based Telegram bot with RAG capabilities. To incorporate claude-telegram architecture principles:

**Current Architecture:**
```
telegram-bot/bot.py → DuckDB → HippoRAG → LLM response
```

**Enhanced Architecture (claude-telegram style):**
```
telegram-bot → OpenClaw Gateway → Multi-LLM → Tools → Response
```

**Integration Steps:**

1. **Add OpenClaw as a microservice:**
```yaml
# docker-compose.yml
services:
  openclaw-gateway:
    image: openclaw/openclaw:latest
    environment:
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - WORKSPACE=${WORKSPACE_PATH}
    volumes:
      - ./openclaw-workspace:/workspace
    ports:
      - "18789:18789"
```

2. **Route messages through OpenClaw:**
```python
# telegram-bot/bot.py enhancement
import aiohttp

async def handle_message_via_openclaw(update, context):
    """Route complex queries through OpenClaw for tool use"""
    async with aiohttp.ClientSession() as session:
        async with session.post(
            'http://openclaw-gateway:18789/api/message',
            json={
                'message': update.message.text,
                'userId': update.effective_user.id,
                'channel': 'telegram'
            }
        ) as resp:
            result = await resp.json()
            await update.message.reply_text(result['response'])
```

3. **Hybrid approach - Use OpenClaw for tool-heavy tasks:**
```python
# Detect if message needs tools (API calls, web search, etc.)
if needs_tools(message):
    # Use OpenClaw with tool extensions
    response = await openclaw_gateway.process(message)
else:
    # Use existing RAG pipeline for knowledge queries
    response = await knowledge_service.query(message)
```

### Session Management

**claude-telegram pattern** (sessions per user):
```typescript
// Persistent sessions survive bot restarts
sessionStore = new SessionStore(workspace);
sessionId = sessionStore.getSessionId(userId);
```

**Integration with your DuckDB:**
```python
# Maintain both:
# 1. OpenClaw sessions for tool-based interactions
# 2. DuckDB/HippoRAG for document-based knowledge queries

class HybridSessionManager:
    def __init__(self):
        self.openclaw_sessions = {}  # Tool interaction sessions
        self.duckdb_context = WorkspaceVectorDatabase()  # Knowledge context
    
    async def process_message(self, user_id, message):
        # Check if tools are needed
        if self.requires_tools(message):
            return await self.openclaw_client.send(user_id, message)
        else:
            return await self.rag_query(user_id, message)
```

## 🔐 Security Considerations

### Maton OAuth
- All Maton-based extensions use Maton's OAuth gateway
- Your OAuth tokens are managed by Maton
- You must trust Maton with your data
- Credentials flow: Your App → Maton Gateway → Target API

### API Keys
- Store in environment variables, never commit
- Use `.env` files for local development
- Use secrets management in production (K8s secrets, etc.)

### Notion Integration
- Stores key in `~/.config/notion/api_key`
- File permissions should be `600` (user-only)
- Share Notion pages/databases with your integration

## 🔍 Troubleshooting

### Maton Extensions

**Error: "Invalid or missing Maton API key"**
```bash
# Verify key is set
echo $MATON_API_KEY

# Test connection
python <<'EOF'
import urllib.request, os, json
req = urllib.request.Request('https://ctrl.maton.ai/connections')
req.add_header('Authorization', f'Bearer {os.environ["MATON_API_KEY"]}')
print(json.dumps(json.load(urllib.request.urlopen(req)), indent=2))
EOF
```

**Error: "Missing connection"**
- Create a connection for the service: https://ctrl.maton.ai
- Complete OAuth flow in browser
- Connection ID will be auto-selected if you have only one

### Build Errors

The TypeScript compilation errors you see are expected during development:
- `@sinclair/typebox` is resolved at runtime from the main OpenClaw package
- `process.env` is available in Node.js runtime
- Extensions are dynamically loaded, not statically compiled

## 📚 Resources

- **OpenClaw Docs**: https://docs.openclaw.ai
- **Maton Platform**: https://maton.ai
- **ClawHub (Skills)**: https://clawhub.ai
- **ClickUp API**: https://developer.clickup.com
- **Asana API**: https://developers.asana.com
- **Airtable API**: https://airtable.com/developers/web/api
- **Notion API**: https://developers.notion.com
- **WhatsApp Business API**: https://developers.facebook.com/docs/whatsapp
- **Brave Search API**: https://brave.com/search/api

## 🤝 Contributing

This is a fork maintained for private use. For upstream contributions, see:
- Original OpenClaw: https://github.com/openclaw/openclaw

## 📄 License

Inherits MIT license from OpenClaw. Additional extensions are also MIT licensed.

---

**Fork Maintainer**: redevops-io  
**Based on**: OpenClaw by @openclaw  
**Last Updated**: February 2026
