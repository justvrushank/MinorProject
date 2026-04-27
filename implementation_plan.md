# Blue Carbon MRV — Map + Job Flow Fixes

## Overview

Full implementation of all three tasks:
1. Fix the Mapbox map component to load **all** complete jobs, add choropleth switching, layer toggles, project fly-to, and click-to-detail panels.
2. Fix the Job Upload → Instant Results flow with polling, toast, and live map update.
3. Git commit and push.

The existing codebase is already well-structured. Changes are surgical — extend rather than rewrite.

---

## Analysis of Current State

| Area | Current | Gap |
|---|---|---|
| Map init | ✅ `useRef` guard, cleanup | None |
| GeoJSON loading | ❌ Only for selected project | Must load ALL complete jobs at startup |
| Choropleth fields | ❌ Only `carbon_tco2e` / `raw_value` | Need 3 labeled options |
| Per-job source/layer | ❌ Single shared source | Need `job-result-{id}` per job |
| Layer toggles | ⚠️ Only `results` layer wired | Projects/Alerts also need wiring |
| Project dropdown | ⚠️ Loads data for one project | Should `fitBounds` + highlight on select |
| Click-to-detail panel | ❌ Only hover popup | Need click handler populating right panel |
| JobUploadModal polling | ❌ No polling — closes immediately | 2s poll until complete/failed |
| Jobs page toast | ❌ None | Green toast on `onJobComplete` |
| Map live update | ❌ None | Add new layer when job completes |

> [!NOTE]
> GeoJSON feature properties from the backend use `carbon_tco2e` and `raw_value` (from `types/index.ts`). Since we cannot modify the backend, the three choropleth options will map: "Carbon stock" → `carbon_tco2e`, "Area (ha)" → `area_ha` (graceful fallback), "Risk score" → `raw_value`.

---

## Proposed Changes

### 1. `mapStore.ts` — Expand store

#### [MODIFY] [mapStore.ts](file:///c:/Users/sandi/Minor%20Project/MinorProject/frontend/src/stores/mapStore.ts)

- Expand `ChoroplethField` type to `"carbon_tco2e" | "area_ha" | "raw_value"`.
- Add `completedJobs: Job[]`, `addCompletedJob(job)`, `setCompletedJobs(jobs)` for live updates.
- Add `selectedFeatureProps` state (the clicked polygon's properties) for the right panel.

---

### 2. `_authenticated.map.tsx` — Full rewrite of data logic

#### [MODIFY] [_authenticated.map.tsx](file:///c:/Users/sandi/Minor%20Project/MinorProject/frontend/src/routes/_authenticated.map.tsx)

**Map init** — keep existing `useRef` guard unchanged.

**GeoJSON loading** — on map `load` event: fetch all jobs, filter `complete`, fetch each job's GeoJSON, add `source: job-result-{id}` + `layer: layer-result-{id}` (fill) + `outline-result-{id}` (line). Guard with `map.getSource(id)` check.

**Choropleth selector** — three options: "Carbon stock (tCO₂e)", "Area (ha)", "Risk score". On change, call `map.setPaintProperty` on all result layers.

**Layer visibility toggles** — results toggle hits all `layer-result-*` / `outline-result-*`; projects/alerts toggle placeholder layers gracefully.

**Project selector** — on select: `map.fitBounds()` to job bbox, fade non-selected result layers. On "All projects": reset.

**Click-to-detail** — `map.on('click', layerId, handler)` for each result layer; populate `selectedFeatureProps` in store; show right panel details.

**Right panel** — driven by `selectedFeatureProps` state: project name, job ID, file name, carbon stock, area, NDVI, pixel count, timestamp. "Select a project" placeholder when nothing clicked.

**Token missing** — render error banner instead of crashing.

**Live updates** — `useEffect` watching `completedJobs` from store; adds new layers reactively without reinit.

---

### 3. `JobUploadModal.tsx` — Add polling + phase UI

#### [MODIFY] [JobUploadModal.tsx](file:///c:/Users/sandi/Minor%20Project/MinorProject/frontend/src/components/JobUploadModal.tsx)

- `phase: 'idle' | 'uploading' | 'processing' | 'complete' | 'failed'` state.
- `pollRef = useRef(null)` with cleanup `useEffect`.
- On submit: uploading → POST → processing → 2s poll `GET /api/jobs/{id}`.
- On `complete`: phase = complete → call `onJobComplete(job)` → push to `mapStore.addCompletedJob(job)` → close after 800ms.
- On `failed`: show `job.error_message`.
- Inline progress stepper UI.
- New `onJobComplete?: (job: Job) => void` prop alongside existing `onJobCreated`.

---

### 4. `_authenticated.jobs.tsx` — Toast notification

#### [MODIFY] [_authenticated.jobs.tsx](file:///c:/Users/sandi/Minor%20Project/MinorProject/frontend/src/routes/_authenticated.jobs.tsx)

- Add `toast` state + auto-dismiss timer.
- `onJobComplete` handler: refresh job list, show green toast "✓ Job complete".
- Pass `onJobComplete` to `<JobUploadModal>`.

---

## Verification Plan

### Build check
```bash
npm run build   # in frontend/ — must succeed with no TS errors
```

### Browser checks (manual)
1. Map page → all complete jobs shown as fill polygons
2. Choropleth dropdown → all layers repaint  
3. Results eye toggle → layers hide/show
4. Project select → fly to bbox
5. Click polygon → right panel details
6. Upload GeoTIFF → phase stepper → map auto-adds layer
7. Jobs page → green toast on complete

### Git
```bash
git add . && git commit -m "feat: ..." && git push origin main
```
