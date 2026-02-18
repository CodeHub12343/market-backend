# 📊 Campus Data Flow Visualization

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER APPLICATION                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  User Signs Up                                                    │
│    ↓                                                              │
│  Selects Campus (REQUIRED)  ← User chooses: UNILAG, OAU, ABU     │
│    ↓                                                              │
│  Campus stored in User Profile                                   │
│    ↓                                                              │
│  User logs in → Gets JWT Token (contains campus: "111")          │
│    ↓                                                              │
│  All future requests include this token                          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    API REQUEST HANDLER                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. Verify JWT Token                                             │
│     ↓ Extract user info (including campus: "111")                │
│                                                                   │
│  2. Check if request has allCampuses=true parameter              │
│     ↓                                                             │
│     YES → Remove campus filter (show all universities)           │
│     NO → Apply campus filter (show only campus "111")            │
│                                                                   │
│  3. Build MongoDB Query with appropriate filter                  │
│     Default:   { campus: "111", archived: false }                │
│     AllCamp:   { archived: false }  (no campus filter)           │
│                                                                   │
│  4. Execute query, return results                                │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE (MongoDB)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Documents Collection                                             │
│  ├─ { title: "CS101", campus: "111", visibility: "public" }      │
│  ├─ { title: "OS200", campus: "111", visibility: "campus" }      │
│  ├─ { title: "Physics", campus: "222", visibility: "public" }    │
│  ├─ { title: "Chemistry", campus: "222", visibility: "campus" }  │
│  └─ { title: "Math", campus: "333", visibility: "public" }       │
│                                                                   │
│  Products Collection                                              │
│  ├─ { name: "Laptop", campus: "111", status: "active" }          │
│  ├─ { name: "Textbook", campus: "111", status: "active" }        │
│  ├─ { name: "Phone", campus: "222", status: "active" }           │
│  └─ { name: "Desk", campus: "333", status: "active" }            │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Request Flow: Signed-In User

```
SCENARIO: UNILAG Student (campus ID: 111) searches documents

┌────────────────────────────────────────────────────────┐
│ FRONTEND                                               │
│                                                        │
│ User clicks "Search Documents"                         │
│ ↓                                                      │
│ API Call:                                              │
│ GET /api/v1/documents                                 │
│ Headers: Authorization: Bearer JWT_TOKEN              │
│          (JWT contains: user.campus = "111")           │
│                                                        │
└────────────────┬─────────────────────────────────────┘
                 ↓
┌────────────────────────────────────────────────────────┐
│ BACKEND                                                │
│                                                        │
│ 1. Authenticate request                               │
│    ✓ Extract user from JWT                            │
│    ✓ User.campus = "111" (UNILAG)                     │
│                                                        │
│ 2. Check allCampuses parameter                        │
│    Query: { allCampuses: ??? }                        │
│    → NOT present in this request                      │
│                                                        │
│ 3. Build filter                                       │
│    filter = {                                         │
│      archived: false,                                 │
│      campus: "111"  ← AUTO ADDED (default security)   │
│    }                                                  │
│                                                        │
│ 4. Execute MongoDB query                             │
│    db.documents.find(filter)                         │
│                                                        │
│ 5. Results:                                           │
│    ✓ CS101 Notes (campus 111)                        │
│    ✓ OS200 Lectures (campus 111)                     │
│    ✗ Physics Lab (campus 222) - FILTERED OUT          │
│    ✗ Chemistry Notes (campus 222) - FILTERED OUT      │
│                                                        │
│ 6. Return to frontend                                │
│    { status: "success", results: 2, data: [...] }    │
│                                                        │
└────────────────┬─────────────────────────────────────┘
                 ↓
┌────────────────────────────────────────────────────────┐
│ FRONTEND                                               │
│                                                        │
│ Display results:                                       │
│ [✓] CS101 Notes                                       │
│ [✓] OS200 Lectures                                    │
│                                                        │
│ User sees ONLY their campus documents!                │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## Request Flow: "View All Campuses"

```
SCENARIO: Same UNILAG Student explicitly requests all campuses

┌────────────────────────────────────────────────────────┐
│ FRONTEND                                               │
│                                                        │
│ User clicks "View All Universities"                   │
│ ↓                                                      │
│ API Call:                                              │
│ GET /api/v1/documents?allCampuses=true                │
│ Headers: Authorization: Bearer JWT_TOKEN              │
│          (JWT contains: user.campus = "111")           │
│                                                        │
└────────────────┬─────────────────────────────────────┘
                 ↓
┌────────────────────────────────────────────────────────┐
│ BACKEND                                                │
│                                                        │
│ 1. Authenticate request                               │
│    ✓ Extract user from JWT                            │
│    ✓ User.campus = "111" (UNILAG)                     │
│                                                        │
│ 2. Check allCampuses parameter                        │
│    Query: { allCampuses: 'true' }                     │
│    → PRESENT and TRUE!                                │
│                                                        │
│ 3. Build filter (NO default campus filter)            │
│    filter = {                                         │
│      archived: false                                  │
│      // ← NO campus filter added (user explicitly     │
│      //   requested cross-campus view)                │
│    }                                                  │
│                                                        │
│ 4. Execute MongoDB query                             │
│    db.documents.find(filter)                         │
│                                                        │
│ 5. Results:                                           │
│    ✓ CS101 Notes (campus 111)                        │
│    ✓ OS200 Lectures (campus 111)                     │
│    ✓ Physics Lab (campus 222) - NOW INCLUDED!         │
│    ✓ Chemistry Notes (campus 222) - NOW INCLUDED!     │
│    ✓ Math Fundamentals (campus 333) - NOW INCLUDED!   │
│                                                        │
│ 6. Return to frontend                                │
│    { status: "success", results: 5, data: [...] }    │
│                                                        │
└────────────────┬─────────────────────────────────────┘
                 ↓
┌────────────────────────────────────────────────────────┐
│ FRONTEND                                               │
│                                                        │
│ Display results:                                       │
│ [✓] CS101 Notes (UNILAG)                              │
│ [✓] OS200 Lectures (UNILAG)                           │
│ [✓] Physics Lab (OAU)      ← Different campus!        │
│ [✓] Chemistry Notes (OAU)  ← Different campus!        │
│ [✓] Math Fundamentals (ABU) ← Different campus!       │
│                                                        │
│ User now sees documents from ALL campuses!            │
│ (Still respects visibility settings though)           │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## Request Flow: Guest User (No Authentication)

```
SCENARIO: Guest (not logged in) visits the platform

┌────────────────────────────────────────────────────────┐
│ FRONTEND                                               │
│                                                        │
│ Guest browses documents without logging in            │
│ ↓                                                      │
│ API Call:                                              │
│ GET /api/v1/documents                                 │
│ Headers: (NO Authorization header)                    │
│                                                        │
└────────────────┬─────────────────────────────────────┘
                 ↓
┌────────────────────────────────────────────────────────┐
│ BACKEND                                                │
│                                                        │
│ 1. Authenticate request                               │
│    ✗ NO JWT token present                             │
│    ✗ req.user = undefined                             │
│                                                        │
│ 2. Check allCampuses parameter                        │
│    Query: { allCampuses: ??? }                        │
│    → NOT present                                      │
│                                                        │
│ 3. Build filter (Guests see only PUBLIC docs)         │
│    if (!req.user) {                                   │
│      filter = {                                       │
│        visibility: 'public'  ← Force public only       │
│      }                                                │
│    }                                                  │
│                                                        │
│ 4. Execute MongoDB query                             │
│    db.documents.find({ visibility: 'public' })       │
│                                                        │
│ 5. Results:                                           │
│    ✓ Physics Lab (campus 222, public)                 │
│    ✓ Math Fundamentals (campus 333, public)           │
│    ✗ CS101 Notes (campus 111, campus) - PRIVATE       │
│    ✗ OS200 Lectures (campus 111, campus) - PRIVATE    │
│                                                        │
│ 6. Return to frontend                                │
│    { status: "success", results: 2, data: [...] }    │
│                                                        │
└────────────────┬─────────────────────────────────────┘
                 ↓
┌────────────────────────────────────────────────────────┐
│ FRONTEND                                               │
│                                                        │
│ Display results:                                       │
│ [✓] Physics Lab (from OAU)                            │
│ [✓] Math Fundamentals (from ABU)                      │
│                                                        │
│ Guest sees only PUBLIC documents (no login needed)    │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## Campus Change Scenario

```
USER CHANGES CAMPUS

Timeline:
┌─────────────────────────────────────────────────────┐
│ 10:00 AM - User is in UNILAG campus                 │
│           campus = "111"                            │
│                                                     │
│  Searches documents:                                │
│  GET /api/v1/documents                             │
│  → Sees: CS101, OS200 (from campus 111)             │
│                                                     │
├─────────────────────────────────────────────────────┤
│ 10:30 AM - User updates profile, changes to OAU    │
│           campus = "222" (in database)              │
│           Old JWT token still valid (expires later) │
│                                                     │
│  Searches documents again:                          │
│  GET /api/v1/documents                             │
│  Problem: Old token still has campus="111"          │
│  → Sees: CS101, OS200 (OLD campus, cached token)    │
│                                                     │
├─────────────────────────────────────────────────────┤
│ 10:35 AM - User logs out and back in                │
│           Gets NEW JWT token with campus="222"      │
│                                                     │
│  Searches documents:                                │
│  GET /api/v1/documents                             │
│  → Sees: Physics Lab, Chemistry (from campus 222)   │
│  → Problem FIXED! Now sees correct campus           │
│                                                     │
└─────────────────────────────────────────────────────┘

SOLUTION: Recommend re-login after campus change
OR: Use refresh token endpoint to get new JWT
OR: Store campus in secure cookie separate from JWT
```

---

## Campus Filtering Rules Matrix

```
┌──────────────────┬─────────────────┬──────────────────┬─────────────────┐
│ User Type        │ Authenticated?  │ Sees by Default  │ Can See All?    │
├──────────────────┼─────────────────┼──────────────────┼─────────────────┤
│                  │                 │                  │                 │
│ UNILAG Student   │ ✓ YES           │ UNILAG docs      │ ✓ YES           │
│ (campus: 111)    │ (has JWT token) │ Only!            │ (?allCampuses   │
│                  │                 │                  │  =true)         │
│                  │                 │                  │                 │
├──────────────────┼─────────────────┼──────────────────┼─────────────────┤
│                  │                 │                  │                 │
│ OAU Student      │ ✓ YES           │ OAU docs         │ ✓ YES           │
│ (campus: 222)    │ (has JWT token) │ Only!            │ (?allCampuses   │
│                  │                 │                  │  =true)         │
│                  │                 │                  │                 │
├──────────────────┼─────────────────┼──────────────────┼─────────────────┤
│                  │                 │                  │                 │
│ Guest/Visitor    │ ✗ NO            │ PUBLIC docs      │ ⚠️ LIMITED       │
│ (not logged in)  │ (no JWT token)  │ only             │ (must request   │
│                  │                 │                  │  specific       │
│                  │                 │                  │  campus)        │
│                  │                 │                  │                 │
└──────────────────┴─────────────────┴──────────────────┴─────────────────┘
```

---

## Security Enforcement Layers

```
Request → Backend
         ↓
┌────────────────────────────────────┐
│ Layer 1: Authentication            │
│ - Is JWT valid?                    │
│ - Is user verified?                │
│ YES ↓                              │
├────────────────────────────────────┤
│ Layer 2: Campus Filtering          │
│ - allCampuses=true?                │
│ - If NO → filter.campus = req.user │
│ - If YES → allow all campuses      │
│ ↓                                  │
├────────────────────────────────────┤
│ Layer 3: Visibility Restrictions   │
│ - Document visibility: 'public'    │
│ - 'campus' level → only campus     │
│ - 'private' → only owner           │
│ ↓                                  │
├────────────────────────────────────┤
│ Layer 4: Role-Based Access         │
│ - User role: buyer/seller/admin    │
│ - Does role allow this action?     │
│ ↓                                  │
Result: Filtered, secure data
```

---

## Data Isolation Visualization

```
PLATFORM WITH 3 CAMPUSES

┌──────────────────────────────────────────────────────────┐
│                      UNILAG Campus (111)                  │
│  Students: John, Mary, David                             │
│  Documents: CS101, OS200, Math101 (20 total)              │
│  Products: Laptop, Textbooks, Desk (15 total)             │
│  Roommates: 5 listings                                    │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                       OAU Campus (222)                    │
│  Students: Sarah, Ahmed, Emma                            │
│  Documents: Physics, Chemistry, Biology (18 total)        │
│  Products: Books, Phone, Laptop (12 total)                │
│  Roommates: 3 listings                                    │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                       ABU Campus (333)                    │
│  Students: Chukwu, Zainab, Peter                         │
│  Documents: Engineering, Economics, Law (16 total)        │
│  Products: Notes, Parts, Tools (10 total)                 │
│  Roommates: 4 listings                                    │
└──────────────────────────────────────────────────────────┘

When John (UNILAG) logs in:
┌──────────────────────────────────────────────────────────┐
│                    John's Visible Data                    │
│  ✓ UNILAG: CS101, OS200, Math101, Laptop, Textbooks      │
│  ✗ OAU: (hidden by default)                               │
│  ✗ ABU: (hidden by default)                               │
│  Total visible: 35 items (UNILAG only)                    │
│                                                          │
│  If John clicks "View All Universities":                │
│  ✓ UNILAG: CS101, OS200, ... (20 items)                  │
│  ✓ OAU: Physics, Chemistry, ... (18 items)                │
│  ✓ ABU: Engineering, Economics, ... (16 items)            │
│  Total visible: 54 items (all campuses)                   │
└──────────────────────────────────────────────────────────┘
```

---

## Transition from Products (Current) to Products (Fixed)

```
BEFORE (Current - No Campus Isolation):
────────────────────────────────────────
User John (UNILAG) searches: GET /api/v1/products/search/advanced

Filter built: { status: 'active' }  ← Campus NOT applied
Results: All products from all campuses (15 + 12 + 10 = 37 items)

John sees:
  [✓] Laptop (UNILAG)
  [✓] Laptop (OAU)        ← Different campus!
  [✓] Phone (OAU)         ← Different campus!
  [✓] Tools (ABU)         ← Different campus!
  ... and many more

Problem: Confusing results, no campus isolation


AFTER (Fixed - With Campus Isolation):
───────────────────────────────────────
User John (UNILAG) searches: GET /api/v1/products/search/advanced

Filter built: { status: 'active', campus: '111' }  ← Campus applied!
Results: Products from ONLY UNILAG campus (15 items)

John sees:
  [✓] Laptop (UNILAG)
  [✓] Textbooks (UNILAG)
  [✓] Desk (UNILAG)
  ... only UNILAG products

Clear, focused results! If John wants to see other campuses:
GET /api/v1/products/search/advanced?allCampuses=true
Then: All 37 products shown
```

---

**Generated**: January 13, 2026  
**Purpose**: Campus Data Handling Architecture Visualization  
**For**: Product Teams, Developers, QA Engineers  
**Status**: Current Implementation (Documents ✅, Products ⚠️)
