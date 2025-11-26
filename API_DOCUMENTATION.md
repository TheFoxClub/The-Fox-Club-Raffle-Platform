# API Documentation

Simple guide for making API calls in this project.

**Tech Stack:** This project uses **Axios** for HTTP requests.

---

## Quick Start

### Step 1: Import what you need

```typescript
import { getRaffles, createRaffle } from "../api";
```

### Step 2: Use in your component

```typescript
const loadRaffles = async () => {
  const response = await getRaffles();

  if (response.success) {
    console.log(response.data); // Your data is here!
  } else {
    console.error(response.message); // Error message
  }
};
```

---

## How It Works

All API calls return this format:

```typescript
{
  success: boolean;  // true = worked, false = error
  message: string;   // Success or error message
  data: any;         // Your actual data (null if error)
}
```

---

## Available Request Methods

| Method | When to Use | Example |
|--------|-------------|---------|
| `getRequest` | Fetching data | Get list of raffles |
| `postRequest` | Creating new things | Create new raffle |
| `putRequest` | Updating entire thing | Update raffle details |
| `patchRequest` | Partial update | Mark notification as read |
| `deleteRequest` | Deleting things | Delete a raffle |

---

## Examples

### GET - Fetch Data

```typescript
// Simple GET
const getCategories = () => {
  return getRequest("/metadata/categories");
};

// GET with URL parameter
const getRaffleById = (raffleId: number) => {
  return getRequest(`/raffles/${raffleId}`);
};

// GET with query parameters (filters)
const getRafflesWithFilters = (params: { status?: string; page?: number }) => {
  return getRequest("/raffles", { params });
};
// This becomes: /raffles?status=active&page=1
```

### POST - Create Data

```typescript
// Simple POST
const createRaffle = (data: { title: string; price: number }) => {
  return postRequest("/raffles", data);
};

// POST with file upload
const uploadImage = (file: File) => {
  const formData = new FormData();
  formData.append("image", file);

  return postRequest("/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
};
```

### PUT - Update Data

```typescript
const updateRaffle = (raffleId: number, data: { title?: string }) => {
  return putRequest(`/raffles/${raffleId}`, data);
};
```

### DELETE - Remove Data

```typescript
const deleteRaffle = (raffleId: number) => {
  return deleteRequest(`/raffles/${raffleId}`);
};
```

---

## Using in React Components

```tsx
import { useState, useEffect } from "react";
import { getRaffles, createRaffle } from "../api";

function RaffleList() {
  const [raffles, setRaffles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load data on mount
  useEffect(() => {
    loadRaffles();
  }, []);

  const loadRaffles = async () => {
    setLoading(true);
    const response = await getRaffles();

    if (response.success) {
      setRaffles(response.data);
    } else {
      alert(response.message);
    }
    setLoading(false);
  };

  // Create new raffle
  const handleCreate = async () => {
    const response = await createRaffle({
      title: "New Raffle",
      price: 100
    });

    if (response.success) {
      alert("Created!");
      loadRaffles(); // Refresh the list
    } else {
      alert("Error: " + response.message);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <button onClick={handleCreate}>Create Raffle</button>
      {raffles.map(raffle => (
        <div key={raffle.id}>{raffle.title}</div>
      ))}
    </div>
  );
}
```

---

## Adding New API Calls

### Step 1: Open `src/api/index.ts`

### Step 2: Add your function

```typescript
/**
 * Description of what this does
 * @example const response = await myNewApiCall(123);
 */
export const myNewApiCall = (someId: number) => {
  return getRequest(`/some-endpoint/${someId}`);
};
```

### Step 3: Use it in your component

```typescript
import { myNewApiCall } from "../api";

const response = await myNewApiCall(123);
```

---

## Common Patterns

### Pattern 1: Loading State

```typescript
const [loading, setLoading] = useState(false);

const fetchData = async () => {
  setLoading(true);
  const response = await getRaffles();
  setLoading(false);

  if (response.success) {
    // use data
  }
};
```

### Pattern 2: Error Handling

```typescript
const response = await createRaffle(data);

if (response.success) {
  toast.success("Created successfully!");
} else {
  toast.error(response.message);
}
```

### Pattern 3: With Query Parameters

```typescript
// In API file
export const searchRaffles = (query: string, page: number) => {
  return getRequest("/raffles/search", {
    params: { q: query, page, limit: 10 }
  });
};

// Usage
const response = await searchRaffles("fox", 1);
// Calls: /raffles/search?q=fox&page=1&limit=10
```

---

## File Structure

```
src/
├── api/
│   └── index.ts      <-- All API calls go here
├── config/
│   └── server.ts     <-- Axios config (don't modify)
└── components/
    └── YourComponent.tsx  <-- Use API calls here
```

---

## How Axios is Configured

The axios instance is set up in `src/config/server.ts`:

```typescript
// Already configured - you don't need to touch this!
import axios from "axios";

const server = axios.create({
  baseURL: import.meta.env.VITE_BASE_API_URL,  // From .env file
  headers: { "Content-Type": "application/json" },
  withCredentials: true,  // Sends cookies with requests
});

// Auto-adds auth token to all requests
// Auto-handles 401 errors (redirects to login)
```

The helper functions (`getRequest`, `postRequest`, etc.) wrap axios and return a consistent response format.

---

## Environment Setup

Make sure `.env` has:

```env
VITE_BASE_API_URL=http://localhost:8282/api
```

---

## Need Help?

1. Look at existing examples in `src/api/index.ts`
2. Check `src/config/server.ts` for how requests work
3. Always check `response.success` before using `response.data`
