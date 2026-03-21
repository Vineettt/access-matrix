# Route Auto-Loading Pattern Documentation

This document explains the regex patterns used for automatically extracting routes from different web frameworks.

## Supported Frameworks

### Express.js
**Frameworks:** `express`, `express.js`

**Description:** Standard Express.js route patterns

**Examples:**
- `app.get('/users', handler)`
- `router.post('/api/users', middleware, handler)`
- `app.all('/webhook/*', handler)`

**Regex Patterns:**
- Route: `(?:app|router)\.(?:get|post|put|delete|patch|all)\s*\(\s*['"`]([^'"`]+)['"`]`
- Method: `(?:app|router)\.(get|post|put|delete|patch|all)\s*\(`

---

### Fastify
**Frameworks:** `fastify`

**Description:** Fastify route registration patterns

**Examples:**
- `fastify.get('/users', handler)`
- `app.post('/api/users', options, handler)`
- `fastify.all('/webhook/*', handler)`

**Regex Patterns:**
- Route: `(?:fastify|app)\.(?:get|post|put|delete|patch|all)\s*\(\s*['"`]([^'"`]+)['"`]`
- Method: `(?:fastify|app)\.(get|post|put|delete|patch|all)\s*\(`

---

### Koa.js
**Frameworks:** `koa`, `koa.js`

**Description:** Koa.js route patterns

**Examples:**
- `router.get('/users', handler)`
- `router.post('/api/users', handler)`
- `router.all('/webhook/*', handler)`

**Regex Patterns:**
- Route: `router\.(?:get|post|put|delete|patch|all)\s*\(\s*['"`]([^'"`]+)['"`]`
- Method: `router\.(get|post|put|delete|patch|all)\s*\(`

---

### NestJS
**Frameworks:** `nestjs`, `nest.js`

**Description:** NestJS controller decorator patterns

**Examples:**
- `@Get('/users')`
- `@Post('/api/users')`
- `@Delete('/users/:id')`

**Regex Patterns:**
- Route: `@(Get|Post|Put|Delete|Patch)\s*\(\s*['"`]([^'"`]+)['"`]`
- Method: `@(Get|Post|Put|Delete|Patch)\s*\(`

---

### Custom Patterns
**Frameworks:** `custom`

**Description:** User-defined regex patterns

**Examples:**
- `ROUTE('/users', GET)`
- `ROUTE('/api/users', POST)`
- `ROUTE('/users/:id', DELETE)`

**Regex Patterns:**
- Route: `ROUTE\s*\(\s*['"`]([^'"`]+)['"`]`
- Method: `ROUTE\s*\(\s*(GET|POST|PUT|DELETE|PATCH)`

---

## Configuration

### Basic Auto-Loading Setup

```json
{
  "route": {
    "loading": "auto",
    "auto": {
      "directories": ["src/routes", "api"],
      "patterns": ["**/*.ts", "**/*.js"],
      "recursive": true,
      "exclude": ["node_modules", "*.test.*"]
    }
  }
}
```

### Advanced Configuration with Custom Patterns

```json
{
  "route": {
    "loading": "auto",
    "auto": {
      "directories": ["src/routes"],
      "patterns": ["**/*.ts"],
      "recursive": true,
      "exclude": ["node_modules", "*.test.*"],
      "customPatterns": [
        {
          "name": "MyFramework",
          "description": "Custom framework patterns",
          "patterns": {
            "route": "/myRoute\\(['\"']([^'\"']+)['\"']",
            "method": "/myRoute\\([^,]+,\\s*(GET|POST|PUT|DELETE)/i",
            "exclude": ["/\\/\\*[\\s\\S]*?\\*\\//g", "/\\/\\/.*$/gm"]
          },
          "examples": [
            "myRoute('/users', GET)",
            "myRoute('/api/users', POST)"
          ],
          "frameworks": ["myframework"]
        }
      ]
    }
  }
}
```

## Pattern Features

### Comment Exclusion
All patterns automatically exclude:
- Block comments: `/* comment */`
- Line comments: `// comment`

### Route Path Normalization
- Ensures paths start with `/`
- Removes trailing slashes (except for root `/`)
- Handles parameter patterns like `:id`, `*`, etc.

### Method Normalization
- Converts methods to uppercase
- Supports both method names and decorators
- Handles framework-specific variations

## Adding Custom Patterns

To add support for a new framework, define a custom pattern:

```json
{
  "name": "NewFramework",
  "description": "New framework route patterns",
  "patterns": {
    "route": "/yourRouteRegex/g",
    "method": "/yourMethodRegex/gi",
    "exclude": ["/commentRegex/g"]
  },
  "examples": [
    "yourFramework.get('/route')",
    "yourFramework.post('/route')"
  ],
  "frameworks": ["newframework"]
}
```

### Regex Requirements

1. **Route Pattern:** Must capture the route path in group 1
2. **Method Pattern:** Must capture the HTTP method
3. **Exclude Patterns:** Should remove comments before route extraction
4. **Global Flags:** Route patterns should use `/g` flag for multiple matches

## Testing Patterns

Test your regex patterns using online tools like:
- [Regex101](https://regex101.com/)
- [Regexr](https://regexr.com/)

Example test strings for Express.js:
```javascript
app.get('/users', handler);
router.post('/api/users', middleware, handler);
app.all('/webhook/*', handler);
```
