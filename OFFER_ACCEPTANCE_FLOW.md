# Offer Acceptance Flow - Complete Documentation

## Overview
This document explains how the offer acceptance flow works, how status is reflected for both parties, and how post-acceptance contact features are implemented.

---

## 1. Flow Architecture

### **Two User Perspectives:**

#### **A. Requester (Buyer) View** - `/received-offers`
- Receives offers from multiple sellers
- Can **accept** or **reject** offers
- After accepting, sees confirmation and seller's contact info

#### **B. Offerer (Seller) View** - `/my-offers`
- Views all offers they've sent
- Can **withdraw pending** offers
- After offer acceptance, gets access to requester's **WhatsApp** & **phone**

---

## 2. Step-by-Step Acceptance Flow

### **Step 1: Requester Views Received Offers**
```
GET /offers?request={requestId}
Response: 
{
  _id: "offer123",
  status: "pending",
  amount: 5000,
  seller: {
    _id: "seller123",
    fullName: "Adeniran Peace",
    campus: { name: "Federal University Oye-Ekiti" },
    role: "Seller",
    isAvailable: true
  },
  request: {
    _id: "req123",
    title: "Custom Tailored Wool Blazer",
    requester: {
      _id: "buyer123",
      fullName: "John Doe",
      whatsapp: "+234 800 123 4567",
      phoneNumber: "+234 800 123 4567"
    }
  }
}
```

### **Step 2: Requester Clicks "Accept" Button**
```
POST /offers/{offerId}/accept
Authorization: Bearer {buyerToken}

Backend Actions:
1. ✅ Verify offer exists and is pending
2. ✅ Check requester is authorized
3. ✅ Change offer status: "pending" → "accepted"
4. ✅ Change request status: "open" → "fulfilled"
5. ✅ REJECT all other pending offers for this request
6. ✅ Create ORDER automatically
7. ✅ Send SOCKET notifications to both parties
8. ✅ Create DATABASE notifications
```

### **Step 3: Offerer (Seller) Sees Updated Status**
On `/my-offers` page, the offer card now shows:
- Status badge: "accepted" ✅
- New section: **"Contact Requester"**
- WhatsApp button: Clickable link to WhatsApp chat
- Phone button: Clickable link to call/SMS

```jsx
{offer?.status === 'accepted' && !isRequesterView && (
  <ContactSection>
    <span>Accepted • Contact Requester</span>
    <ContactButton href="https://wa.me/{phone}">
      💬 WhatsApp: {requester.whatsapp}
    </ContactButton>
    <ContactButton href="tel:{phone}">
      📞 {requester.phoneNumber}
    </ContactButton>
  </ContactSection>
)}
```

---

## 3. Status Reflection in UI

### **Before Acceptance:**
**Requester View (Received Offers):**
- ✓ Accept button
- ✕ Reject button

**Offerer View (My Offers):**
- 🗑️ Withdraw button

### **After Acceptance:**
**Requester View:**
- Message: "✓ You accepted this offer"
- Seller info still visible
- No action buttons

**Offerer View (My Offers):**
```
┌─────────────────────────────────────┐
│  Custom Tailored Wool Blazer        │ [ACCEPTED]
├─────────────────────────────────────┤
│ 👤 John Doe                         │
│ 🏫 [User's Campus]                  │
│ 🎓 Buyer                            │
│ ✅ Available                        │
├─────────────────────────────────────┤
│ ₦5,000                              │
├─────────────────────────────────────┤
│ "Great offer, needs urgently"       │
├─────────────────────────────────────┤
│ 📍 Ikeja, Lagos                     │
│ 📅 Accepted: 2/3/2026              │
├─────────────────────────────────────┤
│ [ContactSection - NEW!]             │
│ 💬 WhatsApp: +234 800 123 4567      │
│ 📞 Phone: +234 800 123 4567         │
└─────────────────────────────────────┘
```

---

## 4. Data Flow & Backend Changes

### **Updated Offer Model Population:**
```javascript
// Pre-find middleware in offerModel.js
offerSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'seller',
    select: 'fullName campus role isAvailable',
    populate: { path: 'campus', select: 'name location' }
  }).populate({
    path: 'request',
    select: 'title description desiredPrice location requiredDate status',
    populate: {
      path: 'requester',
      select: 'fullName phoneNumber whatsapp email'  // ← NEW: requester data
    }
  });
  next();
});
```

### **Notification Data Sent to Offerer:**
```javascript
sendToUser(sellerId, 'offerAccepted', {
  message: `John Doe accepted your offer!`,
  offerId: offer._id,
  requestId: requestDoc._id,
  orderId: order._id,
  notificationId: sellerNotification._id,
  requesterWhatsapp: offer.request.requester.whatsapp,  // ← Available here
  requesterPhone: offer.request.requester.phoneNumber
});
```

---

## 5. Mutations & Hooks

### **Frontend Hooks:**
```javascript
// useRequestOffers.js
export const useAcceptRequestOffer = () => {
  return useMutation({
    mutationFn: (id) => offerService.acceptRequestOffer(id),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mySentOffers'] });
      queryClient.invalidateQueries({ queryKey: ['requestOffers'] });
    }
  });
};

export const useRejectRequestOffer = () => {
  return useMutation({
    mutationFn: (id) => offerService.rejectRequestOffer(id),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mySentOffers'] });
      queryClient.invalidateQueries({ queryKey: ['requestOffers'] });
    }
  });
};
```

### **Service Calls:**
```javascript
// src/services/requestOffers.js
export const acceptRequestOffer = async (id) => {
  const response = await api.post(`/offers/${id}/accept`);
  return response.data.data || response.data;
};

export const rejectRequestOffer = async (id) => {
  const response = await api.post(`/offers/${id}/reject`);
  return response.data.data || response.data;
};
```

---

## 6. WhatsApp Integration

### **Direct Chat Links:**
```javascript
// User clicks WhatsApp button
<a href={`https://wa.me/${phoneNumber}`}>Chat on WhatsApp</a>

// Example:
https://wa.me/2348001234567  // Opens WhatsApp directly with this contact
```

### **Phone Integration:**
```javascript
// User clicks Phone button
<a href={`tel:${phoneNumber}`}>Call</a>

// Example:
tel:+2348001234567  // Opens phone dialer
```

---

## 7. Order Creation

When an offer is accepted, an order is **automatically created**:
```javascript
// In acceptOffer controller
const order = await OrderController.createOrderFromOffer(offer._id);

// This creates an order with:
{
  request: offerId,
  seller: offer.seller,
  buyer: requester,
  amount: offer.amount,
  status: 'awaiting_payment',
  items: [...]
}
```

---

## 8. Files Changed

### **Modified Files:**
1. **[offerModel.js](models/offerModel.js#L144-L156)** - Added requester population
2. **[RequestOfferCard.jsx](src/components/offers/RequestOfferCard.jsx#L194-L260)** - Added contact section
3. **[received-offers/page.js](src/app/(protected)/received-offers/page.js#L1-L310)** - Implemented accept/reject handlers
4. **[my-offers/page.js](src/app/(protected)/my-offers/page.js)** - Updated design with stats

### **New Features:**
- ✅ WhatsApp button for accepted offers
- ✅ Phone/SMS button for accepted offers
- ✅ Automatic order creation
- ✅ Real-time socket notifications
- ✅ Database notifications
- ✅ Reject other offers automatically

---

## 9. User Experience

### **For Requester (Buyer):**
1. Browse received offers on `/received-offers`
2. Review seller details, price, and message
3. Click "✓ Accept" to accept offer
4. Offer status changes to "accepted"
5. Toast notification: "Offer accepted! Seller has been notified"

### **For Offerer (Seller):**
1. View all sent offers on `/my-offers`
2. When offer is accepted, notification received in real-time
3. Offer card shows "accepted" status
4. Green contact section appears with:
   - 💬 WhatsApp link (direct chat)
   - 📞 Phone link (call/SMS)
5. Click to contact requester immediately

---

## 10. Testing Checklist

- [ ] Accept offer from Received Offers page
- [ ] Verify offer status changes to "accepted"
- [ ] Check seller receives real-time notification
- [ ] Verify contact section appears in My Offers
- [ ] WhatsApp link opens in new tab
- [ ] Phone link opens dialer
- [ ] Other pending offers are automatically rejected
- [ ] Order is created in system
- [ ] Both parties receive notifications
- [ ] Accepted offer cannot be withdrawn

---

## Summary

The offer acceptance flow is now **complete** with:
✅ Automatic status updates  
✅ Post-acceptance contact features  
✅ WhatsApp & phone integration  
✅ Real-time notifications  
✅ Automatic order creation  
✅ Rejection of competing offers  

The offerer can immediately contact the requester after acceptance to negotiate delivery, payment, and other details!
