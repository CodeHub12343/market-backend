# Real-Time Presence System - Architecture Simplification

## The Problem (Root Cause)
Your presence system was broadcasting to **empty rooms** (sockets in room: 0) from **6 different places**:
1. Retry-based broadcast in handleConnection (3 retries with backoff)
2. Per-socket direct broadcast (forEach over all sockets)
3. Presence broadcast inside handleChatEvents
4. Direct broadcast on socket.connect
5. Presence broadcast on joinChat
6. Presence broadcast on logout

**Result:** Events were lost to offline users because Socket.IO doesn't queue events to empty rooms.

## The Solution: Simplify to Socket Lifecycle Only

### ✅ What Changed

#### 1. **Removed All Retry-Based Broadcasts** (`handlers.js` lines 40-200)
- ❌ Deleted: 160+ lines of retry logic with exponential backoff
- ❌ Deleted: Retry attempts 1/2/3 with 100ms/300ms/900ms delays
- ❌ Deleted: Per-socket forEach broadcast loop
- **Why:** Retries don't help if the target user hasn't connected yet. Snapshots solve this better.

#### 2. **Removed Presence from handleChatEvents** (`handlers.js` lines 220-235)
- ❌ Deleted: `socket.to('chat_*').emit('presenceUpdate')` 
- ❌ Deleted: `socket.to('user_*').emit('presenceUpdate')`
- **Why:** These events also go to potentially empty rooms. Snapshots handle reconciliation.

#### 3. **Removed Logout Presence Broadcast** (`handlers.js` lines 248-290)
- ❌ Deleted: Manual broadcast to all chat members on logout
- ✅ Kept: Cleanup of realTimeManager in-memory state
- **Why:** The disconnect handler broadcasts offline globally when the last socket closes.

#### 4. **Added Snapshot on joinChat** (`handlers.js` lines 165-173)
- ✅ Added: `realTimeManager.buildPresenceSnapshot()` call after joining a chat
- ✅ Sends: `presenceSnapshot` event with authoritative online members list
- **Why:** When user joins a new chat, they need to know who's online in that room.

### ✅ Current Presence Flow (Simplified)

**On Socket Connect:**
1. Track socket in realTimeManager
2. Join user's personal room (`user_<id>`)
3. **Send presence snapshot immediately** (shows all currently online chat members)
4. Deliver offline messages
5. Broadcast online status globally

**On joinChat:**
1. Join the chat room (`chat_<id>`)
2. **Send presence snapshot** (shows online members in this specific chat)

**On Socket Disconnect:**
1. Remove socket from tracking
2. If user has NO more sockets → broadcast offline globally

**On Explicit Logout:**
1. Clean up in-memory state
2. Let disconnect handler broadcast offline

### ✅ What This Solves

| Problem | Old Approach | New Approach |
|---------|-------------|--------------|
| Lost events to offline users | Retries (pointless) | Snapshot on connect |
| Stale state after manual reload | Hope events arrive | Snapshot reconciliation |
| Over-engineering complexity | 6 broadcast locations | 2 socket lifecycle events |
| Events to empty rooms | No safeguard | Snapshots + socket lifecycle |
| Race conditions | Retry timing | Deterministic socket join → snapshot |

## Test Scenarios

### Scenario 1: Fresh Login (SHOULD WORK NOW)
```
1. Browser A: Hard refresh + login → receives snapshot → sees 0 online
2. Browser B: Hard refresh + login → receives snapshot → sees Browser A online
3. Browser A: See Browser B online immediately (via presenceSnapshot)
```

### Scenario 2: Join Chat (NEW)
```
1. User joins `chat_123` → receives snapshot of online members in that chat
2. No events lost → no missed presence updates
```

### Scenario 3: Logout (SHOULD WORK)
```
1. Browser A: Logout → socket disconnect triggered
2. If A has 0 sockets → broadcast offline
3. Browser B: Sees A offline immediately (via realTimeManager broadcast)
```

## Files Modified

1. **`sockets/handlers.js`**
   - Removed 160+ lines of retry/per-socket broadcast logic
   - Removed presence from handleChatEvents
   - Removed presence from logout handler
   - Added snapshot on joinChat

2. **`utils/realTimeManager.js`**
   - No changes needed (already correct)
   - `buildPresenceSnapshot()` already exists
   - `handleDisconnection()` already broadcasts offline

3. **`src/context/SocketContext.jsx`**
   - No changes needed (already correct)
   - Snapshot listener already replaces state
   - Connect handler already waits for snapshot

## Performance Impact

- **Reduced:** Network traffic (no redundant broadcasts)
- **Reduced:** Server CPU (no retry loops)
- **Reduced:** Code complexity (from 6 places to 2)
- **Improved:** Reliability (state reconciliation instead of event-based)

## Key Principle

> **Presence is state, not events.** State must be reconciled on every socket lifecycle change, not inferred from scattered events.

---

**Status:** Ready for testing with two browsers. All changes deployed to handlers.js. No breaking changes.
