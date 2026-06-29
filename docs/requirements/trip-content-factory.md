# Trip Content Factory

## Intent

Trip Ops content creation should evolve into a multi-angle content factory for destination knowledge. The goal is to turn raw research leads, pasted notes, scraped pages, AI drafts, and trip observations into connected story material that can be reused while planning and while traveling.

This is a follow-up to Phase 10 Trip Ops. It is paused while the Summer Activities for Kids phase takes priority.

## Product Goal

The system should help the user collect and shape travel knowledge from multiple angles:

- Planning usefulness: places, activities, logistics, booking friction, weather fit, kid energy, and nearby options.
- Story value: history, nature, culture, folklore, people, buildings, events, traditions, and local context.
- Kid engagement: missions, tactile details, things to notice, mystery hooks, and short explanations.
- On-location curiosity: connected topics that can be followed as narrative rabbit holes during a trip.

The output should be editable structured data, not one-off prose. Content should remain traceable to leads and source materials so it can be refined later.

## Current Phase Boundary

Phase 10 already has the practical Trip Ops planning surface plus AI-generated content scaffolds. The remaining content-creation direction is broader than the current phase and should resume as a later Trip Ops content phase.

When resuming, start with a lightweight capture and sorting workflow before building graph traversal or polished content publishing.

## Core Concepts

### Knowledge Items

`trip_knowledge_items` remain the durable source/document queue. They should hold raw Markdown, extraction payloads, tags, status, extraction focus, and source URL metadata.

The future direction is to stop embedding source research leads inside a knowledge item JSON blob and instead manage research leads as first-class rows.

### Research Leads

Research leads are the sandbox layer between raw sources and polished trip content. A lead can represent a place, person, event, tradition, concept, building, natural feature, mystery, or family activity hook.

Useful fields:

- `trip_id`
- optional `knowledge_item_id` provenance
- `title`
- `description`
- `source_url`
- raw notes or scraped data
- `angles`, such as `history`, `folklore`, `kids`, `nature`, `tactile`
- `target_age_group`
- `geographic_cluster`, such as `Visby Wall` or `Faro`
- workflow `status`: `backlog`, `accepted`, `converted`, `archived`
- `priority`

### Lead Connections

Research leads should be connectable into a knowledge graph. A lead can point to another lead with a typed relationship such as:

- `related_to`
- `context_for`
- `local_variant`
- `leads_to`
- `source_for`
- `kid_hook_for`

Each connection should support short notes explaining why the relationship exists.

Example: a lead about Bysen could connect to boundary stones, Swedish folklore, forest etiquette, or a specific walking route where that story becomes useful.

## Proposed Data Model

The future schema direction is:

```sql
CREATE TABLE public.trip_research_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL,
  knowledge_item_id uuid NULL,
  title text NOT NULL,
  description text NULL,
  source_url text NULL,
  raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  angles text[] NOT NULL DEFAULT '{}'::text[],
  target_age_group text NULL,
  geographic_cluster text NULL,
  status text NOT NULL DEFAULT 'backlog',
  priority int NOT NULL DEFAULT 3,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT trip_research_leads_pkey PRIMARY KEY (id),
  CONSTRAINT trip_research_leads_status_check
    CHECK (status = ANY (ARRAY['backlog', 'accepted', 'converted', 'archived']))
);

CREATE TABLE public.trip_research_lead_connections (
  parent_lead_id uuid NOT NULL,
  child_lead_id uuid NOT NULL,
  connection_type text NOT NULL DEFAULT 'related_to',
  notes text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT trip_research_lead_connections_pkey PRIMARY KEY (parent_lead_id, child_lead_id),
  CONSTRAINT trip_research_lead_connections_not_self_check CHECK (parent_lead_id <> child_lead_id)
);

CREATE INDEX IF NOT EXISTS trip_research_leads_pipeline_idx
  ON public.trip_research_leads (trip_id, geographic_cluster, status, priority);

CREATE INDEX IF NOT EXISTS trip_research_lead_connections_child_idx
  ON public.trip_research_lead_connections (child_lead_id);
```

The existing `trip_knowledge_items` table should stay as the source queue, but any nested source-lead payloads should be normalized into `trip_research_leads` when this phase resumes.

## Graph Querying

Graph traversal can use recursive CTEs to move from a current lead into connected parent/child leads:

```sql
WITH RECURSIVE lead_path AS (
  SELECT parent_lead_id, child_lead_id, connection_type, 1 AS depth
  FROM public.trip_research_lead_connections
  WHERE parent_lead_id = :current_lead_id

  UNION ALL

  SELECT c.parent_lead_id, c.child_lead_id, c.connection_type, p.depth + 1
  FROM public.trip_research_lead_connections c
  JOIN lead_path p ON c.parent_lead_id = p.child_lead_id
)
SELECT
  parent.title AS source_topic,
  child.title AS connected_topic,
  path.connection_type,
  path.depth
FROM lead_path path
JOIN public.trip_research_leads parent ON parent.id = path.parent_lead_id
JOIN public.trip_research_leads child ON child.id = path.child_lead_id;
```

## Implementation Milestones

### Stage 1: Quick-Capture Inbox

Build the lowest-friction lead intake surface first.

- Split-pane interface.
- Left rail shows backlog lead cards.
- Main pane has a lightweight Markdown editor.
- `Cmd/Ctrl+N` creates a blank lead.
- Fast buttons or hotkeys add common angles such as Kids, Folklore, History, Nature, and Tactile.
- New leads default to `backlog` so messy ideas can be captured before they are curated.

### Stage 2: Multi-Angle Sorter Board

Add a board view once capture exists.

- Columns represent content perspectives: Unsorted, Deep History, Folklore and Magic, Kid Missions, Nature, Practical Planning.
- Dragging a lead into a column updates `angles`.
- Moving a lead out of Unsorted can flip status to `accepted`.
- Cards should show geographic cluster, priority, source/provenance, and whether the lead has connected story material.

### Stage 3: Context-Aware Linker Sidebar

Add graph-building tools inside the active lead editor.

- Passive suggestions scan the current lead text, geographic cluster, and angles to suggest related leads.
- A simple Link action creates `trip_research_lead_connections` rows.
- Active mentions use `@` to fuzzy-search existing leads.
- Selecting a mention inserts a readable Markdown link and creates the graph edge in the background.

## Content Creation Workflow

The resumed phase should support this loop:

1. Capture a raw lead or source.
2. Tag it by angle and geography.
3. Accept promising leads into the active content pipeline.
4. Connect related leads into a graph.
5. Generate or draft story material from a selected bundle of leads.
6. Review, edit, and convert the result into a trip content scaffold.
7. Surface relevant content inside itinerary blocks and on-location views.

## Resume Checklist

- Confirm what content creation was last implemented in Phase 10.
- Audit existing Trip Ops migrations and types before adding the normalized lead tables.
- Decide whether this becomes a new numbered phase or a Phase 10.x follow-up.
- Start with Stage 1 inbox and lead normalization.
- Defer graph visualization until lead capture and linking are useful.
- Keep copyright hygiene: avoid copied source text, store provenance, and turn no-reproduction sources into research leads rather than polished content.

