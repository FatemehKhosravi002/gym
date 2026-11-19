# Repeat history («تکرار حرکات»)

## Backend
- `GET /api/athletes/{id}/exercise_history/?exercise_id=X&exclude_program=Y`
  - one `ProgramItem` query (`apps/programs/history.py`), newest programme first
  - drafts + final programmes count; archived (soft-deleted) and `exclude_program` do not
  - only the coach's own student is reachable (404 otherwise)
  - response: `{count, last, programs: [{id, sequence_number, date, date_jalali, day_index, sets, reps}]}`
- `GET /api/programs/duplicate_check/` stays as a thin wrapper over the same helper.
- `GET /api/athletes/{id}/repeat_counts/?exercise_ids=…&exclude_program=…` powers the badges.
- `GET /api/athletes/{id}/frequent_exercises/` powers «حرکات پرتکرار» (top 10).

## Frontend
- Builder (`/programs/builder/:athleteId`): day-picker wizard, autosaved draft in
  `localStorage` (`physique.programDraft.<athleteId>`), resumes on the exact day/step.
- Picking an exercise checks history first: `count > 0` (or the exercise already sits on
  another day of this draft) opens the repeat dialog (summary, list ⇄ Jalali calendar,
  «اضافه کن» / «انصراف»). A slow/failing check never blocks the coach — a small notice is shown.
- Supersets: select ≥2 consecutive rows → «ساخت سوپرست» (bracket + A1/A2), «حذف سوپرست».
- Reorder: drag handle or ↑/↓; delete has undo in the toast.
- Badges «تکرار ×N» appear in the builder, review screen, program detail and student page.

## Tests
```bash
cd backend && python3 manage.py test apps.programs.tests apps.athletes.tests --settings=gym_backend.settings_test
cd frontend && npm run test:history
```

## Manual script
```bash
cd backend && python3 scripts/manual_repeat_history.py --sqlite
```
Creates a student, 3 programmes with the same exercise, starts programme 4, adds the
exercise and verifies `count == 3` plus the list/calendar grouping.
