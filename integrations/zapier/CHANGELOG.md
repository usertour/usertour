## 1.1.3

Attribute values now follow each attribute's declared type, and self-hosted instances behind a path prefix paginate correctly.

1. Update create/upsert_user, create/upsert_company, and create/track_event: attribute values are sent as the attribute's declared type (number, true/false, text) instead of being guessed from their shape; blank values are skipped. These actions now need the "Attributes: read" scope on the API token.
2. Fix trigger/event_tracked: the event dropdown pages correctly on self-hosted instances served under a path prefix.

## 1.1.2

1. Fix create/upsert_user, create/upsert_company, and create/track_event: numeric and boolean attribute values no longer fail validation.
2. Fix trigger/event_tracked: projects with more than 100 event definitions load the full dropdown.
3. Update trigger/event_tracked: the editor's test sample follows the chosen event.

## 1.1.1

1. Fix search/find_user and search/find_company: only a definite "not found" returns no results; other failures surface as errors.
2. Update create/upsert_user and create/upsert_company: empty attribute values are ignored instead of overwriting existing ones.

## 1.1.0

New triggers, actions, and searches.

1. New trigger! trigger/event_tracked
2. New trigger! trigger/flow_ended
3. New trigger! trigger/launcher_activated
4. New action! create/track_event
5. New action! create/upsert_company
6. New search! search/find_user
7. New search! search/find_company

## 1.0.0

Initial release: Flow Started, Flow Completed, Checklist Completed, Survey Question Answered, and User Created triggers, plus the Create or Update User action.
