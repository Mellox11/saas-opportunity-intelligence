# 4. Security & Authentication

## JWT Authentication System

```typescript
// lib/auth/jwt.ts
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12)
  }

  static generateTokens(userId: string, email: string) {
    return jwt.sign({ userId, email }, process.env.JWT_SECRET!, { expiresIn: '7d' })
  }
}
```

## API Security Patterns

```typescript
// lib/security/rate-limiter.ts
export const authRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts per 15 minutes
})

export const apiRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 1000, // 1000 requests per 15 minutes
})
```

---
