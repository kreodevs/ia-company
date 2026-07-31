# User manual — Your virtual office with AI agents

Welcome. This guide explains **how to run your virtual company**: request work, create departments, build agent teams, connect products, and collect deliverables. No programming or infrastructure knowledge required.

---

## Quick start (Office)

If you just logged in, start here. You can complete your **first job in five minutes**.

### Step 1 — Open the Office

After sign-in, open **Home** in the sidebar (your **Office**). You will see the **Coordinator** chat — your single entry point to the whole agent team.

### Step 2 — Say what you need

Write in plain language, as you would to a project lead:

- *“Research whether a invoicing SaaS for freelancers in Mexico makes sense”*
- *“Draft three LinkedIn posts for our product launch”*
- *“Review competitor X’s pricing proposal”*

You can also use **Quick services**: ready-made templates (discovery, idea validation, feature sprint…) that you can edit before launching.

### Step 3 — Choose scope (optional)

Before approving, you can set:

- **General exploration** — no specific product; ideal for new ideas.
- **A product** — the team uses that product’s context.
- **A department** — the team uses that department’s agents, style, and deliverable pipeline (e.g. Marketing or Product Studio).

### Step 4 — Review and approve

The Coordinator proposes a **team plan**: which agents join, what they will deliver, estimated time and cost. If it looks good, click **Approve and run**. Nothing runs until you authorize it.

### Step 5 — Follow progress and collect results

- While running: open **War room** for live status.
- When done: go to **My jobs** for the summary and documents.

> **Remember:** by default everything is **on demand**. Nothing runs until you request and approve it.

---

## Table of contents

1. [Quick start (Office)](#quick-start-office)
2. [What your virtual office is](#what-your-virtual-office-is)
3. [How to ask agents for work](#how-to-ask-agents-for-work)
4. [My jobs: receiving results](#my-jobs-receiving-results)
5. [War room: follow work live](#war-room-follow-work-live)
6. [Products and opportunities](#products-and-opportunities)
7. [Virtual departments](#virtual-departments)
8. [Create and configure agents](#create-and-configure-agents)
9. [Skills](#skills)
10. [Workflows](#workflows)
11. [Connect departments, products, and teams](#connect-departments-products-and-teams)
12. [Memory and consensus](#memory-and-consensus)
13. [Automatic schedules (optional)](#automatic-schedules-optional)
14. [Decisions that need your OK](#decisions-that-need-your-ok)
15. [Organization settings](#organization-settings)
16. [Human team and permissions](#human-team-and-permissions)
17. [Frequently asked questions](#frequently-asked-questions)

---

## What your virtual office is

Imagine a company where each “employee” is an AI specialist: strategy, product, design, code, marketing, finance, quality… They share context and work under a **Coordinator** who assembles the team based on what you ask.

You **commission**, **approve**, and **decide**. Agents **research, write, design, and execute** within the limits you configure.

### Main pieces

| Piece | What it’s for |
|-------|----------------|
| **Office (Home)** | Ask the Coordinator and launch jobs |
| **My jobs** | Inbox of finished work with reports and documents |
| **War room** | Live tactical view while the team works |
| **Products** | Portfolio of ideas and real products to operate on |
| **Departments** | Specialized virtual teams (marketing, product studio, etc.) |
| **Workflows** | Reusable agent sequences |
| **AI team** | Agent/skill catalog and **Catalog Studio** (LLM-assisted create) |
| **Consensus** | Shared company and product memory |

### Three ways to work

| Mode | When to use it |
|------|----------------|
| **On demand** | Daily use. You ask, review the plan, approve. *(Default)* |
| **Scheduled tasks** | You want certain tasks on a fixed calendar (e.g. market scan every Saturday) |
| **Autonomous mode** | Continuous cycle with less intervention. Enable only after you know the manual flow |

---

## How to ask agents for work

### Talk to the Coordinator

The Coordinator is your **chief of staff**: understands your request, picks specialists, estimates effort, and shows a plan before anyone starts.

**Tips for good requests:**

- Be **specific** about the outcome (*“3 LinkedIn posts”* beats *“do marketing”*).
- Name **audience, market, or product** when relevant.
- State **deliverable format** (report, copy, design, code, deck).
- Mention constraints (brand tone, deadlines, competitors to avoid) up front.

### Quick services

Shortcuts with pre-built prompts: market discovery, idea evaluation, feature sprint, launch review… Pick one, tweak the text if needed, then follow the same approval flow.

### Choose scope before running

| Scope | Effect |
|-------|--------|
| General exploration | Team researches without anchoring to a product |
| Specific product | Deliverables use that product’s memory, code, and context |
| Department | That department’s agents and rules apply; artifacts go to its gallery |

### Approve or adjust

When you see the Coordinator’s proposal, check:

- Are the agents the right fit?
- Does the deliverable match what you asked?
- Do estimated cost and time feel reasonable?

If something is off, chat again to **adjust the plan** before approving.

---

## My jobs: receiving results

**My jobs** is your outbox. Each row is work you commissioned that finished (or failed).

Inside each job:

- **Summary** — what the team did and main conclusions.
- **Documents** — reports, copy, designs, or other generated files.

Use this view to **archive, share with your human team, or commission follow-up** in the Office (*“Based on the last report, draft the landing page”*).

---

## War room: follow work live

The **War room** is a product’s operations room. It shows:

- **Tactical table** — which agent is active, waiting, or done.
- **Embedded Coordinator** — commission extra work without leaving the room.
- **Pipeline radar** — overall product status.
- **Recent runs** — quick history.
- **Department artifacts** — if the product is linked to a department.

Open War room from **Products** (product button) or from **Activity** while a job is running.

---

## Products and opportunities

In **Products** you manage your portfolio in two tabs:

### Opportunities

Ideas from discovery or added manually. For each you can:

- **Evaluate** — team analyzes viability and proposes GO or NO-GO.
- **Reject** — discard without creating a product.
- **Promote to active product** — if evaluation is positive.

### Active products

Real products you operate day to day. From each product you reach:

- **War room** — live operations.
- **Settings** — product data, GitHub link, linked department, OpenCode (code delegation).
- **Memory** — product-specific consensus.

### Add a product

**Register an existing repository** (GitHub URL) or **create a new workspace** for the team to start fresh.

### Focus a product

Mark a product as **focused** so Office and War room prefer it by default.

---

## Virtual departments

A **department** is a virtual business unit: marketing agency, product studio, content team, etc. Each department has:

- **Its own agents** (or AI-suggested ones at creation).
- **Configuration** — form for brand, tone, channels, etc.
- **design.md** — visual and style guide, generated or edited.
- **Artifact gallery** — copy, posts, designs, reports from the team.
- **Work items** — linked client, campaign, or project slots.

### Create a department with Org Studio

1. Go to **Departments** → **Open Org Studio**.
2. **Step 1** — Pick a template (marketing agency, product studio, sales & RevOps, customer success, SEO & content, finance & pricing, custom…), name and mission.
3. Click **Generate proposal**. AI suggests agents, config, and a design.md preview.
4. **Step 2** — Review the proposal. **Munger** (risk control) may **VETO** if it finds fatal flaws; adjust mission or template.
5. Optional: check **Create linked work item** to open a product/client slot at the same time.
6. Click **Create department**.

### Run an existing department

On the department page:

- **Configuration** — save brand, goals, channel changes.
- **design.md** — view or sync the style guide.
- **Gallery** — review deliverables; filter, change status (draft, approved, published).
- **Launch department work** — write a brief and pick a linked product; the department team runs on that context.

---

## Create and configure agents

**Agents** are your virtual specialists. Each has persona, AI model, temperature, and linked **skills**.

### Where to manage them

Sidebar **Your office** → **AI team** (`/ai-team`).

Three ways to grow the catalog:

1. **Manual** — **Agents** tab → **New agent**.
2. **Catalog Studio** — **Create agent** tab: describe the role; AI proposes reuse or a new draft; **you approve** before anything is created.
3. **Org Studio** — when creating a department, AI suggests agents aligned to the template and mission.

*(If you don’t see AI team, your role may be member-only; ask an admin to create or adjust agents.)*

### Create an agent (manual)

1. Click **New agent**.
2. Set **name** and **persona** (how they think and speak: strategist, writer, devops…).
3. Optional: **Improve with AI** — write a brief and AI prefills the draft (edit before saving).
4. Choose **model** and **temperature** (more creative vs. more precise).
5. Assign **skills** that extend what they can do.
6. Save.

### Catalog Studio (create agent with AI)

1. **AI team** → **Create agent**.
2. Describe the role you need in plain language.
3. Review the proposal: **reuse** an existing agent or a new draft.
4. **Munger** runs a pre-mortem; a VETO blocks apply.
5. Check **I approve creating this agent** (and each new skill, if any).
6. Click **Approve and apply** — nothing is created without your explicit checkbox.

### When to create new agents

- You need a role no one in the catalog covers.
- You want a variant with different tone (e.g. “Formal B2B copy” vs. “Startup casual copy”).
- A department needs dedicated specialists.
- The **Coordinator** flags a missing role — deep link to **Create agent** with a prefilled brief.

Catalog agents can be used in **Workflows**, **Coordinator** jobs, and **departments**.

---

## Skills

**Skills** are reusable capabilities: deep research, SEO audit, financial modeling, landing design… An agent can have several skills; a skill can attach to several agents.

### Where to manage them

**Your office** → **AI team** → **Skills** tab (manual) or **Create skill** (Catalog Studio with AI).

### Create a skill (manual)

1. **New skill** → clear name (*“Onboarding UX audit”*).
2. Optional: **Improve with AI** to generate description and prompt from a brief.
3. Describe **when to use it** and **what it should deliver**.
4. Save and **attach it to agents** that need it.

### Catalog Studio (create skill with AI)

Same flow as agents: brief → proposal (reuse or new) → Munger → **explicit approval** → apply.

When creating a **department** in Org Studio, missing tenant skills appear as checkboxes you must approve before the dept is created.

### Good practices

- Name for outcomes, not internal tools.
- One skill = one recognizable type of work.
- **Reuse** before duplicating — Catalog Studio prefers what you already have.

---

## Workflows

A **workflow** is an **ordered chain of agents**: e.g. Research → CEO → Product → Code → QA.

### Where to create them

**Workflows** under **Your office** in the sidebar.

### Create a workflow

1. **New workflow** → name and description.
2. Open the **visual editor** and drag agent nodes.
3. Connect execution order.
4. **Save**.

### Use a workflow

- The **Coordinator** may pick workflows for complex jobs.
- You can **run a workflow directly** from the editor with a task seed (starting text).
- In **Schedules**, a rule can trigger a specific workflow on a date.

Think of workflows as **playbooks**: processes you want to repeat with the same team.

---

## Connect departments, products, and teams

How the pieces fit:

```
You (Office)
    ↓ job + scope
Coordinator → picks agents / workflow / department
    ↓
Product (context, memory, code)
    ↔ linked to → Department (agents, design.md, artifacts)
    ↓
War room (tracking) → My jobs (deliverables)
```

### Link product ↔ department

1. Open **Product settings**.
2. **Department** section → choose the department.
3. Save.

From then on:

- Jobs scoped to that department use its team and style.
- Run **artifacts** may appear in the **department gallery**.
- From the department you can **launch runs** choosing that product as work item.

### Work items in a department

A department can have **multiple work items** (clients, campaigns, projects). Each usually maps to a **linked product**. Create them on the department page or when creating the department in Org Studio.

### Agents ↔ Workflows ↔ Departments

| You want… | Do this |
|-----------|---------|
| Agents only for Marketing | Create or assign them when building the dept. in Org Studio |
| Same process every time | Define a **Workflow** and use it in jobs or schedules |
| Unified brand deliverables | Configure the dept. + **design.md** + copy/design skills on agents |

---

## Memory and consensus

Agents need **shared context** so they don’t contradict each other.

### Company memory

In **Consensus** (debug menu) you edit the global document: mission, principles, priority markets, strategic decisions. The whole team reads it when planning.

### Product memory

Each product has **its own memory**: positioning, agreed pricing, feature decisions, discovery learnings.

**Tip:** after an important job, ask the Coordinator to **summarize decisions into consensus** or update product memory yourself.

---

## Automatic schedules (optional)

By default **there is no automation**: you command. For recurring tasks:

1. Go to **Settings** → **Schedules** tab.
2. Review the **Operations plan**. The **On demand** preset has no rules (recommended at first).
3. For a light automatic pilot, pick a preset like **Discovery only** or create a **fixed rule**: which workflow or task, how often, and conditions.

You can also preview the calendar under **Ops** (debug menu).

> Master manual jobs from the Office first. Add schedules when you know exactly what should repeat on its own.

---

## Decisions that need your OK

Under **Decisions** (debug menu) you see proposals the team cannot close alone: launch product, change pricing, strategic pivot…

Each card summarizes the proposal. You mark **GO** or **NO-GO**. Until you respond, the related cycle may pause.

---

## Organization settings

In **Settings** (admins) you tune the work environment:

| Tab | What you configure (plain language) |
|-----|-------------------------------------|
| **General** | Organization name and basics |
| **LLM** | AI provider and default models |
| **OpenCode** | External coding agent (if used) |
| **Integrations** | GitHub, email, etc. |
| **Notifications** | Alerts when a job finishes or fails |
| **Limits** | Monthly AI spend cap |
| **Schedules** | Operations plan and automatic rules |

**Members** without admin role use Office and products; they don’t need this daily.

---

## Human team and permissions

Under **Team** you invite real people to your organization.

| Role | What they can do |
|------|------------------|
| **Owner / Admin** | Settings, agents, workflows, schedules, invite users |
| **Member** | Office, jobs, products, war room, departments (per policy) |

Share this manual with new members so they can commission work from day one.

---

## Specialized guides

Beyond this manual, the help center includes articles with Mermaid diagrams:

| Guide | Route |
|-------|-------|
| Office and jobs | `/help/guia-oficina` |
| Products | `/help/guia-productos` |
| Departments | `/help/guia-departamentos` |
| AI team and skills | `/help/guia-equipo-ia` |
| Workflows and schedules | `/help/guia-flujos` |
| **How to build agents** | `/help/como-construir-agentes` |
| **Handoffs and flow** | `/help/handoffs` |

---

## Frequently asked questions

### Do agents run things without my permission?

Not in **on demand** mode. You always see a plan and click **Approve and run**. Automatic schedules are opt-in.

### What’s the difference between Office and War room?

- **Office** — request and plan work (any scope).
- **War room** — follow one **specific product** live and commission from there.

### Do I need a department to start?

No. You can operate with **Office + Products** only. Departments help when you want specialized teams with brand, artifacts, and dedicated agents.

### What are Munger and VETO?

A **risk review** before creating a department. If the proposal has fatal flaws (incoherent market, impossible mission…), creation is blocked until you adjust.

### Where do I see AI spend?

On the **Office** (month KPIs) and **Settings → Limits**. Each job shows estimated cost before approval.

### What if a job fails?

Open **My jobs** or **Runs** (technical view), read the error message, adjust the brief, and commission again. If it persists, check spend limits and model settings with your admin.

### Can I reuse the same workflow for different clients?

Yes. Create **work items** or **products** per client, link them to the same **department**, and run the same **workflow** or quick service with only the brief changed.

---

*Something unclear? Return to **Quick start** or ask the Coordinator in the Office: “Explain how to create a marketing department” — it will walk you through the app step by step.*
