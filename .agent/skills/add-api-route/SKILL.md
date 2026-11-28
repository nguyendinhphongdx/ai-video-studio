---
name: add-api-route
description: Add an HTTP route plus its client function and hook. Use for any new endpoint the UI calls.
---

# Add an API route

Rules: `docs/conventions/03-api-routes.md`. Copy `src/app/api/v1/series/[id]/route.ts`.

- [ ] zod input schema in `src/server/modules/<x>/<x>.types.ts` (messages the person sees are Vietnamese).
- [ ] Logic in the module's service (`<x>.service.ts`). The route only parses, calls the service, returns.
- [ ] `src/app/api/v1/<path>/route.ts` exports `GET`/`POST`/... wrapped in `route()` (or `publicRoute()` only for sign-in, sign-up, sign-out). Body through `parseJsonBody(req, Schema)`.
- [ ] Missing or foreign row: throw `notFound('...')`; invalid state: `conflict(...)`; other: `ApiError`. Never return 403 for another workspace's row.
- [ ] Long work: the service enqueues a job and returns it. No model, voice or render call inside the request.
- [ ] Client: add a function to `src/features/<f>/services/<f>.api.ts` using `api<T>()`; a hook in `hooks/use-<f>.ts` with a key from the feature's key factory.
- [ ] Test the service (server tests); the route stays too thin to need its own test.
- [ ] `npm run check`.
