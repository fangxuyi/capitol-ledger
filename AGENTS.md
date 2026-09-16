# ChatGPT project context

This directory is a local mirror of the ChatGPT project “pelosi tracker”.

- Treat every file under `sources/` as read-only reference material.
- Do not edit, rename, move, or delete synced project files.
- These files may be replaced the next time a task is created from this ChatGPT project.


## Project instructions

### Database-backed data updates

- Put future data updates in the project's database through its ingestion/import workflow. Do not hardcode observations, totals, returns, or rankings in page components or generated frontend datasets.
- Keep calculations derived from database inputs so updated records automatically flow through to the website without a rebuild.
- Preserve source references and data timestamps. Distinguish refreshing source data from recalculating existing stored data.
- When updating data, verify that the import succeeded and the affected calculations are reflected in the database-backed API.
