# Magnum Artwork Compliance Platform

## 1. Scope and Sources Reviewed

### HTML screens reviewed
- `index.html` (home + compliance validator + compliance history + add-project modal)
- `compliance.html` (compliance list page)
- `projects.html` (project list + create/edit modal)
- `user.html` (user management)
- `development.html` (developer mode settings)
- `userReg.html` (user self-registration)
- `login.html` (empty; login is rendered by `auth.js`)
- `auth.js` (login, reset password, session, dev-mode behavior)

<!-- DEPRECATED NOTE:
`login.html` is no longer empty in the current implementation.
Kept above line for historical traceability as requested.
-->
- CURRENT: `login.html` contains the actual login shell/page used by localhost UI flow, while `auth.js` still handles auth/session logic.

### Real screenshots reviewed
From `/Users/ag/Desktop/AIProjectsJuly2025/Magnum/Demo_0225/Demo_ScreenShots`:
- `Screenshot 2026-02-25 at 11.15.19 AM (2).png` (home: validator + compliance history)
- `Screenshot 2026-02-25 at 11.15.27 AM (2).png` (compliance list page)
- `Screenshot 2026-02-25 at 11.15.33 AM (2).png` (project list page)
- `Screenshot 2026-02-25 at 11.15.38 AM (2).png` (new project modal)
- `Screenshot 2026-02-25 at 11.15.52 AM (2).png` (project dropdown behavior)
- `Screenshot 2026-02-25 at 11.16.35 AM (2).png` (rejection image viewer overlay)
- `Screenshot 2026-02-25 at 11.16.42 AM (2).png` (detailed compliance modal, cycle summary)
- `Screenshot 2026-02-25 at 11.16.47 AM (2).png` (detailed compliance modal, later review cycle)

## 2. Intent of the Project

Build a web app that lets internal users:
- manage users and app settings
- create and version compliance projects with reference documents and checklist files
- run artwork compliance checks against reference/checklist rules
- generate and store structured compliance results (approved/rejected/N/A)
- view report details, download review Excel files, and inspect annotated rejection images
- create new compliance checks from scratch or from prior compliance versions/re-reviews

Frontend is already built (this folder). Backend should be Python. Persistent store is Airtable.

## 3. High-Level Functional Requirements

### 3.1 User management (Settings screen)
- Admin can create users with `first_name`, `last_name`, `username(email)`, `password`, `status`.
- Admin can edit existing users (name + status).
- Users can be `active` or `in-active`.
- Last login timestamp is tracked.
- Password policy: min 8 chars, uppercase, lowercase, number, special char.

### 3.2 Project creation and management (Project screen)
- Create project with:
  - Project name
  - Status
  - Description
  - Reference document (PDF/DOCX)
  - Checklist file (XLSX)
- Edit project and keep version history using parent/child records.
- Show project list with file links, version, status, and actions.
- Deleting project also deletes its archived versions and linked compliance records.

### 3.3 Reference/checklist assignment with versioning
- Each project has canonical reference + checklist attachments.
- Compliance records copy these files into each run context.
- Re-review path preserves checklist from previous run (can lock checklist upload in UI).
- Parent-child model keeps run history and review progression.

### 3.4 Compliance checking against requirements + checklist
- Input files:
  - Artwork image (`jpg/jpeg/png`)
  - Reference document (`pdf/docx`)
  - Checklist (`xlsx`)
- Execute comparison and create checklist-item decisions:
  - `Compliant`
  - `Reject`
  - `N/A`
- Support multiple review cycles (`cycle1`, `cycle2`, `cycle3`).

### 3.5 Compliance report generation
- For each cycle, generate:
  - Summary: total/compliant/reject/na/compliance_percentage
  - Item-level result rows:
    - checklist_item
    - reference_info
    - artwork_info
    - comments
    - decision
    - optional rejection image pointers (`image`, `updated_image`)
- Store cycle response JSON in Airtable.
- Store cycle Excel outputs as attachments (`cycle_1_excel`, `cycle_2_excel`, `cycle_3_excel`).

### 3.6 Compliance record operations
- View list of records by project.
- Expand parent with child re-reviews.
- Open detailed modal report for each record.
- Download cycle Excel report(s).
- View annotation image gallery.
- Delete a compliance record (and children if parent).
- Support "new compliance", "re-review compliance", and "edit old compliance then create new version."

### 3.7 Python backend + Airtable persistence
- Backend service receives multipart form-data and processes compliance.
- Writes outputs back to Airtable record fields expected by frontend.
- Frontend currently calls endpoint pattern similar to `/artwork/check_compliance`.

### 3.8 Image annotation with `nano_banana()` and `edit_image()`
- For rejected checklist items, generate visual markups:
  - Source rejection image reference (`image`)
  - Corrected/annotated image (`updated_image`)
- Use prompt templates to instruct annotation highlights and correction comments.
- Upload generated images to Airtable annotation attachment fields by cycle.

### 3.9 Compliance decision semantics (CURRENT)
<!-- DEPRECATED NOTE:
Earlier behavior allowed value/format mismatches to influence "present" rows.
Kept older sections above for history.
-->
- If checklist row asks **"is ... present"**, evaluate **presence only**.
- Presence-only rows should respond with:
  - `Compliant` + `Yes, it is present on artwork.` when present
  - `Reject` + `No, it is not clearly present on artwork.` when not present
- If checklist row asks **"according to reference"**, **"matching according to reference"**, or **"correct according to reference"**, evaluate strict exactness:
  - value match
  - spacing/punctuation
  - case
  - required formatting cues (where applicable)
- Therefore:
  - Row 15 (nutrition present) is presence-only.
  - Row 16 (nutrition values correct according to reference) is strict.
  - Row 19 (reference intake statement present) is presence-only.
  - Row 20 (reference intake statement according to reference) is strict.

## 4. Screen-by-Screen Behavior Requirements

### Home (`index.html`)
- Project dropdown controls active context.
- Compliance dropdown supports:
  - `+ New Compliance`
  - existing compliance versions
- Upload zones:
  - Artwork (always required)
  - Reference (required for new, prefilled for existing)
  - Checklist (required for new, prefilled and optionally locked for existing)
- Actions:
  - `Check Compliance`
  - `Check New Compliance` (reset flow)
  - `Reset All`, `Reload Page`
- Show compliance history table with parent/child versions and action icons.

### Compliance list (`compliance.html`)
- Dedicated records view with project filter.
- Same action set as home history: view details, download, image viewer, delete.

### Projects (`projects.html`)
- List all projects.
- Create/edit via modal.
- File validation:
  - reference accepts `pdf/docx`
  - checklist accepts `xlsx`
- Parent-child archive version rows displayed below current parent.

### Users (`user.html`)
- Search, pagination, add/edit user.
- Add-user flow hashes password before save.

### Development (`development.html`)
- Toggle developer mode (`on/off`) from settings table.
- This controls right-click/devtools restrictions enforced by `auth.js`.

### Registration (`userReg.html`) and Login (`auth.js`)
- Registration creates active user with hashed password.
- Login modal, password reset, session timeout tracking.

## 5. Backend Implementation Guide (Python)

## 5.1 Required API contract

### Endpoint
- `POST /artwork/check_compliance`

### Request (multipart/form-data)
- `artwork_file` (binary image)
- `reference_file` (binary pdf/docx)
- `checklist_file` (binary xlsx)
- `cycle` (`cycle1` | `cycle2` | `cycle3`)
- `artwork_id` (Airtable record ID)

### Response
- `200` with processed summary JSON (optional for UI; Airtable update is the source of truth)
- Non-200 on processing failure

## 5.2 Processing pipeline
- Validate file types and max size.
- Parse checklist rows from XLSX.
- Extract text/structured data from reference document.
- Extract OCR/text/label regions from artwork image.
- Evaluate each checklist rule.
- Build response JSON:
  - `summary` + `results[]` format used by frontend.
- For `Reject` items:
  - call `nano_banana()` and/or `edit_image()` with prompts
  - create `image`/`updated_image` outputs
- Build cycle Excel file.
- Patch Airtable record:
  - `cycleN_response`
  - `cycle_N_excel`
  - `artwork_annotation_N`
  - `updated_at`

## 5.3 Prompting pattern for annotations
- Prompt should include:
  - checklist item text
  - detected mismatch details
  - exact area to highlight
  - expected corrected content
- Store both:
  - original issue visualization
  - corrected recommendation visualization

## 5.4 Error handling rules
- If backend fails after record creation:
  - keep record
  - write error message in a dedicated response field or fallback comment entry
- Idempotency:
  - key by `artwork_id + cycle`
- Log trace IDs for each compliance run.

## 5.5 Deployment notes
- Keep Airtable API key server-side only.
- Move hardcoded keys from frontend into backend proxy layer.
- Add retry/backoff for Airtable patch/upload failures.

## 6. Airtable Schema Definition

Use the following schema (aligned with current frontend field usage).

### Table: `magnum_user`

| Column | Airtable Type | Required | Notes |
|---|---|---|---|
| `username` | Email | Yes | Login identifier |
| `password` | Single line text | Yes | Store hashed value only |
| `first_name` | Single line text | Yes | |
| `last_name` | Single line text | No | |
| `status` | Single select (`active`, `in-active`) | Yes | Controls login access |
| `created_at` | Date/time | Yes | ISO timestamp |
| `updated_at` | Date/time | No | Set on edit |
| `last_login_at` | Date/time | No | Set on successful login |

### Table: `magnum_setting`

| Column | Airtable Type | Required | Notes |
|---|---|---|---|
| `name` | Single line text | Yes | Setting label |
| `setting_name` | Single line text | No | Optional alias (legacy compatibility) |
| `description` | Long text | No | |
| `development_mode` | Single select (`on`, `off`) | Yes | Used by `auth.js` |
| `created_at` | Date/time | No | |
| `updated_at` | Date/time | No | |

### Table: `magnum_projects`

| Column | Airtable Type | Required | Notes |
|---|---|---|---|
| `project_name` | Single line text | Yes | |
| `description` | Long text | Yes | |
| `status` | Single select (`active`, `in-active`) | Yes | |
| `version` | Number (integer) | Yes | Project version |
| `is_parent` | Single select (`yes`, `no`) | Yes | Parent row vs archived version |
| `parent_id` | Single line text | No | Parent Airtable record id |
| `reference_document_name` | Single line text | Yes | file name label |
| `checklist_file_name` | Single line text | Yes | file name label |
| `reference_document` | Attachment | Yes | pdf/docx |
| `checklist_file` | Attachment | Yes | xlsx |
| `created_at` | Date/time | Yes | |
| `updated_at` | Date/time | No | |

### Table: `magnum_artwork`

| Column | Airtable Type | Required | Notes |
|---|---|---|---|
| `artwork_id` | Formula (`RECORD_ID()`) | Yes | Used by frontend `getArtwork()` |
| `project_id` | Single line text | Yes | references `magnum_projects` record id |
| `project_name` | Single line text | Yes | denormalized for display/filter |
| `is_parent` | Checkbox (true/false) | Yes | parent compliance vs child re-review (standardized) |
| `parent_id` | Single line text | No | parent compliance record id |
| `version` | Number (integer) | Yes | compliance version |
| `total_review` | Number (integer) | Yes | current review cycle (1-3) |
| `is_demo_data` | Checkbox or Single select (`Yes`,`No`) | No | test mode filter |
| `c1_artwork_file_name` | Single line text | Yes | cycle 1 uploaded artwork filename |
| `c2_artwork_file_name` | Single line text | No | cycle 2 artwork filename |
| `c3_artwork_file_name` | Single line text | No | cycle 3 artwork filename |
| `reference_document` | Single line text | Yes | display name used in table |
| `c2_reference_document` | Single line text | No | cycle 2 reference name |
| `c3_reference_document` | Single line text | No | cycle 3 reference name |
| `checklist_file` | Single line text | Yes | display name used in table |
| `artwork_file` | Attachment | Yes | artwork input image for this record |
| `reference_file` | Attachment | Yes | reference file used for this record |
| `checklist_doc_file` | Attachment | Yes | checklist file used for this record |
| `cycle1_response` | Long text (JSON) | No | cycle 1 result payload |
| `cycle2_response` | Long text (JSON) | No | cycle 2 result payload |
| `cycle3_response` | Long text (JSON) | No | cycle 3 result payload |
| `cycle_1_excel` | Attachment | No | cycle 1 report output |
| `cycle_2_excel` | Attachment | No | cycle 2 report output |
| `cycle_3_excel` | Attachment | No | cycle 3 report output |
| `artwork_annotation_1` | Attachment | No | annotated images for cycle 1 |
| `artwork_annotation_2` | Attachment | No | annotated images for cycle 2 |
| `artwork_annotation_3` | Attachment | No | annotated images for cycle 3 |
| `created_at` | Date/time | Yes | |
| `updated_at` | Date/time | No | |

<!-- DEPRECATED NOTE:
`is_demo_data` is retained above for historical schema compatibility, but operational mode is now live-first.
-->
- CURRENT: Live mode is the default operational path (`artwork=1`) and compliance should run against real Airtable-backed records.

#### Required compatibility columns (confirmed)
- `reference_file_v1` ... `reference_file_v10` (Single line text or Attachment)
- `checklist_file_v1` ... `checklist_file_v10` (Single line text or Attachment)

<!-- DEPRECATED NOTE:
Compatibility columns above are retained only if legacy UI/records require them.
Do not add new business logic dependencies on these fields.
-->
- CURRENT: Primary runtime fields should be `reference_file`, `checklist_doc_file`, `cycleN_response`, `cycle_N_excel`, and `artwork_annotation_N`.

### Table: `magnum_artwork_data`
<!-- DEPRECATED NOTE:
This table definition is retained for history only. In current implementation this table can be removed and is not required for runtime compliance flow.
-->

| Column | Airtable Type | Required | Notes |
|---|---|---|---|
| `image_name` | Single line text | Yes | key used by `viewImage()` |
| `images` | Attachment (multiple) | Yes | source images for detail modal links |
| `project_id` | Single line text | No | project context |
| `is_demo_data` | Checkbox or Single select | No | test/demo filter |
| `date` | Date/time | No | legacy timestamp |
| `artwork_record_id` | Single line text | No | `magnum_artwork` record id for snapshot source |
| `cycle` | Single select (`cycle1`,`cycle2`,`cycle3`) | No | review cycle of snapshot |
| `report_snapshot_json` | Long text | No | stored copy of cycle response/report payload |
| `report_generated_at` | Date/time | No | snapshot generation timestamp |
| `report_version` | Number (integer) | No | snapshot schema/versioning support |

- CURRENT: Store row-level reject/fix image references directly inside `cycleN_response.results[]` and keep cycle attachment gallery in `artwork_annotation_N` on `magnum_artwork`.

## 7. Compliance Response JSON Contract (Stored in `cycleN_response`)

```json
{
  "summary": {
    "total": 22,
    "compliant": 13,
    "reject": 8,
    "na": 1,
    "compliance_percentage": 61.9
  },
  "results": [
    {
      "checklist_item": "Is the product name present on AW?",
      "reference_info": "Expected value from reference",
      "artwork_info": "Detected value from artwork",
      "comments": "Reason for decision",
      "decision": "Compliant",
      "image": "optional_image_name",
      "updated_image": "optional_corrected_image_name"
    }
  ]
}
```

## 8. Minimal Implementation Sequence

1. Finalize Airtable base with schemas above.
2. Standardize `magnum_artwork.is_parent` to checkbox boolean and migrate old numeric values.
3. Create and keep `reference_file_vN/checklist_file_vN` compatibility columns.
4. Extend `magnum_artwork_data` with report snapshot fields.
5. Build Python endpoint `/artwork/check_compliance` with exact form-data contract.
6. Implement rule engine that returns `summary + results`.
7. Add `nano_banana()` + `edit_image()` annotation pipeline for reject rows.
8. Upload Excel + annotation files and patch Airtable cycle fields.
9. Run end-to-end tests from UI: new compliance, re-review, edit-then-new-version, download/view/delete.
10. Move all Airtable keys out of frontend into backend proxy/security layer.

<!-- DEPRECATED NOTE:
Step 4 above is deprecated when `magnum_artwork_data` is removed.
-->
11. CURRENT REPLACEMENT FOR STEP 4: Keep all run outputs in `magnum_artwork` (`cycleN_response`, `cycle_N_excel`, `artwork_annotation_N`) and do not depend on `magnum_artwork_data`.
12. Ensure prompts sent to Claude and Nano Banana are JSON-structured payloads (no free-form prompt blocks).
13. Enforce global decision semantics: "present" rows = presence-only, "according to reference/match/correct" rows = strict exact checks.

## 9. Confirmed Decisions

1. `magnum_artwork.is_parent` is standardized as strict checkbox boolean (`true/false`).
2. `reference_file_vN` and `checklist_file_vN` compatibility columns are required and retained.
3. `magnum_artwork_data` stores both image lookup data and generated report snapshots.

<!-- DEPRECATED NOTE:
Decision #3 above is historical and no longer required when `magnum_artwork_data` is removed.
-->
4. CURRENT: `magnum_artwork_data` is optional/retired; primary storage is `magnum_artwork`.
5. CURRENT: Compliance decision policy is globally standardized:
   - `present` rows => presence-only verdict
   - `according to reference` / `matching` / `correct` rows => strict exact-match verdict
