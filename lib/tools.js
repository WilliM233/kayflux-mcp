/**
 * KayFlux MCP Tool Definitions
 * 54 tools: 1 connection check, 17 read, 35 write, 2 utility
 */

import { z } from "zod";
import * as client from "./client.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Build query string from optional params, skipping undefined values. */
function qs(params) {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null);
  if (entries.length === 0) return "";
  return "?" + new URLSearchParams(entries).toString();
}

/** Standard MCP text response wrapping raw API JSON. */
function ok(data) {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

/** Standard MCP error response. */
function err(message) {
  return { isError: true, content: [{ type: "text", text: message }] };
}

/** Wrap a handler so API/network errors become MCP error responses. */
function safe(fn) {
  return async (params) => {
    try {
      return await fn(params);
    } catch (e) {
      return err(e.message);
    }
  };
}

// ── Tool Registration ────────────────────────────────────────────────────────

export function registerTools(server) {

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  CONNECTION CHECK                                                       ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  server.tool(
    "check_connection",
    "Check connectivity to the KayFlux API. Call this first to verify the API is reachable.",
    {},
    safe(async () => {
      await client.ping();
      return ok({ status: "connected", url: client.BASE_URL });
    })
  );

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  READ TOOLS (17)                                                        ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  // ── Superstars ──

  server.tool(
    "list_superstars",
    "List superstars with optional filters. Returns roster data with brand, alignment, division, and ratings.",
    {
      brand: z.string().optional().describe("Filter by brand name (Raw, SmackDown, NXT)"),
      division: z.string().optional().describe("Filter by division name"),
      alignment: z.string().optional().describe("Filter by alignment (Face, Heel, Tweener)"),
      status: z.string().optional().describe("Filter by status (Active, Legend)"),
      search: z.string().optional().describe("Search by partial name match"),
      limit: z.number().optional().describe("Max results to return"),
    },
    safe(async ({ brand, division, alignment, status, search, limit }) => {
      const data = await client.get(`/api/superstars${qs({ brand, division, alignment, status, search, limit })}`);
      return ok(data);
    })
  );

  server.tool(
    "get_superstar",
    "Get a single superstar by ID with full details including brand, division, and ratings.",
    { id: z.number().describe("Superstar ID") },
    safe(async ({ id }) => ok(await client.get(`/api/superstars/${id}`)))
  );

  // ── Championships ──

  server.tool(
    "list_championships",
    "List championships with optional filters. Returns title name, holder, brand, and category.",
    {
      brand: z.string().optional().describe("Filter by brand name"),
      active: z.union([z.number(), z.string()]).optional().describe("Filter by active status (0 or 1)"),
      category: z.string().optional().describe("Filter by category (Current WWE, Classic WWE, ECW & WCW, AAA)"),
      division: z.string().optional().describe("Filter by division (Men's Singles, Women's Singles, Tag Team)"),
    },
    safe(async ({ brand, active, category, division }) => {
      const data = await client.get(`/api/championships${qs({ brand, active, category, division })}`);
      return ok(data);
    })
  );

  server.tool(
    "get_championship",
    "Get a championship by ID with current holder and reign history.",
    { id: z.number().describe("Championship ID") },
    safe(async ({ id }) => ok(await client.get(`/api/championships/${id}`)))
  );

  // ── Tag Teams ──

  server.tool(
    "list_tag_teams",
    "List tag teams and stables with optional filters.",
    {
      brand: z.string().optional().describe("Filter by brand name"),
      team_type: z.string().optional().describe("Filter by type (Tag Team, Stable, Mixed Tag)"),
      status: z.string().optional().describe("Filter by status (Active)"),
    },
    safe(async ({ brand, team_type, status }) => {
      const data = await client.get(`/api/tag-teams${qs({ brand, team_type, status })}`);
      return ok(data);
    })
  );

  server.tool(
    "get_tag_team",
    "Get a tag team or stable by ID with its members.",
    { id: z.number().describe("Tag team ID") },
    safe(async ({ id }) => ok(await client.get(`/api/tag-teams/${id}`)))
  );

  // ── Events ──

  server.tool(
    "list_events",
    "List events with optional filters. Returns event name, date, brand, type, and status.",
    {
      brand: z.string().optional().describe("Filter by brand name"),
      season: z.string().optional().describe("Filter by season name"),
      status: z.string().optional().describe("Filter by status (Upcoming, In Progress, Completed)"),
      event_type: z.string().optional().describe("Filter by type (Weekly Show, PPV, Special Event, Draft)"),
    },
    safe(async ({ brand, season, status, event_type }) => {
      const data = await client.get(`/api/events${qs({ brand, season, status, event_type })}`);
      return ok(data);
    })
  );

  server.tool(
    "get_event",
    "Get an event by ID with its full match card.",
    { id: z.number().describe("Event ID") },
    safe(async ({ id }) => ok(await client.get(`/api/events/${id}`)))
  );

  // ── Matches ──

  server.tool(
    "list_matches",
    "List all matches for a specific event.",
    { event_id: z.number().describe("Event ID to list matches for") },
    safe(async ({ event_id }) => ok(await client.get(`/api/events/${event_id}/matches`)))
  );

  // ── Rivalries ──

  server.tool(
    "list_rivalries",
    "List rivalries with optional filters. Returns rivalry name, participants, status, and intensity.",
    {
      brand: z.string().optional().describe("Filter by brand name"),
      status: z.string().optional().describe("Filter by status (Building, Active, Climax, Resolved)"),
      season: z.string().optional().describe("Filter by season name"),
    },
    safe(async ({ brand, status, season }) => {
      const data = await client.get(`/api/rivalries${qs({ brand, status, season })}`);
      return ok(data);
    })
  );

  server.tool(
    "get_rivalry",
    "Get a rivalry by ID with its participants and details.",
    { id: z.number().describe("Rivalry ID") },
    safe(async ({ id }) => ok(await client.get(`/api/rivalries/${id}`)))
  );

  // ── Brands ──

  server.tool(
    "list_brands",
    "List all brands (Raw, SmackDown, NXT, Cross-Brand).",
    {},
    safe(async () => ok(await client.get("/api/brands")))
  );

  server.tool(
    "get_brand",
    "Get a brand by ID with roster summary.",
    { id: z.number().describe("Brand ID") },
    safe(async ({ id }) => ok(await client.get(`/api/brands/${id}`)))
  );

  // ── Session Log ──

  server.tool(
    "list_session_log",
    "List session log entries with optional filters. Returns CCO session notes, storyline updates, booking decisions, etc.",
    {
      brand_id: z.number().optional().describe("Filter by brand ID"),
      entry_type: z.string().optional().describe("Filter by type (gm_notes, results_summary, storyline_update, locker_room, booking_decision, callup_watch, cco_mandate)"),
      limit: z.number().optional().describe("Max results to return"),
    },
    safe(async ({ brand_id, entry_type, limit }) => {
      const data = await client.get(`/api/session-log${qs({ brand_id, entry_type, limit })}`);
      return ok(data);
    })
  );

  // ── Seasons ──

  server.tool(
    "list_seasons",
    "List all seasons.",
    {},
    safe(async () => ok(await client.get("/api/seasons")))
  );

  // ── Show Templates ──

  server.tool(
    "list_show_templates",
    "List all show templates (weekly show formats with match slot configurations).",
    {},
    safe(async () => ok(await client.get("/api/show-templates")))
  );

  // ── Guides ──

  server.tool(
    "list_guides",
    "List all guides (protocols, GM guides, CCO documents).",
    {},
    safe(async () => ok(await client.get("/api/guides")))
  );

  server.tool(
    "get_guide",
    "Get a guide by its URL slug. Returns full guide content.",
    { slug: z.string().describe("Guide slug (e.g. 'cco-operations-protocol')") },
    safe(async ({ slug }) => ok(await client.get(`/api/guides/${slug}`)))
  );

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  WRITE TOOLS — SUPERSTARS (3)                                           ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  server.tool(
    "create_superstar",
    "Add a new superstar to the roster.",
    {
      name: z.string().describe("Superstar ring name (required)"),
      brand_id: z.number().optional().describe("Brand ID to assign to"),
      alignment: z.string().optional().describe("Face, Heel, or Tweener"),
      status: z.string().optional().describe("Active or Legend (default: Active)"),
      division: z.string().optional().describe("Division name"),
      overall_rating: z.number().optional().describe("Overall rating (0-100)"),
      finisher: z.string().optional().describe("Finishing move name"),
      signature: z.string().optional().describe("Signature move name"),
      hometown: z.string().optional().describe("Billed from location"),
      weight_class: z.string().optional().describe("Weight class"),
      character_background: z.string().optional().describe("Character background notes"),
      custom_character: z.number().optional().describe("1 if custom character, 0 if real (default: 0)"),
      notes: z.string().optional().describe("Additional notes"),
    },
    safe(async (params) => ok(await client.post("/api/superstars", params)))
  );

  server.tool(
    "update_superstar",
    "Update a superstar's properties. Only include fields you want to change.",
    {
      id: z.number().describe("Superstar ID (required)"),
      name: z.string().optional().describe("Ring name"),
      brand_id: z.number().optional().describe("Brand ID"),
      alignment: z.string().optional().describe("Face, Heel, or Tweener"),
      status: z.string().optional().describe("Active or Legend"),
      division: z.string().optional().describe("Division name"),
      division_rank: z.number().optional().describe("Rank within division"),
      overall_rating: z.number().optional().describe("Overall rating (0-100)"),
      finisher: z.string().optional().describe("Finishing move name"),
      signature: z.string().optional().describe("Signature move name"),
      hometown: z.string().optional().describe("Billed from location"),
      weight_class: z.string().optional().describe("Weight class"),
      character_background: z.string().optional().describe("Character background notes"),
      custom_character: z.number().optional().describe("1 if custom character, 0 if real"),
      notes: z.string().optional().describe("Additional notes"),
    },
    safe(async ({ id, ...body }) => ok(await client.put(`/api/superstars/${id}`, body)))
  );

  server.tool(
    "delete_superstar",
    "Soft-delete a superstar (sets status to inactive).",
    { id: z.number().describe("Superstar ID") },
    safe(async ({ id }) => ok(await client.del(`/api/superstars/${id}`)))
  );

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  WRITE TOOLS — CHAMPIONSHIPS (4)                                        ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  server.tool(
    "create_championship",
    "Create a new championship title.",
    {
      name: z.string().describe("Championship name (required)"),
      brand_id: z.number().optional().describe("Primary brand ID"),
      division: z.string().optional().describe("Division (Men's Singles, Women's Singles, Tag Team)"),
      category: z.string().optional().describe("Category (Current WWE, Classic WWE, ECW & WCW, AAA)"),
      active: z.number().optional().describe("1 for active, 0 for retired (default: 1)"),
      lineage_notes: z.string().optional().describe("Lineage/history notes"),
      notes: z.string().optional().describe("Additional notes"),
    },
    safe(async (params) => ok(await client.post("/api/championships", params)))
  );

  server.tool(
    "update_championship",
    "Update a championship's properties. Only include fields you want to change.",
    {
      id: z.number().describe("Championship ID (required)"),
      name: z.string().optional().describe("Championship name"),
      brand_id: z.number().optional().describe("Primary brand ID"),
      brand_ids: z.array(z.number()).optional().describe("Array of brand IDs (syncs championship-brand links)"),
      division: z.string().optional().describe("Division"),
      category: z.string().optional().describe("Category"),
      active: z.number().optional().describe("1 for active, 0 for retired"),
      lineage_notes: z.string().optional().describe("Lineage/history notes"),
      notes: z.string().optional().describe("Additional notes"),
    },
    safe(async ({ id, ...body }) => ok(await client.put(`/api/championships/${id}`, body)))
  );

  server.tool(
    "award_title",
    "Award a championship to a superstar. Creates a new reign.",
    {
      id: z.number().describe("Championship ID (required)"),
      superstar_id: z.number().describe("Superstar ID to award the title to (required)"),
      event_id: z.number().optional().describe("Event ID where the title change occurred"),
    },
    safe(async ({ id, ...body }) => ok(await client.post(`/api/championships/${id}/award`, body)))
  );

  server.tool(
    "vacate_title",
    "Vacate a championship (remove the current holder without awarding to someone else).",
    { id: z.number().describe("Championship ID (required)") },
    safe(async ({ id }) => ok(await client.post(`/api/championships/${id}/vacate`)))
  );

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  WRITE TOOLS — EVENTS & MATCHES (9)                                     ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  server.tool(
    "create_event",
    "Create a new event (weekly show, PPV, special event, or draft).",
    {
      name: z.string().describe("Event name (required)"),
      brand_id: z.number().optional().describe("Brand ID"),
      show_template_id: z.number().optional().describe("Show template ID for match slot structure"),
      season_id: z.number().optional().describe("Season ID"),
      event_type: z.string().optional().describe("Type (Weekly Show, PPV, Special Event, Draft)"),
      event_date: z.string().optional().describe("Date string (YYYY-MM-DD)"),
      arena: z.string().optional().describe("Arena name"),
      city: z.string().optional().describe("City name"),
      week_number: z.number().optional().describe("Week number in the season"),
      status: z.string().optional().describe("Status (Upcoming, In Progress, Completed)"),
      notes: z.string().optional().describe("Event notes"),
    },
    safe(async (params) => ok(await client.post("/api/events", params)))
  );

  server.tool(
    "update_event",
    "Update an event's properties. Only include fields you want to change.",
    {
      id: z.number().describe("Event ID (required)"),
      name: z.string().optional().describe("Event name"),
      brand_id: z.number().optional().describe("Brand ID"),
      show_template_id: z.number().optional().describe("Show template ID"),
      season_id: z.number().optional().describe("Season ID"),
      event_type: z.string().optional().describe("Type"),
      event_date: z.string().optional().describe("Date string"),
      arena: z.string().optional().describe("Arena name"),
      city: z.string().optional().describe("City name"),
      week_number: z.number().optional().describe("Week number"),
      status: z.string().optional().describe("Status"),
      notes: z.string().optional().describe("Event notes"),
    },
    safe(async ({ id, ...body }) => ok(await client.put(`/api/events/${id}`, body)))
  );

  server.tool(
    "delete_event",
    "Delete an event and all its matches.",
    { id: z.number().describe("Event ID") },
    safe(async ({ id }) => ok(await client.del(`/api/events/${id}`)))
  );

  server.tool(
    "create_match",
    "Add a match to an event's card.",
    {
      event_id: z.number().describe("Event ID to add the match to (required)"),
      match_type: z.string().optional().describe("Match type (Singles, Tag Team, Triple Threat, etc.)"),
      match_position: z.string().optional().describe("Card position (Opener, Midcard, Co-Main, Main Event)"),
      match_order: z.number().optional().describe("Order on the card"),
      championship_id: z.number().optional().describe("Championship on the line (null if non-title)"),
      notes: z.string().optional().describe("Match notes"),
      season_id: z.number().optional().describe("Season ID"),
      brand_id: z.number().optional().describe("Brand ID"),
      participant_ids: z.array(z.object({
        superstar_id: z.number(),
        team_number: z.number().optional(),
      })).optional().describe("Array of participants with optional team numbers"),
    },
    safe(async ({ event_id, ...body }) => ok(await client.post(`/api/events/${event_id}/matches`, body)))
  );

  server.tool(
    "update_match",
    "Update match details (type, position, notes). For recording results, use record_match_result instead.",
    {
      id: z.number().describe("Match ID (required)"),
      match_type: z.string().optional().describe("Match type"),
      match_position: z.string().optional().describe("Card position"),
      match_order: z.number().optional().describe("Order on the card"),
      championship_id: z.number().optional().describe("Championship on the line"),
      notes: z.string().optional().describe("Match notes"),
      season_id: z.number().optional().describe("Season ID"),
      brand_id: z.number().optional().describe("Brand ID"),
    },
    safe(async ({ id, ...body }) => ok(await client.put(`/api/matches/${id}`, body)))
  );

  server.tool(
    "delete_match",
    "Remove a match from an event's card.",
    { id: z.number().describe("Match ID") },
    safe(async ({ id }) => ok(await client.del(`/api/matches/${id}`)))
  );

  server.tool(
    "add_match_participant",
    "Add a superstar to a match.",
    {
      match_id: z.number().describe("Match ID (required)"),
      superstar_id: z.number().describe("Superstar ID to add (required)"),
      team_number: z.number().optional().describe("Team number (for tag/multi-person matches)"),
    },
    safe(async ({ match_id, ...body }) => ok(await client.post(`/api/matches/${match_id}/participants`, body)))
  );

  server.tool(
    "record_match_result",
    "Record the result of a match. Sets winners, losers, method, and rating.",
    {
      match_id: z.number().describe("Match ID (required)"),
      winner_ids: z.array(z.number()).optional().describe("Array of winning superstar IDs"),
      loser_ids: z.array(z.number()).optional().describe("Array of losing superstar IDs"),
      draw_ids: z.array(z.number()).optional().describe("Array of draw superstar IDs"),
      win_method: z.string().optional().describe("Win method (Pinfall, Submission, Count Out, DQ, No Contest)"),
      rating: z.number().optional().describe("Match rating"),
      notes: z.string().optional().describe("Result notes"),
    },
    safe(async ({ match_id, ...body }) => ok(await client.post(`/api/matches/${match_id}/result`, body)))
  );

  server.tool(
    "remove_match_participant",
    "Remove a superstar from a match.",
    {
      match_id: z.number().describe("Match ID (required)"),
      superstar_id: z.number().describe("Superstar ID to remove (required)"),
    },
    safe(async ({ match_id, superstar_id }) => ok(await client.del(`/api/matches/${match_id}/participants/${superstar_id}`)))
  );

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  WRITE TOOLS — RIVALRIES (5)                                            ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  server.tool(
    "create_rivalry",
    "Create a new rivalry between superstars.",
    {
      name: z.string().describe("Rivalry name (required)"),
      brand_id: z.number().describe("Brand ID (required)"),
      season_id: z.number().optional().describe("Season ID"),
      status: z.string().optional().describe("Status (Building, Active, Climax, Resolved) — default: Active"),
      intensity: z.string().optional().describe("Intensity (Low, Medium, High, Very High) — default: Low"),
      rivalry_type: z.string().optional().describe("Type (1v1, 2v2) — default: 1v1"),
      slot_number: z.number().optional().describe("Rivalry slot number"),
      notes: z.string().optional().describe("Rivalry notes"),
      participant_ids: z.array(z.object({
        superstar_id: z.number(),
        role: z.string().optional(),
      })).optional().describe("Array of participants with optional roles"),
    },
    safe(async (params) => ok(await client.post("/api/rivalries", params)))
  );

  server.tool(
    "update_rivalry",
    "Update a rivalry's properties. Only include fields you want to change.",
    {
      id: z.number().describe("Rivalry ID (required)"),
      name: z.string().optional().describe("Rivalry name"),
      brand_id: z.number().optional().describe("Brand ID"),
      season_id: z.number().optional().describe("Season ID"),
      status: z.string().optional().describe("Status (Building, Active, Climax, Resolved)"),
      intensity: z.string().optional().describe("Intensity (Low, Medium, High, Very High)"),
      rivalry_type: z.string().optional().describe("Type (1v1, 2v2)"),
      slot_number: z.number().optional().describe("Rivalry slot number"),
      notes: z.string().optional().describe("Rivalry notes"),
    },
    safe(async ({ id, ...body }) => ok(await client.put(`/api/rivalries/${id}`, body)))
  );

  server.tool(
    "delete_rivalry",
    "Soft-delete a rivalry (sets status to Resolved).",
    { id: z.number().describe("Rivalry ID") },
    safe(async ({ id }) => ok(await client.del(`/api/rivalries/${id}`)))
  );

  server.tool(
    "add_rivalry_participant",
    "Add a superstar to a rivalry.",
    {
      rivalry_id: z.number().describe("Rivalry ID (required)"),
      superstar_id: z.number().describe("Superstar ID to add (required)"),
      role: z.string().optional().describe("Participant role"),
    },
    safe(async ({ rivalry_id, ...body }) => ok(await client.post(`/api/rivalries/${rivalry_id}/participants`, body)))
  );

  server.tool(
    "remove_rivalry_participant",
    "Remove a superstar from a rivalry.",
    {
      rivalry_id: z.number().describe("Rivalry ID (required)"),
      superstar_id: z.number().describe("Superstar ID to remove (required)"),
    },
    safe(async ({ rivalry_id, superstar_id }) => ok(await client.del(`/api/rivalries/${rivalry_id}/participants/${superstar_id}`)))
  );

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  WRITE TOOLS — TAG TEAMS (6)                                            ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  server.tool(
    "create_tag_team",
    "Create a new tag team or stable.",
    {
      name: z.string().describe("Team name (required)"),
      team_type: z.string().describe("Type (Tag Team, Stable, Mixed Tag) — required"),
      brand_id: z.number().optional().describe("Brand ID"),
      status: z.string().optional().describe("Status (default: Active)"),
      parent_team_id: z.number().optional().describe("Parent team ID (for sub-units of stables)"),
      notes: z.string().optional().describe("Team notes"),
      member_ids: z.array(z.object({
        superstar_id: z.number(),
        role: z.string().optional().describe("member or manager (default: member)"),
      })).optional().describe("Array of members with optional roles"),
    },
    safe(async (params) => ok(await client.post("/api/tag-teams", params)))
  );

  server.tool(
    "update_tag_team",
    "Update a tag team's properties. Only include fields you want to change.",
    {
      id: z.number().describe("Tag team ID (required)"),
      name: z.string().optional().describe("Team name"),
      team_type: z.string().optional().describe("Type (Tag Team, Stable, Mixed Tag)"),
      brand_id: z.number().optional().describe("Brand ID"),
      status: z.string().optional().describe("Status"),
      parent_team_id: z.number().optional().describe("Parent team ID"),
      notes: z.string().optional().describe("Team notes"),
    },
    safe(async ({ id, ...body }) => ok(await client.put(`/api/tag-teams/${id}`, body)))
  );

  server.tool(
    "delete_tag_team",
    "Soft-delete a tag team (sets status to Disbanded).",
    { id: z.number().describe("Tag team ID") },
    safe(async ({ id }) => ok(await client.del(`/api/tag-teams/${id}`)))
  );

  server.tool(
    "add_team_member",
    "Add a superstar to a tag team or stable.",
    {
      tag_team_id: z.number().describe("Tag team ID (required)"),
      superstar_id: z.number().describe("Superstar ID to add (required)"),
      role: z.string().optional().describe("Role: member or manager (default: member)"),
    },
    safe(async ({ tag_team_id, ...body }) => ok(await client.post(`/api/tag-teams/${tag_team_id}/members`, body)))
  );

  server.tool(
    "update_team_member",
    "Update a team member's role (member or manager).",
    {
      tag_team_id: z.number().describe("Tag team ID (required)"),
      superstar_id: z.number().describe("Superstar ID (required)"),
      role: z.string().describe("New role: member or manager (required)"),
    },
    safe(async ({ tag_team_id, superstar_id, ...body }) => ok(await client.put(`/api/tag-teams/${tag_team_id}/members/${superstar_id}`, body)))
  );

  server.tool(
    "remove_team_member",
    "Remove a superstar from a tag team or stable.",
    {
      tag_team_id: z.number().describe("Tag team ID (required)"),
      superstar_id: z.number().describe("Superstar ID to remove (required)"),
    },
    safe(async ({ tag_team_id, superstar_id }) => ok(await client.del(`/api/tag-teams/${tag_team_id}/members/${superstar_id}`)))
  );

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  WRITE TOOLS — SESSION LOG (3)                                          ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  server.tool(
    "create_session_entry",
    "Create a new session log entry (CCO notes, storyline updates, booking decisions, etc.).",
    {
      title: z.string().describe("Entry title (required)"),
      entry_type: z.string().describe("Type (required): gm_notes, results_summary, storyline_update, locker_room, booking_decision, callup_watch, cco_mandate"),
      brand_id: z.number().optional().describe("Brand ID"),
      season_id: z.number().optional().describe("Season ID"),
      week_number: z.number().optional().describe("Week number"),
      event_id: z.number().optional().describe("Related event ID"),
      tagline: z.string().optional().describe("Short tagline/summary"),
      content: z.string().optional().describe("Full entry content (markdown supported)"),
    },
    safe(async (params) => ok(await client.post("/api/session-log", params)))
  );

  server.tool(
    "update_session_entry",
    "Update a session log entry. Only include fields you want to change.",
    {
      id: z.number().describe("Session log entry ID (required)"),
      title: z.string().optional().describe("Entry title"),
      entry_type: z.string().optional().describe("Type"),
      brand_id: z.number().optional().describe("Brand ID"),
      season_id: z.number().optional().describe("Season ID"),
      week_number: z.number().optional().describe("Week number"),
      event_id: z.number().optional().describe("Related event ID"),
      tagline: z.string().optional().describe("Short tagline/summary"),
      content: z.string().optional().describe("Full entry content"),
    },
    safe(async ({ id, ...body }) => ok(await client.put(`/api/session-log/${id}`, body)))
  );

  server.tool(
    "delete_session_entry",
    "Delete a session log entry.",
    { id: z.number().describe("Session log entry ID") },
    safe(async ({ id }) => ok(await client.del(`/api/session-log/${id}`)))
  );

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  WRITE TOOLS — BRANDS, SEASONS, GUIDES (6)                             ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  server.tool(
    "update_brand",
    "Update a brand's properties. Only include fields you want to change.",
    {
      id: z.number().describe("Brand ID (required)"),
      name: z.string().optional().describe("Brand name"),
      color: z.string().optional().describe("Brand color (hex code)"),
      day_of_week: z.string().optional().describe("Broadcast day"),
      flagship_show: z.string().optional().describe("Flagship show name"),
      brand_type: z.string().optional().describe("Brand type"),
      gm_name: z.string().optional().describe("General Manager name"),
      active: z.number().optional().describe("1 for active, 0 for inactive"),
      notes: z.string().optional().describe("Brand notes"),
    },
    safe(async ({ id, ...body }) => ok(await client.put(`/api/brands/${id}`, body)))
  );

  server.tool(
    "create_season",
    "Create a new season.",
    {
      name: z.string().describe("Season name (required)"),
      start_date: z.string().optional().describe("Start date (YYYY-MM-DD)"),
      end_date: z.string().optional().describe("End date (YYYY-MM-DD)"),
      is_current: z.boolean().optional().describe("Set as current season (auto-clears other seasons)"),
    },
    safe(async (params) => ok(await client.post("/api/seasons", params)))
  );

  server.tool(
    "update_season",
    "Update a season's properties. Only include fields you want to change.",
    {
      id: z.number().describe("Season ID (required)"),
      name: z.string().optional().describe("Season name"),
      start_date: z.string().optional().describe("Start date (YYYY-MM-DD)"),
      end_date: z.string().optional().describe("End date (YYYY-MM-DD)"),
      is_current: z.boolean().optional().describe("Set as current season"),
    },
    safe(async ({ id, ...body }) => ok(await client.put(`/api/seasons/${id}`, body)))
  );

  server.tool(
    "create_guide",
    "Create a new guide (protocol, GM guide, or CCO document).",
    {
      title: z.string().describe("Guide title (required)"),
      slug: z.string().describe("URL slug — must be unique (required)"),
      category: z.string().describe("Category: protocol, gm-guide, or cco (required)"),
      brand_id: z.number().optional().describe("Brand ID (for brand-specific guides)"),
      content: z.string().optional().describe("Guide content (markdown)"),
      sort_order: z.number().optional().describe("Sort order (default: 99)"),
    },
    safe(async (params) => ok(await client.post("/api/guides", params)))
  );

  server.tool(
    "update_guide",
    "Update a guide. Only include fields you want to change.",
    {
      slug: z.string().describe("Guide slug (required)"),
      title: z.string().optional().describe("Guide title"),
      category: z.string().optional().describe("Category: protocol, gm-guide, or cco"),
      brand_id: z.number().optional().describe("Brand ID"),
      content: z.string().optional().describe("Guide content (markdown)"),
      sort_order: z.number().optional().describe("Sort order"),
    },
    safe(async ({ slug, ...body }) => ok(await client.put(`/api/guides/${slug}`, body)))
  );

  server.tool(
    "delete_guide",
    "Delete a guide.",
    { slug: z.string().describe("Guide slug") },
    safe(async ({ slug }) => ok(await client.del(`/api/guides/${slug}`)))
  );

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  UTILITY TOOLS (2)                                                      ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  server.tool(
    "get_schema",
    "Return the full KayFlux database schema (table names, columns, types). Useful for understanding the data model before running ad-hoc queries.",
    {},
    safe(async () => ok(await client.get("/api/schema")))
  );

  server.tool(
    "query",
    "Execute a read-only SQL SELECT query for ad-hoc analytics. Only SELECT statements are allowed — INSERT/UPDATE/DELETE are rejected server-side. Use get_schema first to see available tables and columns.",
    {
      sql: z.string().describe("A valid SQLite SELECT statement (required)"),
    },
    safe(async ({ sql }) => ok(await client.post("/api/query", { sql })))
  );
}
