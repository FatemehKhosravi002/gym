# Architecture and Decisions

## Choices
- **Frontend framework**: Vite + React (chosen for speed, simplicity, PWA support). Alternative Next.js considered but Vite is lighter for SPA.
- **PDF generation**: WeasyPrint on backend for Persian RTL support.
- **Storage**: Local filesystem in dev, S3-compatible via django-storages in prod.
- **Duplicate check**: Server endpoint + instant UI alert. Checks all stored programs.
- **Soft delete**: Programs use `is_archived` flag, never hard-deleted.
- **Exercises/Categories**: Use PROTECT on delete to avoid breaking history; can be archived/deactivated.
- **Unique athlete codes**: 6-digit auto-generated, never reused.
- **Share tokens**: Cryptographically secure random tokens, revocable.
