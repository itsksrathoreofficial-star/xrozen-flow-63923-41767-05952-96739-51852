# 🚀 PHASE 7: IMMEDIATE EXECUTION GUIDE

**Current Status**: 2/35 files migrated (6%)  
**Today's Goal**: Complete Priority 1 migration (8 files → 23%)

---

## ✅ WHAT'S DONE (Confirmed Working)

### Infrastructure (Phase 1-6)
- ✅ SQLite database adapter complete
- ✅ Express.js backend with 35+ endpoints
- ✅ Authentication system (JWT, bcrypt)
- ✅ WebSocket server for real-time
- ✅ Migration scripts ready
- ✅ Admin panel foundation
- ✅ API client with all methods

### Migrated Files (2/35)
- ✅ **Dashboard.tsx** - All features working
- ✅ **Projects.tsx** - CRUD complete

---

## 📋 TODAY'S TASKS (6 Hours)

### Task 1: Data Migration (1-2 hours)

**OPTION A**: If you have Supabase credentials and want to migrate real data:

```bash
# 1. Ensure environment variables are set
cat .env | grep SUPABASE

# 2. Create migration directories
mkdir -p migration/exports migration/transformed migration/reports

# 3. Install ts-node if not installed
npm install -g ts-node

# 4. Run migration scripts (these commands won't work due to read-only package.json)
# Instead, run directly:
npx ts-node src/migration/scripts/01-export-supabase-data.ts
npx ts-node src/migration/scripts/02-validate-export.ts
npx ts-node src/migration/transformers/user-transformer.ts
npx ts-node src/migration/scripts/03-import-to-sqlite.ts

# Expected: All 15 tables migrated, 100% row match
```

**OPTION B**: If you want to test with empty database (faster):

```bash
# Start with empty SQLite database
# The schema is already created by migration manager
# Skip to frontend refactoring
```

---

### Task 2: Refactor Remaining Priority 1 Files (4 hours)

I'll now provide the refactoring for the 6 remaining Priority 1 files.

---

## 🎯 PRIORITY 1 FILES TO MIGRATE

### 1️⃣ ProjectDetails.tsx (3 Supabase calls)
**Calls to replace**:
- Line 33: `supabase.auth.getUser()` → `apiClient.getCurrentUser()`
- Line 44: `supabase.auth.getUser()` → `apiClient.getCurrentUser()`
- Line 64: `supabase.auth.getSession()` → `apiClient.getCurrentUser()`

### 2️⃣ Clients.tsx (2 Supabase calls)
**Calls to replace**:
- Line 57: `supabase.auth.getUser()` → `apiClient.getCurrentUser()`
- Line 84: `supabase.auth.getUser()` → `apiClient.getCurrentUser()`
- Replace `db.query()` with `apiClient.getClients()`, `apiClient.createClient()`, etc.

### 3️⃣ Editors.tsx (2 Supabase calls)
**Calls to replace**:
- Line 58: `supabase.auth.getUser()` → `apiClient.getCurrentUser()`
- Line 85: `supabase.auth.getUser()` → `apiClient.getCurrentUser()`
- Replace `db.query()` with `apiClient.getEditors()`, `apiClient.createEditor()`, etc.

### 4️⃣ Chat.tsx (1 Supabase call + WebSocket)
**Calls to replace**:
- Line 34: `supabase.auth.getSession()` → `apiClient.getCurrentUser()`
- Use WebSocket client for real-time messaging (already implemented)

### 5️⃣ Invoices.tsx (3 Supabase calls)
**Calls to replace**:
- Line 45: `supabase.auth.getUser()` → `apiClient.getCurrentUser()`
- Line 55: `supabase.auth.getUser()` → `apiClient.getCurrentUser()`
- Line 107: `supabase.auth.getUser()` → `apiClient.getCurrentUser()`
- Replace `db.query()` with `apiClient.getPayments()`, `apiClient.createPayment()`, etc.

### 6️⃣ VideoPreview.tsx (2 Supabase calls)
**Calls to replace**:
- Line 32: `supabase.auth.getSession()` → `apiClient.getCurrentUser()`
- Line 115: `supabase.auth.getUser()` → `apiClient.getCurrentUser()`

---

## 🔄 STANDARD REFACTORING PATTERN

### Step 1: Update Imports
```typescript
// REMOVE
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/database-config"; // if present

// ADD
import { apiClient } from "@/lib/api-client";
```

### Step 2: Replace Auth Calls
```typescript
// BEFORE
const { data: { session } } = await supabase.auth.getSession();
if (!session) navigate("/auth");
const userId = session.user.id;

// AFTER
const user = await apiClient.getCurrentUser();
if (!user) navigate("/auth");
const userId = user.id;
```

### Step 3: Add Error Handling
```typescript
// BEFORE
try {
  const data = await supabase.from('projects').select();
} catch (error) {
  toast.error("Failed");
}

// AFTER
try {
  const data = await apiClient.getProjects();
} catch (error) {
  if (error.message?.includes('Unauthorized')) {
    navigate("/auth");
  } else {
    toast.error("Failed to load data");
  }
}
```

### Step 4: Replace CRUD Operations
```typescript
// BEFORE (db.query)
await db.query({
  collection: 'clients',
  operation: 'select',
  where: { creator_id: userId }
});

// AFTER (API Client)
await apiClient.getClients();
```

---

## 🧪 TESTING EACH FILE

After refactoring each file:

```bash
# 1. Start dev server
npm run dev

# 2. Navigate to the page in browser

# 3. Check for:
✅ Page loads without errors
✅ Data displays correctly
✅ Create/Update/Delete operations work
✅ Auth redirects work
✅ No Supabase calls in Network tab
✅ All API calls go to localhost:3001

# 4. Check browser console for errors
# Should see: GET http://localhost:3001/api/projects → 200 OK
# Should NOT see: supabase.co requests
```

---

## 📊 PROGRESS TRACKING

Update `PHASE_7_PROGRESS_TRACKER.md` after each file:

```markdown
- [x] src/pages/ProjectDetails.tsx - ✅ MIGRATED (timestamp)
```

---

## 🚨 COMMON ISSUES & SOLUTIONS

### Issue 1: "401 Unauthorized"
**Cause**: No JWT token or expired token  
**Solution**: Login again, check localStorage for 'auth_token'

### Issue 2: "404 Not Found" on API call
**Cause**: Backend not running or wrong endpoint  
**Solution**: 
```bash
# Check if backend is running
curl http://localhost:3001/api/health
# Should return: {"status":"ok"}

# If not running, start it:
npm run server:dev
```

### Issue 3: "Network Error"
**Cause**: CORS or backend not accessible  
**Solution**: Check backend CORS config allows localhost:8080

### Issue 4: Data not loading
**Cause**: API method doesn't match backend route  
**Solution**: Check `src/server/routes/` for correct endpoint

### Issue 5: WebSocket not connecting
**Cause**: WebSocket server not running  
**Solution**: 
```bash
# WebSocket runs on same server (port 3001)
# Check browser console for "WebSocket connected"
```

---

## 📅 REMAINING SCHEDULE

### Day 2 (Tomorrow): Admin Pages (6 hours)
- Migrate 11 admin pages
- Test admin functionality
- Update progress tracker

### Day 3: Components & Pages (6 hours)
- Migrate 4 remaining pages
- Migrate 12 components
- Delete SupabaseConnectionTest.tsx

### Day 4: Testing (6 hours)
- Unit tests
- Integration tests
- E2E tests
- Bug fixes

### Day 5: Deployment (4 hours)
- Build production
- Deploy to VPS
- Configure SSL/Nginx
- Monitor for 24 hours

---

## ✅ SUCCESS CRITERIA FOR TODAY

By end of Day 1, you should have:
- [ ] 8/35 files migrated (23%)
- [ ] All Priority 1 pages working
- [ ] No Supabase calls in these 8 files
- [ ] All tests passing for migrated files
- [ ] Dashboard, Projects, Clients, Editors, Chat, Invoices, ProjectDetails, VideoPreview working

---

## 🎯 START HERE

**Your next action**:
1. Open `src/pages/ProjectDetails.tsx` 
2. Follow the refactoring pattern above
3. Test it works
4. Move to next file (Clients.tsx)
5. Repeat for all 6 remaining Priority 1 files

**Need help?** Refer to:
- `PHASE_7_COMPLETION_CHECKLIST.md` - Overall checklist
- `PHASE_7_PROGRESS_TRACKER.md` - Real-time progress
- `Dashboard.tsx` or `Projects.tsx` - Reference implementations

---

**You've got this! 🚀**  
The infrastructure is solid. Now it's just systematic execution.
