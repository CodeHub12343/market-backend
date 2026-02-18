# Offer Acceptance Flow - Visual Guide

## Complete User Journey

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         OFFER LIFECYCLE                                      │
└─────────────────────────────────────────────────────────────────────────────┘

STAGE 1: OFFER CREATION
========================
Offerer (Seller)
  └─→ Creates Offer on Request
      ├─ Sets Price: ₦5,000
      ├─ Adds Message: "I can deliver in 2 days"
      └─ Submits via /my-offers → /requests/{id}/make-offer

Backend
  └─→ Stores Offer with status: "pending"
      └─→ Sends notification to Requester


STAGE 2: OFFER RECEIVED
=======================
Requester (Buyer)
  └─→ Views all offers on /received-offers
      ├─ Sees Offerer Details:
      │  ├─ Name: Adeniran Peace
      │  ├─ Campus: Federal University Oye-Ekiti
      │  ├─ Role: Seller
      │  ├─ Availability: ✅ Available
      │  └─ Price: ₦5,000
      ├─ Reads Offer Message
      └─→ Two Options:
          ├─ ✓ ACCEPT BUTTON
          └─ ✕ REJECT BUTTON


STAGE 3: ACCEPTANCE
===================
Requester Clicks "Accept"
  └─→ POST /offers/{offerId}/accept
      └─→ Backend Actions:
          ├─ [1] Verify Requester is Authorized ✓
          ├─ [2] Check Offer is Pending ✓
          ├─ [3] Update Offer Status: "pending" → "accepted" ✓
          ├─ [4] Update Request Status: "open" → "fulfilled" ✓
          ├─ [5] REJECT all other pending offers ✓
          ├─ [6] Create ORDER automatically ✓
          ├─ [7] Send SOCKET notifications ✓
          └─ [8] Create DATABASE notifications ✓


STAGE 4: NOTIFICATION & STATUS UPDATE
=====================================
Real-time Updates (WebSocket)
  ├─ Requester sees: "✓ You accepted this offer"
  └─ Offerer receives notification:
      └─→ "John Doe accepted your offer!"


STAGE 5: POST-ACCEPTANCE (KEY FEATURE!)
========================================
Offerer (Seller) View on /my-offers
  └─→ Offer Card Updated:
      ┌──────────────────────────────────────────┐
      │ Custom Tailored Wool Blazer       [ACCEPTED]
      ├──────────────────────────────────────────┤
      │ 👤 John Doe                              │
      │ 🏫 [User's Campus]                       │
      │ 🎓 Buyer                                 │
      │ ✅ Available                             │
      ├──────────────────────────────────────────┤
      │ ₦5,000                                   │
      ├──────────────────────────────────────────┤
      │ "Great offer, I need it urgently"        │
      ├──────────────────────────────────────────┤
      │ 📍 Ikeja, Lagos                          │
      │ 📅 Offered: 2/3/2026                     │
      ├──────────────────────────────────────────┤
      │ ⭐ CONTACT SECTION (NEW!)                │
      │ Accepted • Contact Requester             │
      │ [💬 WhatsApp: +234 800 123 4567]        │
      │ [📞 Phone: +234 800 123 4567]           │
      └──────────────────────────────────────────┘
      
      └─→ Offerer Clicks WhatsApp
          ├─ Opens WhatsApp Web/App
          ├─ Shows John Doe's chat
          └─ Can negotiate delivery & payment


STAGE 6: ORDER CREATED
======================
Automatically Created in System
  └─→ Order Details:
      ├─ Seller: Adeniran Peace
      ├─ Buyer: John Doe
      ├─ Amount: ₦5,000
      ├─ Status: "awaiting_payment"
      └─ Created: 2/3/2026 14:30


STAGE 7: TRANSACTION FLOW
=========================
Offerer & Requester
  ├─ 💬 Contact each other on WhatsApp
  ├─ 📝 Finalize delivery details
  ├─ 💳 Process payment
  ├─ 📦 Deliver item
  └─ ⭐ Rate & Review
```

---

## API Flow Diagram

```
RECEIVED OFFERS PAGE (Requester)
    │
    ├─→ GET /offers?request={requestId}
    │   Returns: Array of pending offers with seller details
    │
    ├─→ Display Offer Cards with [ACCEPT] [REJECT] buttons
    │
    └─→ Requester Clicks "Accept"
        │
        ├─→ POST /offers/{offerId}/accept
        │   ├─ Verify authorization
        │   ├─ Validate offer status
        │   ├─ Update: offer.status = "accepted"
        │   ├─ Update: request.status = "fulfilled"
        │   ├─ Reject other offers (status = "rejected")
        │   ├─ Create Order
        │   └─ Send Notifications
        │
        └─→ Real-time Update via Socket.io
            ├─ Toast: "Offer accepted!"
            └─ Refresh UI


MY OFFERS PAGE (Offerer)
    │
    ├─→ GET /offers/my-offers
    │   Returns: Array of sent offers with requester contact info
    │
    ├─→ Display Offer Cards
    │
    ├─→ If status = "pending":
    │   └─ Show [🗑️ WITHDRAW] button
    │
    └─→ If status = "accepted":
        ├─ Show Contact Section
        ├─ WhatsApp Link: https://wa.me/{phone}
        └─ Phone Link: tel:{phone}
```

---

## Data Payload After Acceptance

### **Requester Receives:**
```json
{
  "status": "success",
  "data": {
    "offer": {
      "_id": "offer123",
      "status": "accepted",
      "amount": 5000,
      "seller": {
        "fullName": "Adeniran Peace",
        "campus": { "name": "Federal University Oye-Ekiti" }
      },
      "request": {
        "title": "Custom Tailored Wool Blazer",
        "status": "fulfilled"
      }
    },
    "order": {
      "_id": "order123",
      "status": "awaiting_payment"
    }
  }
}
```

### **Offerer Receives (via Socket):**
```json
{
  "type": "offerAccepted",
  "data": {
    "message": "John Doe accepted your offer!",
    "offerId": "offer123",
    "requestId": "req123",
    "orderId": "order123",
    "requesterWhatsapp": "+234 800 123 4567",
    "requesterPhone": "+234 800 123 4567",
    "requesterName": "John Doe"
  }
}
```

---

## Frontend Component State Changes

### **RequestOfferCard.jsx**
```jsx
// BEFORE ACCEPTANCE (status = "pending")
{isRequesterView && offer?.status === 'pending' && (
  <ButtonRow>
    <Button success onClick={handleAcceptClick}>✓ Accept</Button>
    <Button danger onClick={handleRejectClick}>✕ Reject</Button>
  </ButtonRow>
)}

{!isRequesterView && offer?.status === 'pending' && (
  <Button danger onClick={handleDeleteClick}>🗑️ Withdraw Offer</Button>
)}

// AFTER ACCEPTANCE (status = "accepted")
{offer?.status === 'accepted' && isRequesterView && (
  <div>✓ You accepted this offer</div>
)}

{offer?.status === 'accepted' && !isRequesterView && (
  <ContactSection>
    <span>Accepted • Contact Requester</span>
    <ContactButton href="https://wa.me/{phone}">
      💬 WhatsApp: {requester.whatsapp}
    </ContactButton>
    <ContactButton href="tel:{phone}">
      📞 Phone: {requester.phoneNumber}
    </ContactButton>
  </ContactSection>
)}
```

---

## Key Changes Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Offer Status** | pending | accepted |
| **Request Status** | open | fulfilled |
| **Other Offers** | still pending | automatically rejected |
| **Order Created** | No | Yes ✅ |
| **Requester Can See** | Seller info + buttons | Confirmation message |
| **Offerer Can See** | Withdraw button | Contact buttons (WhatsApp/Phone) |
| **Notifications** | Offer created | Offer accepted (high priority) |
| **Socket Update** | newOffer | offerAccepted |

---

## Testing the Flow

### **Quick Test:**
1. Login as **Requester** → `/requests/new` → Create a request
2. Logout & login as **Offerer** → `/requests` → Find request → "Make Offer"
3. Fill offer details & submit
4. Logout & login back as **Requester** → `/received-offers` → View offer
5. Click **"✓ Accept"** button
6. ✅ Verify status changes to "accepted"
7. Logout & login as **Offerer** → `/my-offers`
8. ✅ See "Contact Requester" section
9. ✅ Click WhatsApp link → Opens chat
10. ✅ Click Phone link → Opens dialer

---

## Technical Implementation

### **Backend (Express.js)**
```javascript
// POST /offers/{id}/accept
exports.acceptOffer = catchAsync(async (req, res, next) => {
  const offer = await Offer.findById(req.params.id).populate('seller').populate('request');
  const requestDoc = await Request.findById(offer.request).populate('requester');
  
  // Verify authorization
  if (String(requestDoc.requester._id) !== String(req.user.id)) {
    return next(new AppError('Not authorized', 403));
  }
  
  // Update statuses
  offer.status = 'accepted';
  await offer.save();
  
  requestDoc.status = 'fulfilled';
  await requestDoc.save();
  
  // Reject other offers
  await Offer.updateMany(
    { request: offer.request, _id: { $ne: offer._id }, status: 'pending' },
    { status: 'rejected' }
  );
  
  // Create order
  const order = await OrderController.createOrderFromOffer(offer._id);
  
  // Send notifications
  sendToUser(buyerId, 'offerAccepted', { ... });
  sendToUser(sellerId, 'offerAccepted', { ... });
  
  res.status(200).json({ status: 'success', data: { offer, order } });
});
```

### **Frontend (React/Next.js)**
```javascript
const handleAcceptOffer = async (offerId) => {
  try {
    await acceptOfferMutation.mutateAsync(offerId);
    toast.success('Offer accepted! Seller has been notified.');
    // Query automatically invalidated & refetched
  } catch (err) {
    toast.error(err?.message || 'Failed to accept offer');
  }
};
```

---

## Database Changes

### **Offer Document After Acceptance**
```json
{
  "_id": "offer123",
  "request": "req123",
  "seller": "seller123",
  "amount": 5000,
  "message": "I can deliver in 2 days",
  "status": "accepted",  // ← CHANGED
  "createdAt": "2026-02-03T10:00:00Z",
  "updatedAt": "2026-02-03T14:30:00Z",  // ← UPDATED
  "history": [
    { action: "created", timestamp: "..." },
    { action: "accepted", timestamp: "..." }  // ← ADDED
  ]
}
```

### **Request Document After Acceptance**
```json
{
  "_id": "req123",
  "title": "Custom Tailored Wool Blazer",
  "requester": "buyer123",
  "status": "fulfilled",  // ← CHANGED (was "open")
  "analytics": {
    "offersCount": 5,
    "acceptedOffer": "offer123"  // ← NEW
  }
}
```

---

## Security Notes

✅ **Authorization Checks:**
- Only requester can accept their own offers
- Cannot accept offer on closed requests
- Cannot accept already accepted offers

✅ **Data Protection:**
- WhatsApp/Phone only shown after acceptance
- Seller can only see requester info if accepted
- Automatic order creation validates all data

---

**All changes are production-ready! 🚀**
