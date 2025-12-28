# TODO

## Utils Refactoring (2025-12-28)
- [x] Create `src/utils/` directory
- [x] Create `api-helpers.ts` - API token, makeApiRequest, handleApiError
- [x] Create `time-formatters.ts` - formatDate, formatTimeEntryMarkdown
- [x] Create `comment-formatters.ts` - formatCommentMarkdown
- [x] Create `custom-field-formatters.ts` - CSV/phone/field extraction
- [x] Create `task-formatters.ts` - entity formatters, pagination
- [x] Create `response-utils.ts` - truncation, filtering
- [x] Create `task-operations.ts` - countTasksByStatus, exportTasksToCSV
- [x] Create `index.ts` barrel export
- [x] Update imports in `src/index.ts`
- [x] Update imports in `src/index.test.ts`
- [x] Run `npm run build` - verified
- [x] Run `npm test` - 28 tests passed
- [x] Delete original `src/utils.ts`

---

## Documentation Update (2025-12-23)
- [x] Add JSDoc documentation to `src/constants.ts`
- [x] Add JSDoc documentation to `src/types.ts` interfaces  
- [x] Add JSDoc documentation to `src/utils.ts` functions
- [x] Update README with comprehensive documentation
- [x] Run build to verify no TypeScript errors
- [x] Commit and push to `docs/jsdoc-readme` branch
- [ ] Create PR at: https://github.com/griffinwork40/clickup-mcp/pull/new/docs/jsdoc-readme

---

## Previous: Release prep for npm publish (2025-12-10)
- [x] Verify package version/changelog align for release 1.1.0
- [x] Run tests and build
- [x] Publish to npm and confirm
- [x] Update progress.md completion after publish
