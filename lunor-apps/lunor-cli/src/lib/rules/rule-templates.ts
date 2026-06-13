import type { RuleTemplate } from './types.js';

export const RULE_TEMPLATES: Record<string, RuleTemplate> = {
  'cursor-basic': {
    name: 'cursor-basic',
    displayName: 'Basic Cursor Rule',
    type: 'cursor',
    description: 'Basic cursor rules template',
    content: `# {{NAME}}

{{DESCRIPTION}}

## Rules

- Rule 1: Description
- Rule 2: Description
- Rule 3: Description

## Examples

\`\`\`typescript
// Example code
\`\`\`

## Notes

Additional notes here.
`,
  },

  'framework': {
    name: 'framework',
    displayName: 'Framework Rules',
    type: 'framework',
    description: 'Framework-specific development rules',
    content: `# {{NAME}} Development Rules

{{DESCRIPTION}}

## Architecture

- Folder structure
- Component patterns
- State management

## Code Standards

- Naming conventions
- File organization
- Best practices

## Examples

\`\`\`typescript
// Framework-specific examples
\`\`\`
`,
  },

  'code-style': {
    name: 'code-style',
    displayName: 'Code Style Guide',
    type: 'code-style',
    description: 'Code formatting and style rules',
    content: `# {{NAME}} Code Style

{{DESCRIPTION}}

## Formatting

- Indentation: 2 spaces
- Line length: 100 characters
- Quotes: single quotes

## Naming

- Variables: camelCase
- Constants: UPPER_SNAKE_CASE
- Classes: PascalCase

## Best Practices

- Use const over let
- Avoid any types
- Write meaningful names
`,
  },

  'api-design': {
    name: 'api-design',
    displayName: 'API Design Rules',
    type: 'custom',
    description: 'RESTful API design guidelines',
    content: `# {{NAME}} API Design

{{DESCRIPTION}}

## Endpoints

- Use nouns for resources
- Use HTTP methods correctly
- Version your API

## Response Format

\`\`\`json
{
  "data": {},
  "meta": {},
  "errors": []
}
\`\`\`

## Status Codes

- 200: Success
- 201: Created
- 400: Bad Request
- 404: Not Found
- 500: Server Error
`,
  },

  'backend': {
    name: 'backend',
    displayName: 'Backend Development Rules',
    type: 'framework',
    description: 'Backend development guidelines for TypeScript/Node.js',
    content: `# {{NAME}} Backend Development Rules

{{DESCRIPTION}}

## TypeScript General Guidelines

### Basic Principles

- Use English for all code and documentation
- Always declare the type of each variable and function (parameters and return value)
- Avoid using any
- Create necessary types
- Use JSDoc to document public classes and methods
- Don't leave blank lines within a function
- One export per file

### Nomenclature

- Use PascalCase for classes
- Use camelCase for variables, functions, and methods
- Use kebab-case for file and directory names
- Use UPPERCASE for environment variables
- Avoid magic numbers and define constants
- Start each function with a verb
- Use verbs for boolean variables (isLoading, hasError, canDelete, etc.)
- Use complete words instead of abbreviations with correct spelling
- Standard abbreviations allowed: API, URL, etc.
- Well-known abbreviations: i/j for loops, err for errors, ctx for contexts, req/res/next for middleware

### Functions

- Write short functions with single purpose (less than 20 instructions)
- Name functions with verb and context
- Boolean returns: use isX, hasX, canX prefixes
- No return: use executeX, saveX prefixes
- Avoid nesting blocks via early checks and returns
- Use higher-order functions (map, filter, reduce)
- Arrow functions for simple functions (less than 3 instructions)
- Named functions for complex functions
- Use default parameter values
- Reduce function parameters using RO-RO pattern
- Use single level of abstraction

### Data

- Encapsulate data in composite types
- Avoid data validations in functions, use classes with internal validation
- Prefer immutability
- Use readonly for unchanging data
- Use as const for static literals

### Classes

- Follow SOLID principles
- Prefer composition over inheritance
- Declare interfaces to define contracts
- Write small classes with single purpose
  - Less than 200 instructions
  - Less than 10 public methods
  - Less than 10 properties

### Exceptions

- Use exceptions for unexpected errors
- Catch exceptions to:
  - Fix expected problems
  - Add context
  - Otherwise use global handler

### Testing

- Follow Arrange-Act-Assert convention
- Name test variables clearly (inputX, mockX, actualX, expectedX)
- Write unit tests for each public function
- Use test doubles for dependencies
- Write acceptance tests for each module
- Follow Given-When-Then convention

## Architecture

- Use modular architecture
- One module per main domain/route
- Separate controllers, services, and models
- DTOs validated with class-validator
- Global filters for exception handling
- Guards for permission management
- Shared module for utilities

## Examples

\`\`\`typescript
// Service example
export class UserService {
  async findById(id: string): Promise<User | null> {
    return this.repository.findOne({ where: { id } });
  }
}

// Controller example
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':id')
  async getUser(@Param('id') id: string): Promise<UserDto> {
    const user = await this.userService.findById(id);
    if (!user) throw new NotFoundException();
    return this.mapToDto(user);
  }
}
\`\`\`
`,
  },
};

export function getTemplate(name: string): RuleTemplate | undefined {
  return RULE_TEMPLATES[name];
}

export function listTemplates(): RuleTemplate[] {
  return Object.values(RULE_TEMPLATES);
}

export function renderTemplate(template: RuleTemplate, vars: Record<string, string>): string {
  let content = template.content;
  
  for (const [key, value] of Object.entries(vars)) {
    const placeholder = `{{${key.toUpperCase()}}}`;
    content = content.replace(new RegExp(placeholder, 'g'), value);
  }

  return content;
}
