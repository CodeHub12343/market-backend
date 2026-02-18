# 🏫 Campus Filtering - Quick Reference

## One-Minute Summary

| Use Case | Endpoint | Parameters | Default Behavior |
|----------|----------|-----------|------------------|
| 📚 **Get my campus documents** | `GET /api/v1/documents` | None | Returns ONLY your campus documents |
| 🌍 **Get all universities** | `GET /api/v1/documents` | `?allCampuses=true` | Returns documents from ALL campuses |
| 🏢 **Specific campus** | `GET /api/v1/documents` | `?allCampuses=true&campus=ID` | Returns documents from specific campus |

---

## Code Snippets

### JavaScript/Node.js

```javascript
// Option 1: Get my campus documents (DEFAULT)
const myDocs = await fetch('/api/v1/documents', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Option 2: Get all universities documents
const allDocs = await fetch('/api/v1/documents?allCampuses=true', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Option 3: Get specific campus documents
const otherCampus = await fetch('/api/v1/documents?allCampuses=true&campus=64a2b3c5d5e6f7g8h9i0j1k2', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Python

```python
import requests

headers = {'Authorization': f'Bearer {token}'}

# Option 1: My campus
response = requests.get('http://localhost:3000/api/v1/documents', headers=headers)

# Option 2: All campuses
response = requests.get('http://localhost:3000/api/v1/documents?allCampuses=true', headers=headers)

# Option 3: Specific campus
response = requests.get('http://localhost:3000/api/v1/documents?allCampuses=true&campus=ID', headers=headers)
```

### cURL

```bash
# Option 1: My campus (DEFAULT)
curl -X GET http://localhost:3000/api/v1/documents \
  -H "Authorization: Bearer $TOKEN"

# Option 2: All campuses
curl -X GET "http://localhost:3000/api/v1/documents?allCampuses=true" \
  -H "Authorization: Bearer $TOKEN"

# Option 3: Specific campus
curl -X GET "http://localhost:3000/api/v1/documents?allCampuses=true&campus=CAMPUS_ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Key Points

✅ **Default is secure**: Without passing `allCampuses=true`, you ONLY see your campus  
✅ **Easy override**: Just add `?allCampuses=true` to see all  
✅ **Access still controlled**: Document visibility/permissions still apply  
✅ **Sorting works**: Can combine with `sort=trending`, `sort=rated`, etc.  
✅ **Filtering works**: Can combine with `academicLevel=200`, `faculty=ID`, etc.

---

## Example URLs

```
# Your campus - newest first
/api/v1/documents?sort=newest

# All campuses - trending first  
/api/v1/documents?allCampuses=true&sort=trending

# Your campus - 200 level
/api/v1/documents?academicLevel=200

# All campuses - postgraduate level
/api/v1/documents?allCampuses=true&academicLevel=postgraduate

# Specific campus - Computer Science faculty
/api/v1/documents?allCampuses=true&campus=CAMPUS_ID&faculty=FACULTY_ID
```

---

## Error Handling

```javascript
try {
  const response = await fetch('/api/v1/documents?allCampuses=true', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  const data = await response.json();
  console.log(`Found ${data.results} documents`);
} catch (error) {
  console.error('Failed to fetch documents:', error);
}
```

---

## FAQ

**Q: Why don't I see documents from other campuses by default?**  
A: Security. Your data is isolated to your campus by default.

**Q: How do I see other campuses?**  
A: Add `?allCampuses=true` to your request.

**Q: Can I see private documents from other campuses?**  
A: No. Visibility restrictions still apply regardless of campus.

**Q: What if my campus changes?**  
A: Your default view automatically updates to your new campus.

**Q: Can I filter by multiple campuses?**  
A: Not directly, but you can use `allCampuses=true` to see all, or filter to specific campus with `campus=ID`.
