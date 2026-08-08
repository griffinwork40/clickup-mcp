# TODO

## Test Coverage Expansion (2025-12-28)
- [x] Create `src/tools/__tests__/` directory structure
- [x] Create shared mocks file (`mocks.ts`)
- [x] Create teams tests (`teams.test.ts`) - 14 tests
- [x] Create spaces tests (`spaces.test.ts`) - 16 tests
- [x] Create folders tests (`folders.test.ts`) - 17 tests
- [x] Create lists tests (`lists.test.ts`) - 22 tests
- [x] Create tasks tests (`tasks.test.ts`) - 47 tests
- [x] Create comments tests (`comments.test.ts`) - 21 tests
- [x] Create custom-fields tests (`custom-fields.test.ts`) - 26 tests
- [x] Create time-tracking tests (`time-tracking.test.ts`) - 25 tests
- [x] Create utils tests (`utils.test.ts`) - 49 tests
- [x] Verify existing tests still pass (28 in index.test.ts)
- [x] Run all tests - 265 tests passing
## Refactor: Split Task Tools (2025-12-28)
- [x] Create src/tools/tasks/ directory structure
- [x] Extract get-tasks tool (193 lines)
- [x] Extract get-task tool (74 lines)
- [x] Extract create-task tool (101 lines)
- [x] Extract update-task tool (105 lines)
- [x] Extract delete-task tool (63 lines)
- [x] Extract search-tasks tool (191 lines)
- [x] Extract count-tasks tool (103 lines)
- [x] Extract export-tasks tool (85 lines)
- [x] Create shared schemas.ts (49 lines)
- [x] Create index.ts barrel export (65 lines)
- [x] Update src/index.ts to use new imports
- [x] Verify build passes (all tests pass)

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
