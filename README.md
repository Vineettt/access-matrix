# Access Matrix

[![npm version](https://img.shields.io/npm/v/access-matrix)](https://www.npmjs.com/package/access-matrix)
[![npm downloads](https://img.shields.io/npm/dm/access-matrix)](https://www.npmjs.com/package/access-matrix)
[![GitHub stars](https://img.shields.io/github/stars/Vineettt/access-matrix?style=social)](https://github.com/Vineettt/access-matrix/stargazers)
[![GitHub license](https://img.shields.io/github/license/Vineettt/access-matrix)](https://github.com/Vineettt/access-matrix/blob/main/LICENSE)
[![Build Status](https://img.shields.io/npm/types/access-matrix)](https://www.npmjs.com/package/access-matrix)

A lightweight, type-safe access control library for Node.js with SQLite and PostgreSQL support.

## Features

- 🔒 Role-based and permission-based access control
- 🛠️ Extensible adapter architecture
- 🚀 Built with TypeScript for better developer experience
- ⚡ Simple and intuitive API
- 🗄️ Database Support:
  - ✅ SQLite (built-in)
  - ✅ PostgreSQL
  - 📅 Auto-loading routes from source code

## Installation

```bash
npm install access-matrix
# or
yarn add access-matrix
```

## Quick Start

### TypeScript

```typescript
import AccessControl, { RouteData } from 'access-matrix';

interface AppRoute extends RouteData {
  requiresAuth?: boolean;
}

const ac = await AccessControl.create<AppRoute>({
  type: 'sqlite',
  database: './access.db'
});
```

## Auto-Loading Routes

The access-matrix library can automatically detect and load routes from your source files.

### Configuration

Create `config/database.json`:

```json
{
  "database": {
    "type": "sqlite",
    "config": {
      "sqlite": {
        "mode": "file",
        "file_name": "access-matrix.db"
      }
    }
  },
  "route": {
    "loading": "auto",
    "auto": {
      "directories": ["src/routes", "api", "controllers"],
      "patterns": ["**/*.ts", "**/*.js"],
      "recursive": true,
      "exclude": ["node_modules", "*.test.*"]
    }
  }
}
```

### Usage

```typescript
import { AccessControl, loadRoutes } from 'access-matrix';

async function setupAccessControl() {
  const configPath = './config/database.json';
  const accessControl = await AccessControl.create(configPath);
  
  // Auto-load routes from configured directories
  const routes = await loadRoutes(configPath);
  
  console.log(`Found ${routes.length} routes:`);
  routes.forEach((route, index) => {
    console.log(`${index + 1}. ${route.method} ${route.path}`);
  });
  
  // Sync routes to database
  const syncResult = await accessControl.syncRoutes(routes);
  console.log(`Synced: ${syncResult.added} added, ${syncResult.removed} removed`);
  
  return accessControl;
}
```

### Supported Frameworks

- **Express.js** - `router.get()`, `router.post()`, etc.
- **Fastify** - `fastify.get()`, `fastify.post()`, etc.
- **NestJS** - `@Get()`, `@Post()`, `@Put()` decorators
- **Koa.js** - `router.get()`, `router.post()`, etc.

See [Route Patterns Documentation](docs/ROUTE_PATTERNS.md) for detailed examples.

## Documentation

- [API Reference](docs/API.md)
- [Configuration Guide](docs/CONFIGURATION.md)
- [Route Patterns](docs/ROUTE_PATTERNS.md)
- [Examples](examples/)

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run examples
npm run example
npm run example:postgres
npm run example:autoload
```

## 📝 Reviews & Feedback

We'd love to hear your feedback! Help us improve access-matrix:

### 🌟 **Rate This Package**
- [Leave a review on npm](https://www.npmjs.com/package/access-matrix)
- [Star on GitHub](https://github.com/Vineettt/access-matrix)

### 📋 **Quick Review Form**
Copy this template and share your experience:

```markdown
## Review: access-matrix

**⭐ Rating:** ★★★★★☆ (1-5 stars)

**🚀 Use Case:** What are you using it for?
- [ ] Role-based access control
- [ ] API route protection  
- [ ] Database permissions
- [ ] Auto-loading routes
- [ ] Other: _________

**✅ What Works Well:**
- 
- 

**💡 Suggestions for Improvement:**
- 
- 

**🔧 Technical Details:**
- Node.js version: _________
- Database: [ ] SQLite [ ] PostgreSQL [ ] Other
- TypeScript: [ ] Yes [ ] No

**📝 Overall Experience:**
_______________________________________________________
```

### 🎯 **How to Share Your Review**

1. **npm Review**: Visit [access-matrix on npm](https://www.npmjs.com/package/access-matrix) → "Write a Review"
2. **GitHub Issue**: Use the template above in [Issues](https://github.com/Vineettt/access-matrix/issues)
3. **GitHub Discussion**: Start a [Discussion](https://github.com/Vineettt/access-matrix/discussions)
4. **Detailed Template**: See [REVIEW_TEMPLATE.md](./REVIEW_TEMPLATE.md) for comprehensive feedback

### 📊 **Review Analytics**
We track all feedback to improve access-matrix:
- ⭐ **Ratings** help us know what we're doing right
- 🐛 **Bug reports** get immediate attention
- 💡 **Suggestions** shape future development
- 📝 **Documentation feedback** improves examples

### 🙏 **Thank You!**
Your feedback helps us improve access-matrix for everyone! 🚀

## 📝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License

MIT
