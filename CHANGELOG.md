# Changelog

All notable changes to the ClickUp MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-12-06

### Added
- **Test Coverage**: Added comprehensive test suite for pagination validation (15 tests)
  - Tests for valid pagination scenarios
  - Tests for invalid pagination detection
  - Tests for error message formatting
  - Integration tests for common pagination patterns
- **Testing Infrastructure**: Added Jest testing framework with TypeScript and ESM support
- **Documentation**: Added `CHANGELOG.md` to track version history and breaking changes

### Changed
- **BREAKING CHANGE**: Pagination validation now enforces offset alignment
  - `clickup_get_tasks` and `clickup_search_tasks` now require `offset` to be a multiple of `limit`
  - Previously, non-aligned offsets (e.g., offset=25 with limit=20) would silently produce confusing results
  - Now returns a clear error message explaining the requirement
  - **Migration**: If you're using custom offset values, ensure they're multiples of your limit:
    - ✓ Valid: offset=0, limit=20 → page 0
    - ✓ Valid: offset=20, limit=20 → page 1
    - ✓ Valid: offset=40, limit=20 → page 2
    - ✗ Invalid: offset=25, limit=20 → Error
    - ✗ Invalid: offset=37, limit=20 → Error
  - **Recommended**: Use the `next_offset` value from API responses for pagination
- **Documentation**: Updated parameter descriptions in both affected tools to clarify pagination requirements
- **Documentation**: Added dedicated "Pagination:" section explaining proper usage

### Fixed
- **Security**: Updated `@modelcontextprotocol/sdk` from v1.6.1 to v1.24.0+ to fix DNS rebinding vulnerability (GHSA-w48q-cv73-mx4w)
- **Security**: Updated `body-parser` transitive dependency to fix DoS vulnerability (GHSA-wqch-xfxh-vrr4)
- **Pagination Behavior**: Prevented confusing behavior where non-aligned offsets would return unexpected result ranges

### Why This Change?

The ClickUp API uses page-based pagination internally. When you pass `offset=25` with `limit=20`, the API calculates `page = Math.floor(25/20) = 1` and returns items 20-39, not items 25-44 as expected. This validation prevents this confusing behavior and ensures predictable pagination.

### Example Error Message

```
Error: offset (25) must be a multiple of limit (20) for proper pagination. 
Use the next_offset value from previous responses, or ensure offset is divisible by limit.
```

## [1.0.0] - 2025-11-24

### Added
- Initial release of ClickUp MCP Server
- 17 tools for comprehensive ClickUp API integration:
  - Organization management (teams, spaces, folders, lists)
  - Task CRUD operations
  - Search and filtering
  - Comments and collaboration
  - Time tracking
  - Custom fields
- Support for both Markdown and JSON response formats
- Support for multiple response modes (full, compact, summary)
- Pagination support for large result sets
- Comprehensive error handling with user-friendly messages
- Rate limit handling and guidance
- Full TypeScript implementation with strict types
- Documentation (README.md, USAGE.md, EVALUATION.md)

---

## Migration Guide: v1.0.0 → v1.1.0

### Breaking Change: Pagination Validation

**What Changed:**
The `offset` parameter in `clickup_get_tasks` and `clickup_search_tasks` must now be a multiple of the `limit` parameter.

**Why:**
Non-aligned offsets caused confusing behavior because ClickUp's API uses page-based pagination internally.

**How to Update Your Code:**

#### Option 1: Use `next_offset` (Recommended)
```typescript
// First request
let response = await clickup_get_tasks({
  list_id: "123",
  limit: 20,
  offset: 0
});

// Next page - use next_offset from response
response = await clickup_get_tasks({
  list_id: "123",
  limit: 20,
  offset: response.pagination.next_offset  // Will be 20, then 40, etc.
});
```

#### Option 2: Calculate Aligned Offsets
```typescript
const limit = 20;
const page = 2; // Want third page (0-indexed)
const offset = page * limit; // 40 - guaranteed to be aligned

await clickup_get_tasks({
  list_id: "123",
  limit: limit,
  offset: offset
});
```

#### Option 3: Validate Before Calling
```typescript
function getAlignedOffset(desiredOffset: number, limit: number): number {
  if (desiredOffset % limit !== 0) {
    // Round down to nearest aligned offset
    return Math.floor(desiredOffset / limit) * limit;
  }
  return desiredOffset;
}

const alignedOffset = getAlignedOffset(25, 20); // Returns 20
```

**Error Handling:**
If you pass a non-aligned offset, you'll receive:
```
Error: offset (25) must be a multiple of limit (20) for proper pagination. 
Use the next_offset value from previous responses, or ensure offset is divisible by limit.
```

### No Other Breaking Changes
All other functionality remains backward compatible.
