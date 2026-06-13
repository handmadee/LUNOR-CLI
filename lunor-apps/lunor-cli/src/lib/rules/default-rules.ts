import type { RuleTemplate } from './types.js';

/**
 * Default rules provided out-of-the-box with LUNOR CLI
 * These rules are useful starting points for new projects
 */
export const DEFAULT_RULES: Record<string, RuleTemplate> = {
  'typescript-basics': {
    name: 'typescript-basics',
    displayName: 'TypeScript Basics',
    type: 'code-style',
    description: 'Essential TypeScript guidelines for clean code',
    content: `# TypeScript Basics

## Type Safety

- Always declare types for function parameters and return values
- Avoid \`any\` type - use \`unknown\` if type is truly unknown
- Use \`strict\` mode in tsconfig.json
- Leverage TypeScript's type inference when obvious

## Naming Conventions

- **Variables/Functions**: camelCase (\`getUserData\`, \`isValid\`)
- **Classes/Interfaces**: PascalCase (\`UserService\`, \`IUserRepository\`)
- **Constants**: UPPER_SNAKE_CASE (\`MAX_RETRIES\`, \`API_BASE_URL\`)
- **Files**: kebab-case (\`user-service.ts\`, \`api-client.ts\`)
- **Boolean variables**: Prefix with \`is\`, \`has\`, \`can\`, \`should\`

## Code Organization

- One export per file when possible
- Group related functionality into modules
- Keep files under 200 lines
- Use barrel exports (index.ts) for clean imports

## Best Practices

- Prefer \`const\` over \`let\`, avoid \`var\`
- Use optional chaining (\`user?.profile?.name\`)
- Use nullish coalescing (\`value ?? defaultValue\`)
- Prefer \`interface\` over \`type\` for object shapes
- Use \`readonly\` for immutable data
- Use \`as const\` for literal types

## Examples

\`\`\`typescript
// Good: Clear types, descriptive names
interface UserProfile {
  readonly id: string;
  name: string;
  email: string;
  createdAt: Date;
}

function getUserById(id: string): Promise<UserProfile | null> {
  return api.get<UserProfile>(\`/users/\${id}\`);
}

// Bad: Any types, unclear names
function get(x: any): any {
  return api.get(x);
}
\`\`\`
`,
  },

  'code-quality': {
    name: 'code-quality',
    displayName: 'Code Quality Standards',
    type: 'code-style',
    description: 'General code quality and best practices',
    content: `# Code Quality Standards

## SOLID Principles

- **S**ingle Responsibility: One class/function = one purpose
- **O**pen/Closed: Open for extension, closed for modification
- **L**iskov Substitution: Subtypes must be substitutable for base types
- **I**nterface Segregation: Many specific interfaces > one general interface
- **D**ependency Inversion: Depend on abstractions, not concretions

## Clean Code

### Functions
- Keep functions short (< 20 lines ideally)
- Single level of abstraction per function
- Descriptive names with verbs (\`calculateTotal\`, \`fetchUserData\`)
- 3 parameters max - use objects for more
- Avoid side effects in pure functions

### Error Handling
- Use try-catch for expected errors
- Fail fast with early returns
- Provide meaningful error messages
- Log errors with context
- Don't swallow errors silently

### Comments
- Write self-documenting code
- Comment the "why", not the "what"
- Keep comments up-to-date with code
- Use JSDoc for public APIs
- Remove commented-out code

## Code Smells to Avoid

- God objects/classes (too many responsibilities)
- Long parameter lists
- Duplicate code (DRY principle)
- Magic numbers/strings (use constants)
- Deep nesting (> 3 levels)
- Complex conditionals (extract to functions)

## Examples

\`\`\`typescript
// Good: Clear, single purpose, good names
interface OrderCalculator {
  calculateSubtotal(items: OrderItem[]): number;
  calculateTax(subtotal: number, rate: number): number;
  calculateTotal(subtotal: number, tax: number): number;
}

// Bad: God class, unclear purpose
interface OrderManager {
  processOrder(): void;
  validatePayment(): boolean;
  sendEmail(): void;
  updateInventory(): void;
  generateInvoice(): string;
}
\`\`\`
`,
  },

  'testing-best-practices': {
    name: 'testing-best-practices',
    displayName: 'Testing Best Practices',
    type: 'custom',
    description: 'Guidelines for writing effective tests',
    content: `# Testing Best Practices

## Test Structure

### Arrange-Act-Assert (AAA)
\`\`\`typescript
test('calculateTotal returns sum of prices', () => {
  // Arrange
  const items = [{ price: 10 }, { price: 20 }];
  const calculator = new PriceCalculator();

  // Act
  const total = calculator.calculateTotal(items);

  // Assert
  expect(total).toBe(30);
});
\`\`\`

### Given-When-Then (BDD)
\`\`\`typescript
describe('UserService', () => {
  describe('when creating a new user', () => {
    it('should hash the password', async () => {
      // Given
      const userData = { email: 'test@example.com', password: 'plain' };

      // When
      const user = await userService.create(userData);

      // Then
      expect(user.password).not.toBe('plain');
      expect(user.password).toMatch(/^$2[aby]$/);
    });
  });
});
\`\`\`

## Naming Conventions

- **Test Files**: \`[filename].test.ts\` or \`[filename].spec.ts\`
- **Test Names**: Descriptive sentences describing behavior
- **Variables**: \`inputX\`, \`mockX\`, \`actualX\`, \`expectedX\`

## What to Test

### Do Test:
- Public API/interface behavior
- Edge cases and boundaries
- Error handling and validation
- Integration points
- Business logic

### Don't Test:
- Private methods (test through public API)
- Third-party library internals
- Trivial getters/setters
- Framework code

## Test Types

### Unit Tests
- Test single unit in isolation
- Mock all dependencies
- Fast execution (< 1ms each)
- High code coverage target (80%+)

### Integration Tests
- Test multiple units together
- Use real dependencies when practical
- Test database, API, file system interactions
- Medium execution time

### E2E Tests
- Test complete user flows
- Use real environment
- Critical paths only
- Slower execution acceptable

## Mocking Strategy

\`\`\`typescript
// Good: Mock external dependencies
const mockUserRepo = {
  findById: vi.fn().mockResolvedValue({ id: '1', name: 'Test' })
};

// Bad: Don't mock the unit under test
const mockUserService = {
  createUser: vi.fn().mockResolvedValue({ id: '1' })
};
\`\`\`

## Best Practices

- One assertion per test (or closely related assertions)
- Independent tests (no shared state)
- Deterministic (same input = same output)
- Fast execution
- Clear failure messages
- Test behavior, not implementation
- Keep tests simple and readable
`,
  },
};

/**
 * Get all default rule templates
 */
export function getDefaultRules(): RuleTemplate[] {
  return Object.values(DEFAULT_RULES);
}

/**
 * Get a specific default rule by name
 */
export function getDefaultRule(name: string): RuleTemplate | undefined {
  return DEFAULT_RULES[name];
}

/**
 * Get default rule names
 */
export function getDefaultRuleNames(): string[] {
  return Object.keys(DEFAULT_RULES);
}

/**
 * Check if a rule name is a default rule
 */
export function isDefaultRule(name: string): boolean {
  return name in DEFAULT_RULES;
}
