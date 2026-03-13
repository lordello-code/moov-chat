import 'next-auth'

declare module 'next-auth' {
  interface User {
    role:        string
    tenantId:    string | null
    tenantSlug:  string | null
  }

  interface Session {
    user: {
      id:          string
      name:        string
      email:       string
      role:        string
      tenantId:    string | null
      tenantSlug:  string | null
    }
  }
}
