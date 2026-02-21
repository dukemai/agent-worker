---
name: brainstorm
description: Structured brainstorming process to turn vague ideas into clear problem definitions and solution directions. Use when the user presents a new idea, wants to explore a concept, or needs help figuring out what to build and why.
---

# Brainstorm

Structured process for taking a vague idea and turning it into a clear problem statement, solution direction, and decision to act. Used as input to the `project-plan` skill.

## Step 1: Understand the Problem

Before discussing solutions, understand what is actually broken or missing.

### Questions to ask

1. **What triggered this idea?** What happened that made you think of this? (A frustration, a task that took too long, something you saw someone else do?)
2. **Who is this for?** Name the specific person and situation. ("Me, on my phone, while watching the kids" is better than "users".)
3. **What do you do today without this?** Walk through the current workflow step by step — even if it's manual, messy, or nonexistent.
4. **What's the pain?** What specifically is bad about the current state? (Too slow, too many steps, easy to forget, unreliable, ugly?)
5. **How often does this come up?** Daily, weekly, occasionally? Frequency drives priority.

### Output

A problem statement in this format:

```
**Who**: [specific person and context]
**Situation**: [when/where this comes up]
**Current approach**: [what they do today]
**Pain**: [what's wrong with the current approach]
**Frequency**: [how often]
```

## Step 2: Explore Alternatives

Before building, understand what already exists and why it doesn't work.

### Questions to ask

1. **Have you tried any existing tools for this?** Apps, spreadsheets, notes, reminders, services?
2. **What do other people use?** Search for how others solve this problem. Name 2-3 alternatives.
3. **What do those alternatives get right?** Be specific — what part of the experience works?
4. **What do they get wrong?** Where do they fall short for your specific situation?
5. **Is the gap a missing feature, a UX problem, or a context problem?** (Missing feature = it doesn't do X. UX problem = it does X but it's painful. Context problem = it does X but doesn't fit my workflow/device/life.)

### Output

A short landscape summary:

```
### Alternatives
| Alternative | What it does well | Where it falls short |
|-------------|-------------------|---------------------|
| [Tool 1]    | [strength]        | [gap]               |
| [Tool 2]    | [strength]        | [gap]               |
| [Do nothing]| [no effort]       | [pain continues]    |

### Gap analysis
The core gap is: [one sentence describing what no alternative covers]
```

## Step 3: Define the Target

Now that the problem and landscape are clear, define what a solution looks like.

### Questions to ask

1. **If this worked perfectly, what would your day look like?** Describe the ideal scenario in concrete terms.
2. **What is the smallest version that would be useful?** Strip away nice-to-haves. What is the core action?
3. **Where does this fit in your existing tools/workflow?** Standalone app, part of an existing dashboard, an email, a notification?
4. **What should it NOT do?** Explicit boundaries prevent scope creep.

### Output

A target statement:

```
**Ideal outcome**: [what changes for the user]
**Minimum viable version**: [smallest useful thing to build]
**Where it lives**: [standalone / integrated into X / email / notification]
**Out of scope**: [what we explicitly will not build in v1]
```

## Step 4: Converge

The brainstorm must end with a clear direction, not an open-ended pile of notes.

### Synthesize

Combine the outputs from Steps 1-3 into a single decision statement:

```
**We will build**: [one sentence — what it is]
**Because**: [the core pain it addresses]
**For**: [who, in what context]
**Starting with**: [the minimum viable version]
**It fits into**: [where it lives in the existing system]
```

### Confirm with the user

Present the decision statement and ask: "Does this capture what you want to build?" Only proceed to planning after confirmation.

### What happens next

- If confirmed: hand off to the [project-plan](.cursor/skills/project-plan/SKILL.md) skill (Phase 1: Collect Requirements already has a foundation from this brainstorm).
- If partially right: iterate on the specific part that's off. Do not restart the whole brainstorm.
- If fundamentally wrong: return to Step 1 with the new understanding.

## Rules

- **Explore before proposing.** Do not jump to "here's what we should build" before completing Steps 1-2.
- **Ask, don't assume.** If the user says "I want a reminder system," ask what's wrong with the one they have before designing a new one.
- **Cap the exploration.** Steps 1-3 should take 5-10 questions total, not 30. If the idea is still vague after 10 questions, the problem isn't well-defined enough — say so.
- **Name real alternatives.** "There might be apps for this" is not useful. Search for or name specific tools.
- **One brainstorm, one direction.** If multiple ideas emerge, pick the highest-priority one and park the rest. Do not try to brainstorm three things in parallel.
