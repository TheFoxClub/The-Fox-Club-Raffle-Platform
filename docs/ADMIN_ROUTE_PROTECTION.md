# Admin Route Protection Implementation Guide

This document provides step-by-step instructions for restricting non-admin users from accessing the `/admin/*` routes.

---

## Overview

Currently, the admin routes are accessible to anyone who knows the URL. We need to:

1. Check if the user is authenticated
2. Check if the user has admin privileges (`isAdmin: true`)
3. Redirect unauthorized users away from admin routes

---

## Step-by-Step Implementation

### Step 1: Create a Protected Route Component

Create a new file: `src/components/auth/ProtectedAdminRoute.tsx`

```tsx
import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../../redux/store";

interface ProtectedAdminRouteProps {
  children?: React.ReactNode;
}

export function ProtectedAdminRoute({ children }: ProtectedAdminRouteProps) {
  const user = useSelector((state: RootState) => state.user);

  // Check 1: Is the user authenticated?
  if (!user.isAuthenticated) {
    // Redirect to home page (or a login page)
    return <Navigate to="/" replace />;
  }

  // Check 2: Is the user an admin?
  if (!user.isAdmin) {
    // Redirect non-admins to home page
    // You could also redirect to a "403 Forbidden" page
    return <Navigate to="/" replace />;
  }

  // User is authenticated AND is an admin - allow access
  return children ? <>{children}</> : <Outlet />;
}
```

**Key Concepts:**

- `useSelector` - Gets the user state from Redux store
- `Navigate` - React Router component that redirects to another route
- `replace` prop - Replaces the current history entry (so back button doesn't go to admin page)
- `Outlet` - Renders child routes (useful for nested routing)

---

### Step 2: Update App.tsx Routes

Open `src/App.tsx` and wrap admin routes with the protection component.

**Option A: Wrap Each Route Individually**

```tsx
import { ProtectedAdminRoute } from "./components/auth/ProtectedAdminRoute";

// In your routes:
<Route
  path="/admin"
  element={
    <ProtectedAdminRoute>
      <AdminLayout><AdminDashboard /></AdminLayout>
    </ProtectedAdminRoute>
  }
/>
<Route
  path="/admin/raffles"
  element={
    <ProtectedAdminRoute>
      <AdminLayout><AdminRaffles /></AdminLayout>
    </ProtectedAdminRoute>
  }
/>
// ... repeat for all admin routes
```

**Option B: Use Nested Routes (Recommended - Less Repetition)**

```tsx
import { ProtectedAdminRoute } from "./components/auth/ProtectedAdminRoute";

// Group all admin routes under a parent protected route:
<Route element={<ProtectedAdminRoute />}>
  <Route
    path="/admin"
    element={
      <AdminLayout>
        <AdminDashboard />
      </AdminLayout>
    }
  />
  <Route
    path="/admin/raffles"
    element={
      <AdminLayout>
        <AdminRaffles />
      </AdminLayout>
    }
  />
  <Route
    path="/admin/collections"
    element={
      <AdminLayout>
        <AdminCollections />
      </AdminLayout>
    }
  />
  <Route
    path="/admin/tokens"
    element={
      <AdminLayout>
        <AdminTokens />
      </AdminLayout>
    }
  />
  <Route
    path="/admin/fees"
    element={
      <AdminLayout>
        <AdminFees />
      </AdminLayout>
    }
  />
  <Route
    path="/admin/rewards"
    element={
      <AdminLayout>
        <AdminRewards />
      </AdminLayout>
    }
  />
  <Route
    path="/admin/leaderboards"
    element={
      <AdminLayout>
        <AdminLeaderboards />
      </AdminLayout>
    }
  />
  <Route
    path="/admin/analytics"
    element={
      <AdminLayout>
        <AdminAnalytics />
      </AdminLayout>
    }
  />
</Route>;
```

---

### Step 3: Handle Loading States (Optional but Recommended)

If authentication state is loaded asynchronously (e.g., checking session on page load), add a loading state:

```tsx
export function ProtectedAdminRoute({ children }: ProtectedAdminRouteProps) {
  const user = useSelector((state: RootState) => state.user);

  // If auth state is still loading, show a loader
  if (user.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user.isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (!user.isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
```

**Note:** This requires adding an `isLoading` field to your user Redux state if not already present.

---

### Step 4: Create a 403 Forbidden Page (Optional)

Instead of silently redirecting, you can show an error page.

Create: `src/views/errors/Forbidden.tsx`

```tsx
import { Link } from "react-router-dom";
import Button from "../../components/ui/Button";
import { ShieldX } from "lucide-react";

export default function Forbidden() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6">
      <ShieldX className="h-24 w-24 text-destructive" />
      <h1 className="text-4xl font-bold">403 - Access Denied</h1>
      <p className="text-muted-foreground text-center max-w-md">
        You don't have permission to access this page. This area is restricted
        to administrators only.
      </p>
      <Link to="/">
        <Button>Return to Home</Button>
      </Link>
    </div>
  );
}
```

Then update `ProtectedAdminRoute` to redirect to `/forbidden`:

```tsx
if (!user.isAdmin) {
  return <Navigate to="/forbidden" replace />;
}
```

And add the route in `App.tsx`:

```tsx
import Forbidden from "./views/errors/Forbidden";

<Route path="/forbidden" element={<Forbidden />} />;
```

---

## Testing Checklist

After implementation, verify these scenarios:

| Scenario                                    | Expected Behavior                 |
| ------------------------------------------- | --------------------------------- |
| Non-authenticated user visits `/admin`      | Redirected to `/`                 |
| Authenticated non-admin visits `/admin`     | Redirected to `/` or `/forbidden` |
| Authenticated admin visits `/admin`         | Admin dashboard loads normally    |
| Non-admin tries direct URL `/admin/raffles` | Redirected away                   |
| Admin refreshes page on `/admin/raffles`    | Page loads correctly              |

---

## File Structure After Implementation

```
src/
├── components/
│   └── auth/
│       └── ProtectedAdminRoute.tsx   <-- NEW
├── views/
│   └── errors/
│       └── Forbidden.tsx             <-- OPTIONAL
└── App.tsx                           <-- MODIFIED
```

---

## Common Mistakes to Avoid

1. **Forgetting `replace` prop** - Without it, users can press back button to access admin pages
2. **Not handling loading states** - Can cause flash of content or redirect loops
3. **Checking only `isAdmin`** - Always check `isAuthenticated` first
4. **Hardcoding redirect paths** - Consider using constants for route paths

---

## Security Note

Client-side route protection is for **UX only**. It prevents users from accidentally accessing admin pages but does NOT secure your application.

**Always implement server-side authorization:**

- Backend API endpoints should verify admin status before returning sensitive data
- Never trust client-side checks for security
- Use middleware on your API routes to validate admin JWT/session

---

## Questions?

If you have questions about this implementation, refer to:

- [React Router Docs - Protected Routes](https://reactrouter.com/en/main/start/tutorial#protected-routes)
- [Redux Toolkit - useSelector](https://redux-toolkit.js.org/api/hooks#useselector)
- Suleo
- KnightShred
