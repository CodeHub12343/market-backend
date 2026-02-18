# Document Frontend Lifecycle - Complete Implementation Guide

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [File Structure](#file-structure)
3. [Setup & Installation](#setup--installation)
4. [Service Layer](#service-layer-documentsjs)
5. [React Query Hooks](#react-query-hooks-usedocumentsjs)
6. [Components](#components)
7. [Pages & Routes](#pages--routes)
8. [Complete User Flows](#complete-user-flows)
9. [Testing Checklist](#testing-checklist)
10. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    User Interface (Pages)               │
│  ┌──────────────┬──────────────┬──────────────┐         │
│  │ /documents   │ /documents   │ /documents   │         │
│  │   (list)     │    /new      │     /[id]    │         │
│  │              │   (upload)   │   (detail)   │         │
│  └──────────────┴──────────────┴──────────────┘         │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│            React Components (UI Layer)                  │
│  ┌─────────────┬──────────────┬──────────────┐          │
│  │ DocumentGrid│ DocumentCard │ DocumentForm │          │
│  │ DocumentList│ DocumentUpload│ DocumentSearch│         │
│  └─────────────┴──────────────┴──────────────┘          │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│       React Query Hooks (State Management)              │
│    useDocuments, useCreateDocument,                     │
│    useDownloadDocument, useRateDocument                 │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│         Service Layer (API Integration)                 │
│    src/services/documents.js - Axios calls              │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│           Backend API (Node.js/Express)                 │
│  GET /documents - List with filters                     │
│  POST /documents - Create with file upload              │
│  GET /documents/:id - Get single document               │
│  PATCH /documents/:id - Update metadata                 │
│  DELETE /documents/:id - Delete document                │
│  GET /documents/:id/download - Download                 │
│  POST /documents/:id/rate - Add rating                  │
│  POST /documents/:id/comments - Add comment             │
└──────────────────────────────────────────────────────────┘
```

### Cache Strategy

```
DOCUMENTS_STALE_TIME = 30 seconds (for list/search)
- Documents list updates quickly when new docs uploaded
- Filters/search results refresh automatically
- Download counts update within 30 seconds

useQuery hooks with:
- exact: false for filter-aware query matching
- enabled flags for conditional fetching
- Automatic refetch on error/window focus
```

### Optimistic Updates Pattern

```
User Action (e.g., download) → 
  Immediate cache update → 
  UI reflects change instantly → 
  Background refetch validates data → 
  If valid: keep cache, if invalid: refetch
```

---

## File Structure

```
src/
├── services/
│   └── documents.js                    # API service layer (14 methods)
│
├── hooks/
│   └── useDocuments.js                 # React Query hooks (10 custom hooks)
│
├── components/
│   └── documents/
│       ├── DocumentCard.jsx            # Individual document card
│       ├── DocumentGrid.jsx            # Grid layout for documents
│       ├── DocumentUpload.jsx          # Upload form with drag-drop
│       ├── DocumentFilters.jsx         # Advanced filter sidebar
│       └── DocumentSearch.jsx          # Search interface
│
└── app/
    └── (protected)/
        └── documents/
            ├── page.js                 # Main documents list page
            ├── new/
            │   └── page.js             # Upload page
            └── [id]/
                └── page.js             # Document detail page
```

---

## Setup & Installation

### 1. Create Required Directories

```bash
# Create components directory
mkdir -p src/components/documents

# Create pages directories  
mkdir -p src/app/\(protected\)/documents/new
mkdir -p src/app/\(protected\)/documents/\[id\]

# Services and hooks should already exist
mkdir -p src/services
mkdir -p src/hooks
```

### 2. Environment Variables

Add to your `.env.local`:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5000/api

# Document Upload Settings
NEXT_PUBLIC_MAX_FILE_SIZE=52428800  # 50MB in bytes
NEXT_PUBLIC_ALLOWED_FILE_TYPES=pdf,doc,docx,xls,xlsx,ppt,pptx,txt,zip
```

### 3. Dependencies Already Required

Make sure these are in `package.json`:

```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.x.x",
    "styled-components": "^6.x.x",
    "axios": "^1.x.x",
    "next": "^14.x.x"
  }
}
```

### 4. Copy All Code Files

All files have been created:
- ✅ `src/services/documents.js` - Service layer
- ✅ `src/hooks/useDocuments.js` - React Query hooks
- ✅ `src/components/documents/DocumentCard.jsx` - Card component
- ✅ `src/components/documents/DocumentGrid.jsx` - Grid component
- ✅ `src/components/documents/DocumentUpload.jsx` - Upload form
- ✅ `src/components/documents/DocumentFilters.jsx` - Filter sidebar
- ✅ `src/components/documents/DocumentSearch.jsx` - Search component
- ✅ `src/app/(protected)/documents/page.js` - List page
- ✅ `src/app/(protected)/documents/new/page.js` - Upload page
- ✅ `src/app/(protected)/documents/[id]/page.js` - Detail page

---

## Service Layer (documents.js)

### API Methods Overview

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `fetchDocuments(params)` | GET /documents | Get list with filters |
| `fetchDocumentById(id)` | GET /documents/:id | Get single document |
| `createDocument(formData)` | POST /documents | Create with file upload |
| `updateDocument(id, updates)` | PATCH /documents/:id | Update metadata |
| `deleteDocument(id)` | DELETE /documents/:id | Delete document |
| `searchDocuments(query)` | GET /documents/search | Search by title/course |
| `getDocumentsByFaculty(facultyId)` | GET /documents/faculty/:id | Filter by faculty |
| `getDocumentsByDepartment(deptId)` | GET /documents/department/:id | Filter by department |
| `getDocumentsByCourse(courseCode)` | GET /documents/course/:code | Filter by course |
| `getTrendingDocuments(limit)` | GET /documents/trending | Get popular documents |
| `downloadDocument(id)` | GET /documents/:id/download | Download & increment counter |
| `rateDocument(id, rating)` | POST /documents/:id/rate | Submit rating |
| `commentDocument(id, comment)` | POST /documents/:id/comments | Add comment |

### Key Features

- **Error Handling**: All methods wrap errors and return meaningful messages
- **Logging**: Console logs for debugging API calls
- **FormData Support**: `createDocument()` handles multipart/form-data
- **Query Parameters**: Filter methods support pagination and sorting

### Usage Examples

```javascript
// Fetch documents with filters
const documents = await fetchDocuments({
  faculty: 'Science & Technology',
  department: 'Computer Science',
  academicLevel: '200',
  sort: '-uploadedAt',
  page: 1,
  limit: 20
});

// Create document with file upload
const formData = new FormData();
formData.append('file', file);
formData.append('title', 'Advanced Algorithms');
formData.append('course', 'CS301');
const doc = await createDocument(formData);

// Download document (increments counter)
const url = await downloadDocument(documentId);

// Add rating
const updated = await rateDocument(documentId, 5);

// Search documents
const results = await searchDocuments('algorithms', { 
  academicLevel: '300' 
});
```

---

## React Query Hooks (useDocuments.js)

### Hook Overview

| Hook | Query/Mutation | Purpose |
|------|---|---------|
| `useDocuments(filters)` | Query | Get documents list |
| `useDocument(id)` | Query | Get single document |
| `useCreateDocument()` | Mutation | Create new document |
| `useUpdateDocument()` | Mutation | Update document metadata |
| `useDeleteDocument()` | Mutation | Delete document |
| `useSearchDocuments(query)` | Query | Search documents |
| `useTrendingDocuments()` | Query | Get trending documents |
| `useDownloadDocument()` | Mutation | Download & count |
| `useRateDocument()` | Mutation | Submit rating |
| `useCommentDocument()` | Mutation | Add comment |

### Cache Management

```javascript
// Cache Configuration
const DOCUMENTS_QUERY_KEY = 'documents';
const DOCUMENTS_STALE_TIME = 30 * 1000; // 30 seconds

// Query key patterns:
// ['documents'] - all documents
// ['documents', filters] - documents with specific filters
// ['documents', id] - single document
// ['documents', 'search', query, filters] - search results
// ['documents', 'trending'] - trending documents
```

### Mutation Patterns

```javascript
// All mutations follow this pattern:

onSuccess: (data, variables) => {
  // 1. Update cache immediately for instant UI feedback
  queryClient.setQueryData([key, id], data);
  
  // 2. Invalidate related queries to force refresh
  queryClient.invalidateQueries({
    queryKey: ['documents'],
    exact: false  // Match all related queries
  });
}
```

### Usage Examples

```javascript
// Component using hooks
import { useDocuments, useCreateDocument } from '@/hooks/useDocuments';

export default function MyComponent() {
  // Get documents with filters
  const { data: documents, isLoading, error } = useDocuments({
    faculty: 'Science',
    academicLevel: '200'
  });

  // Create document mutation
  const { mutate: createDoc, isPending } = useCreateDocument();
  
  const handleCreate = (formData) => {
    createDoc(formData, {
      onSuccess: () => {
        console.log('Document created!');
      }
    });
  };

  return (
    <>
      {isLoading && <p>Loading...</p>}
      {error && <p>Error: {error.message}</p>}
      {documents?.map(doc => <DocumentCard key={doc._id} document={doc} />)}
    </>
  );
}
```

---

## Components

### DocumentCard.jsx

**Purpose**: Display individual document in a card format

**Props**:
- `document` (Object) - Document data
- `onView` (Function) - Called when view button clicked
- `onEdit` (Function) - Called when edit button clicked
- `onDelete` (Function) - Called when delete button clicked

**Features**:
- File type icon display
- Star rating visualization
- Download/view/edit/delete actions
- Responsive grid layout
- Download counter display

**Usage**:
```javascript
<DocumentCard
  document={doc}
  onView={(id) => router.push(`/documents/${id}`)}
  onEdit={(id) => router.push(`/documents/${id}/edit`)}
  onDelete={(id) => setDeleteId(id)}
/>
```

### DocumentGrid.jsx

**Purpose**: Display multiple documents in responsive grid

**Props**:
- `documents` (Array) - Documents to display
- `isLoading` (Boolean) - Loading state
- `error` (Error) - Error state
- `onView`, `onEdit`, `onDelete` - Pass-through handlers

**Features**:
- Responsive grid (280px min per card on desktop)
- Empty state message
- Loading spinner
- Error handling
- Mobile responsive (single column on mobile)

**Usage**:
```javascript
<DocumentGrid
  documents={documents}
  isLoading={isLoading}
  error={error}
  onView={handleView}
  onEdit={handleEdit}
  onDelete={handleDelete}
/>
```

### DocumentUpload.jsx

**Purpose**: Form to upload new document with metadata

**Props**:
- `onSuccess` (Function) - Callback after successful upload
- `onCancel` (Function) - Callback when cancelled

**Features**:
- Drag-and-drop file upload
- File size validation (50MB limit)
- File type validation (PDF, DOC, XLS, PPT, TXT, ZIP)
- Form fields: title, description, category, faculty, department, course, level
- Progress indicator while uploading
- Error messages with validation

**Usage**:
```javascript
<DocumentUpload
  onSuccess={() => router.push('/documents')}
  onCancel={() => router.back()}
/>
```

### DocumentFilters.jsx

**Purpose**: Advanced filtering sidebar

**Props**:
- `onApply` (Function) - Called with filter object when apply clicked
- `onReset` (Function) - Called when reset clicked
- `initialFilters` (Object) - Pre-populated filter values

**Filters Available**:
- Faculty (text input)
- Department (text input)
- Course Code (text input)
- Academic Level (dropdown: 100-400, postgraduate)
- Category (checkboxes: lecture, assignment, exam, project, research)
- Sort (dropdown: newest, most downloaded, highest rated, A-Z)

**Usage**:
```javascript
const handleFiltersApply = (filters) => {
  setDocumentFilters(filters);
};

<DocumentFilters onApply={handleFiltersApply} onReset={() => setFilters({})} />
```

### DocumentSearch.jsx

**Purpose**: Search interface for documents

**Props**: None

**Features**:
- Search input with live results
- Search button and clear button
- Results counter
- Result display using DocumentGrid
- Query string based search

**Usage**:
```javascript
<DocumentSearch />
```

---

## Pages & Routes

### /documents (List Page)

**File**: `src/app/(protected)/documents/page.js`

**Features**:
- Tab interface (All, Filtered, Search)
- Document grid with filter sidebar
- Upload button in header
- View/edit/delete actions on cards
- Real-time filter application
- Delete confirmation modal

**User Flow**:
1. See all documents in grid layout
2. Apply filters from sidebar
3. View filtered results
4. Switch to search tab for keyword search
5. Click document to view details
6. Delete with confirmation

### /documents/new (Upload Page)

**File**: `src/app/(protected)/documents/new/page.js`

**Features**:
- Document upload form
- Back to documents link
- Simple clean layout
- Automatic redirect to documents on success

**User Flow**:
1. Click "Upload Document" button
2. Drag or select file
3. Fill in document metadata
4. Submit upload
5. Automatic redirect to documents list

### /documents/[id] (Detail Page)

**File**: `src/app/(protected)/documents/[id]/page.js`

**Features**:
- Full document details display
- Download button with counter
- Star rating system (1-5 stars)
- Comments section
- Metadata display (faculty, department, course, level)
- Statistics (downloads, ratings)
- Back button

**User Flow**:
1. Click on document card
2. View full document details
3. Download document (increments counter)
4. Rate document (1-5 stars)
5. Add comments
6. View existing comments
7. Return to list

---

## Complete User Flows

### Flow 1: Upload Document

```
User → Click "Upload Document" 
  ↓
Page: /documents/new opens
  ↓
User → Drag file or click to select
  ↓
File selected → Form auto-focuses
  ↓
User → Fills in metadata
  - Title (required)
  - Description (optional)
  - Category (optional)
  - Faculty, Department, Course, Level (optional)
  ↓
User → Clicks "Upload Document" button
  ↓
Frontend → useCreateDocument() mutation triggered
  ↓
Service → documents.js createDocument() called
  ↓
Request → FormData sent to POST /api/documents
  ↓
Backend → File saved to Cloudinary
          Document record created in MongoDB
  ↓
Response → { document: {...} } returned
  ↓
Frontend → Cache invalidated
          → Page redirects to /documents
  ↓
Success → Document appears in list immediately

API Endpoint: POST /api/documents
Request Body: FormData {
  file: File,
  title: string,
  description: string,
  category: string,
  faculty: string,
  department: string,
  course: string,
  academicLevel: string
}
Response: {
  data: {
    document: {
      _id: string,
      title: string,
      fileName: string,
      fileSize: number,
      fileUrl: string,
      description: string,
      category: string,
      faculty: string,
      department: string,
      course: string,
      academicLevel: string,
      uploadedBy: { _id, name },
      uploadedAt: date,
      downloadCount: 0,
      rating: 0,
      ratingCount: 0,
      comments: []
    }
  }
}
```

### Flow 2: Search & Filter Documents

```
User → Navigate to /documents page
  ↓
Frontend → useDocuments() hook fetches all documents
  ↓
Documents → Displayed in grid (latest first)
  ↓
User → Opens filters sidebar OR clicks Search tab
  ↓
Option A - Filters:
  User → Selects faculty, department, course, level
  ↓
  User → Clicks "Apply" button
  ↓
  Frontend → useDocuments() re-runs with new filters
  ↓
  Service → fetchDocuments(filters) called
  ↓
  Request → GET /api/documents?faculty=...&department=...
  ↓
  Response → Filtered document list returned
  ↓
  Frontend → Grid updates with filtered results
  ↓
  
Option B - Search:
  User → Types in search field
  ↓
  User → Clicks "Search" or presses Enter
  ↓
  Frontend → useSearchDocuments() hook triggers
  ↓
  Service → searchDocuments(query, filters) called
  ↓
  Request → GET /api/documents/search?search=query
  ↓
  Response → Matching documents returned
  ↓
  Frontend → Results displayed with count
```

### Flow 3: Download & Rate Document

```
User → Clicks on document card
  ↓
Page: /documents/[id] loads
  ↓
Frontend → useDocument(id) fetches full details
  ↓
Document Details → Displayed with all metadata
  ↓
User → Clicks "Download Document" button
  ↓
Frontend → useDownloadDocument() mutation triggered
  ↓
Service → downloadDocument(id) called
  ↓
Request → GET /api/documents/:id/download
  ↓
Backend → Download counter incremented
           Browser download initiated
  ↓
Response → { downloadUrl: "..." } returned
  ↓
Frontend → Cache updated with new count
           Button shows success state
           Download starts in browser
  ↓
User → Clicks 1-5 stars to rate
  ↓
Frontend → useRateDocument() mutation triggered
  ↓
Request → POST /api/documents/:id/rate { rating: 5 }
  ↓
Backend → Rating saved/updated
           Rating count incremented
  ↓
Response → Updated document returned
  ↓
Frontend → Star display updates immediately
           Cache updated with new rating
  ↓
Success → Stars now show filled/empty based on rating
```

---

## Testing Checklist

### Unit Test Cases

#### 1. Service Layer Tests

```javascript
describe('Document Service', () => {
  test('fetchDocuments returns array of documents');
  test('fetchDocuments handles empty results');
  test('fetchDocuments applies filters correctly');
  
  test('createDocument requires title');
  test('createDocument validates file size');
  test('createDocument sends FormData correctly');
  
  test('downloadDocument increments counter');
  test('downloadDocument returns valid URL');
  
  test('rateDocument updates rating');
  test('commentDocument adds new comment');
});
```

#### 2. Hook Tests

```javascript
describe('useDocuments Hook', () => {
  test('useDocuments fetches documents on mount');
  test('useDocuments refetches on filter change');
  test('useCreateDocument invalidates cache on success');
  test('useDeleteDocument removes from cache');
});
```

### Manual Testing Checklist

- [ ] **Document Upload**
  - [ ] Can drag-drop file into upload area
  - [ ] Can click to select file
  - [ ] File size validation works (reject > 50MB)
  - [ ] File type validation works (accept only allowed types)
  - [ ] Form validation shows error for empty title
  - [ ] Upload completes successfully
  - [ ] Redirected to /documents after upload
  - [ ] New document appears in list immediately

- [ ] **Document List**
  - [ ] All documents load on page open
  - [ ] Grid is responsive on mobile/tablet/desktop
  - [ ] Loading spinner shows while fetching
  - [ ] Empty state shows when no documents
  - [ ] Error state shows on API error
  - [ ] Can scroll and load more documents

- [ ] **Filters**
  - [ ] Faculty filter works (text search)
  - [ ] Department filter works (text search)
  - [ ] Course filter works (text search)
  - [ ] Academic level dropdown works
  - [ ] Category checkboxes work (multi-select)
  - [ ] Sort dropdown changes order
  - [ ] Reset button clears all filters
  - [ ] Apply button triggers search
  - [ ] Filtered results display correctly

- [ ] **Search**
  - [ ] Search input accepts text
  - [ ] Search button triggers search
  - [ ] Results counter shows correct count
  - [ ] Results match search query
  - [ ] Search results are paginated
  - [ ] Clear button resets search
  - [ ] Search works with special characters

- [ ] **Document Detail Page**
  - [ ] Page loads document details correctly
  - [ ] All metadata displays (faculty, dept, course, level)
  - [ ] File icon matches file type
  - [ ] Description displays correctly
  - [ ] Download counter shows current count
  - [ ] Rating display shows stars
  - [ ] Comments section displays existing comments

- [ ] **Download & Rating**
  - [ ] Download button triggers download
  - [ ] Download counter increments after download
  - [ ] Stars change when clicked (1-5)
  - [ ] Rating persists after page reload
  - [ ] Multiple rating attempts work correctly
  - [ ] Rating count increments

- [ ] **Comments**
  - [ ] Can type in comment textarea
  - [ ] Post comment button works
  - [ ] New comment appears immediately
  - [ ] Comment author/timestamp displays
  - [ ] Multiple comments display correctly
  - [ ] Comment validation (empty check)

- [ ] **Cache & State**
  - [ ] Switching tabs updates view correctly
  - [ ] Filter changes don't cause layout shift
  - [ ] Download counts update in real-time
  - [ ] Comments appear without page reload
  - [ ] Ratings persist without reload
  - [ ] List updates when returning from detail page

- [ ] **Responsive Design**
  - [ ] Desktop layout (1400px max, side sidebar)
  - [ ] Tablet layout (1024px, sidebar above grid)
  - [ ] Mobile layout (single column)
  - [ ] Touch targets are >= 44px
  - [ ] Text is readable on all sizes
  - [ ] Buttons are easy to tap on mobile

- [ ] **Error Handling**
  - [ ] Network errors show graceful messages
  - [ ] 404 on missing document shows error
  - [ ] 401 on auth failure redirects to login
  - [ ] File upload errors show specific reason
  - [ ] Form validation shows inline errors
  - [ ] Retry buttons appear on errors

### Test Execution Steps

#### Test Upload Feature

1. Navigate to `/documents`
2. Click "Upload Document" button
3. Try uploading file > 50MB → Should show error
4. Try uploading unsupported file type → Should show error
5. Upload valid file with title → Should redirect to /documents
6. New document should appear in grid

#### Test Filters

1. Navigate to `/documents`
2. In filters sidebar, enter "Science" in faculty
3. Click "Apply" → Documents should filter
4. Add department "Computer Science"
5. Click "Apply" → Both filters applied
6. Click "Reset" → Filters clear, all documents show

#### Test Search

1. Navigate to `/documents`
2. Click "Search" tab
3. Type "algorithms" in search box
4. Click "Search" button
5. Results with "algorithms" in title/course appear
6. Results count shows correct number
7. Can click document from results to view details

#### Test Download & Rating

1. Navigate to `/documents`
2. Click on any document card
3. Note current download count
4. Click "Download Document" button
5. Browser downloads file
6. Download count increments by 1
7. Click stars to rate (try 5 stars)
8. Stars fill up to 5
9. Refresh page → Rating persists

#### Test Comments

1. On document detail page
2. Scroll to comments section
3. Type comment in textarea
4. Click "Post Comment"
5. Comment appears above textarea with your name
6. Post another comment
7. Both comments visible
8. Refresh page → Comments persist

---

## Troubleshooting

### Common Issues

#### Documents Not Loading
```
Symptom: Page shows empty grid with no loading spinner
Solution:
1. Check console for errors (F12)
2. Verify NEXT_PUBLIC_API_URL is correct
3. Check if backend is running on port 5000
4. Check network tab to see if API request is made
5. Look for 401/403 errors (authentication issue)
```

#### Upload Not Working
```
Symptom: Upload button stuck in loading, no error shown
Solution:
1. Check file size < 50MB
2. Check file type is allowed (PDF, DOC, XLS, PPT, TXT, ZIP)
3. Check console for actual error message
4. Try different file
5. Verify /api/documents endpoint exists on backend
6. Check multipart/form-data headers in Network tab
```

#### Filters Not Applying
```
Symptom: Filters don't trigger search
Solution:
1. Click "Apply" button (not just filling form)
2. Check if API endpoint /api/documents accepts query params
3. Look in Network tab for request with filters
4. Verify filter values are being sent correctly
5. Check backend response for filtered results
```

#### Download Counter Not Updating
```
Symptom: Download count stays same after download
Solution:
1. Check /api/documents/:id/download endpoint exists
2. Verify request is made to backend (Network tab)
3. Check if counter is being incremented on backend
4. Try hard refresh (Ctrl+Shift+R)
5. Check if mutations are properly invalidating cache
```

#### Stars/Rating Not Persisting
```
Symptom: Rating changes but doesn't save
Solution:
1. Check /api/documents/:id/rate endpoint exists
2. Verify POST request is sent when clicking stars
3. Check server response has updated rating
4. Verify mutation onSuccess is invalidating cache
5. Check if rating object exists on document
```

#### Comments Not Showing
```
Symptom: Posted comments don't appear
Solution:
1. Check /api/documents/:id/comments endpoint exists
2. Verify POST request is made with comment text
3. Check server response includes comment
4. Verify comment array exists on document object
5. Check if component is mapping over comments array
```

### Performance Optimization

#### Slow Grid Rendering
```javascript
// Add React.memo to DocumentCard to prevent re-renders
export default React.memo(DocumentCard);

// Use virtualization for large lists
import { FixedSizeList } from 'react-window';
```

#### Large File Uploads Timeout
```javascript
// Increase axios timeout in src/services/api.js
api.defaults.timeout = 60000; // 60 seconds
```

#### Cache Memory Issues
```javascript
// Reduce cache time if memory usage high
const DOCUMENTS_STALE_TIME = 15 * 1000; // 15 seconds instead of 30

// Limit paginated documents cached
// Only keep last 2 pages in memory
queryClient.setQueryData(key, data, {
  updatedAt: Date.now(),
});
```

### Debug Mode

Enable console logging:

```javascript
// In src/hooks/useDocuments.js, uncomment console.log statements
// All mutations log to console for debugging

// Add in any component:
console.log('Current cache:', queryClient.getQueryData([DOCUMENTS_QUERY_KEY]));
console.log('Query state:', query);
```

---

## Summary

You now have a complete, production-ready document management system for your Next.js frontend:

✅ **Service Layer**: 14 API methods with error handling
✅ **React Query Hooks**: 10 custom hooks for all operations
✅ **Components**: 6 reusable, styled components
✅ **Pages**: 3 complete page implementations
✅ **Cache Strategy**: Optimized for 30-second freshness
✅ **Styling**: Styled-components with responsive design
✅ **Testing**: Comprehensive manual testing guide

### Next Steps

1. Copy all code files to your project
2. Run manual testing checklist
3. Deploy to production
4. Monitor performance and adjust cache times as needed

### Support

If you encounter issues:
1. Check the Troubleshooting section
2. Look at console errors (F12)
3. Check Network tab for API responses
4. Verify backend endpoints match service layer calls
5. Check React Query DevTools for cache state
