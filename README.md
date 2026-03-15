# kayflux-mcp

MCP server that connects Claude to a running [KayFlux](https://github.com/WilliM233/kayflux) instance via its REST API.

## Architecture

```
Claude (claude.ai / Claude Desktop / Claude Code)
    │  MCP Protocol (stdio)
    ▼
kayflux-mcp (this package)
    │  HTTP fetch() calls
    ▼
KayFlux Express API (http://<host>:<port>/api/...)
    │  SQLite via better-sqlite3
    ▼
app.db
```

This server is a **client** of the KayFlux API. It never touches SQLite directly.

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- A running [KayFlux](https://github.com/WilliM233/kayflux) instance (the REST API this server connects to)

## Setup

```bash
git clone https://github.com/WilliM233/kayflux-mcp.git
cd kayflux-mcp
npm install
```

## Configuration

Set the KayFlux API URL via environment variable:

```bash
KAYFLUX_API_URL=http://localhost:3000 node index.js
```

Default: `http://localhost:3000`

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "kayflux": {
      "command": "node",
      "args": ["C:/path/to/kayflux-mcp/index.js"],
      "env": {
        "KAYFLUX_API_URL": "http://localhost:3000"
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add kayflux node /path/to/kayflux-mcp/index.js -e KAYFLUX_API_URL=http://localhost:3000
```

## Tools (54 total)

### Connection (1)
| Tool | Description |
|------|-------------|
| `check_connection` | Verify KayFlux API is reachable |

### Read Tools (17)
| Tool | Description |
|------|-------------|
| `list_superstars` | List superstars with filters (brand, division, alignment, status, search) |
| `get_superstar` | Get superstar by ID |
| `list_championships` | List championships with filters |
| `get_championship` | Get championship by ID with reign history |
| `list_tag_teams` | List tag teams/stables with filters |
| `get_tag_team` | Get tag team by ID with members |
| `list_events` | List events with filters |
| `get_event` | Get event by ID with match card |
| `list_matches` | List matches for an event |
| `list_rivalries` | List rivalries with filters |
| `get_rivalry` | Get rivalry by ID with participants |
| `list_brands` | List all brands |
| `get_brand` | Get brand by ID |
| `list_session_log` | List session log entries with filters |
| `list_seasons` | List all seasons |
| `list_show_templates` | List show templates |
| `list_guides` | List all guides |
| `get_guide` | Get guide by slug |

### Write Tools — Superstars (3)
| Tool | Description |
|------|-------------|
| `create_superstar` | Add a new superstar |
| `update_superstar` | Update superstar properties |
| `delete_superstar` | Soft-delete a superstar |

### Write Tools — Championships (4)
| Tool | Description |
|------|-------------|
| `create_championship` | Create a championship |
| `update_championship` | Update championship properties |
| `award_title` | Award title to a superstar |
| `vacate_title` | Vacate a championship |

### Write Tools — Events & Matches (9)
| Tool | Description |
|------|-------------|
| `create_event` | Create an event |
| `update_event` | Update event properties |
| `delete_event` | Delete an event |
| `create_match` | Add a match to an event |
| `update_match` | Update match details |
| `delete_match` | Remove a match |
| `add_match_participant` | Add superstar to a match |
| `record_match_result` | Record match result (winners, losers, method, rating) |
| `remove_match_participant` | Remove superstar from a match |

### Write Tools — Rivalries (5)
| Tool | Description |
|------|-------------|
| `create_rivalry` | Create a rivalry |
| `update_rivalry` | Update rivalry properties |
| `delete_rivalry` | Soft-delete a rivalry |
| `add_rivalry_participant` | Add superstar to a rivalry |
| `remove_rivalry_participant` | Remove superstar from a rivalry |

### Write Tools — Tag Teams (6)
| Tool | Description |
|------|-------------|
| `create_tag_team` | Create a tag team or stable |
| `update_tag_team` | Update team properties |
| `delete_tag_team` | Soft-delete a team |
| `add_team_member` | Add superstar to a team |
| `update_team_member` | Update member role |
| `remove_team_member` | Remove superstar from a team |

### Write Tools — Session Log (3)
| Tool | Description |
|------|-------------|
| `create_session_entry` | Create session log entry |
| `update_session_entry` | Update session log entry |
| `delete_session_entry` | Delete session log entry |

### Write Tools — Brands/Seasons/Guides (6)
| Tool | Description |
|------|-------------|
| `update_brand` | Update brand properties |
| `create_season` | Create a season |
| `update_season` | Update season properties |
| `create_guide` | Create a guide |
| `update_guide` | Update a guide |
| `delete_guide` | Delete a guide |

### Utility Tools (2)
| Tool | Description |
|------|-------------|
| `get_schema` | Get database schema (tables, columns, types) |
| `query` | Execute read-only SQL SELECT for ad-hoc analytics |

## Troubleshooting

**"KayFlux API not reachable"**
- Ensure the KayFlux server is running
- Check that `KAYFLUX_API_URL` points to the correct host and port
- Try `curl http://localhost:3000/api/brands` to verify the API responds

**"KayFlux API error (404)"**
- The endpoint may not exist — check that your KayFlux server is up to date
- The `get_schema` and `query` tools require the schema/query endpoints added in KayFlux v1.1+

**Tool not found**
- Restart the MCP server after any code changes
- Check that `index.js` is the entry point in your MCP config

## License

Private project — not distributed.
