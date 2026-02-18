# Integrate Chat Creation in Product Details Page

## Solution: Add Chat Creation to Message Buttons

### Step 1: Add Import
At the top of your product details page component, add the chat hook import:

```javascript
import { useGetOrCreateChat } from "@/hooks/useChats";
import { useRouter } from "next/navigation";
```

### Step 2: Initialize Hook in Component
Inside your component function, before the JSX, add:

```javascript
export default function ProductDetailsPage({ params }) {
  const router = useRouter();
  const { id } = use(params);
  const { user, isLoading: userLoading } = useAuth();
  
  // ✅ ADD THIS
  const createChatMutation = useGetOrCreateChat();
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  // ... rest of component
```

### Step 3: Create Handler Function
Add this handler function before the return statement:

```javascript
  // Handle message/contact seller
  const handleContactSeller = () => {
    const sellerId = actualProduct.shop?._id || 
                    actualProduct.seller?._id ||
                    actualProduct.createdBy?._id ||
                    actualProduct.createdBy;

    if (!sellerId) {
      alert('Seller information not available');
      return;
    }

    if (sellerId === user?._id) {
      alert("You can't message yourself");
      return;
    }

    createChatMutation.mutate(sellerId, {
      onSuccess: (chat) => {
        console.log('✅ Chat created:', chat._id);
        // Navigate to the chat
        router.push(`/messages/${chat._id}`);
      },
      onError: (error) => {
        console.error('❌ Failed to create chat:', error);
        alert(error.message || 'Failed to start chat');
      }
    });
  };
```

### Step 4: Update Message Buttons
Find both Message buttons and add the click handler:

**In SellerSection (Seller Card):**
```javascript
<SellerButton 
  $primary 
  onClick={handleContactSeller}
  disabled={createChatMutation.isPending}
>
  <MessageCircle size={16} />
  {createChatMutation.isPending ? 'Creating chat...' : 'Message'}
</SellerButton>
```

**In ActionSection (Action Buttons):**
```javascript
<ActionButton 
  $primary 
  onClick={handleContactSeller}
  disabled={createChatMutation.isPending}
>
  <MessageCircle />
  {createChatMutation.isPending ? 'Creating chat...' : 'Contact Seller'}
</ActionButton>
```

### Complete Code Example

```javascript
"use client";

import { useState, use } from "react";
import Image from "next/image";
import { useProductById, useDeleteProduct } from "@/hooks/useProducts";
import { useAuth } from "@/hooks/useAuth";
import { useGetOrCreateChat } from "@/hooks/useChats"; // ✅ ADD THIS
import { useRouter } from "next/navigation"; // ✅ ADD THIS
import { BottomNav } from "@/components/bottom-nav";
// ... rest of imports

export default function ProductDetailsPage({ params }) {
  const router = useRouter();
  const { id } = use(params);
  const { user, isLoading: userLoading } = useAuth();
  
  // ✅ ADD THIS
  const createChatMutation = useGetOrCreateChat();
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const { data: product, isLoading, error } = useProductById(id);
  const deleteProduct = useDeleteProduct();

  // ... existing code ...

  // ✅ ADD THIS HANDLER
  const handleContactSeller = () => {
    // Extract seller ID from multiple possible locations
    const sellerId = actualProduct.shop?._id || 
                    actualProduct.seller?._id ||
                    actualProduct.createdBy?._id ||
                    actualProduct.createdBy;

    // Validate seller ID exists
    if (!sellerId) {
      alert('Seller information not available');
      return;
    }

    // Don't allow user to message themselves
    if (sellerId === user?._id) {
      alert("You can't message yourself");
      return;
    }

    // Create or get existing chat
    createChatMutation.mutate(sellerId, {
      onSuccess: (chat) => {
        console.log('✅ Chat created/retrieved:', chat._id);
        // Navigate to messages page with this chat
        router.push(`/messages/${chat._id}`);
      },
      onError: (error) => {
        console.error('❌ Failed to create chat:', error);
        alert(error.message || 'Failed to start chat');
      }
    });
  };

  // ... rest of component code ...

  return (
    <PageWrapper>
      <Sidebar>
        <BottomNav active="products" />
      </Sidebar>

      <MainContent>
        <ContentArea>
          {/* ... GALLERY, HEADER, DESCRIPTION, SPECS ... */}

          {/* SELLER */}
          <SellerSection>
            <SectionTitle>Seller Information</SectionTitle>
            <SellerCard>
              <SellerAvatar>
                {actualProduct.shop?.logo ? (
                  <Image
                    src={getImageUrl(actualProduct.shop.logo)}
                    alt={actualProduct.shop.name || 'Shop'}
                    fill
                    style={{ objectFit: 'cover' }}
                    unoptimized={true}
                  />
                ) : (
                  actualProduct.shop?.name?.charAt(0).toUpperCase() || "S"
                )}
              </SellerAvatar>
              <SellerInfo>
                <SellerName>{actualProduct.shop?.name || "Seller Shop"}</SellerName>
                <SellerMeta>🏪 Campus Seller • ✓ Verified</SellerMeta>
                <SellerMeta>📍 {actualProduct.campus?.name || "On campus"}</SellerMeta>
                <SellerMeta>Total Views: {actualProduct.analytics?.views || 0}</SellerMeta>
                <SellerActions>
                  {/* ✅ UPDATE THIS BUTTON */}
                  <SellerButton 
                    $primary 
                    onClick={handleContactSeller}
                    disabled={createChatMutation.isPending}
                  >
                    <MessageCircle size={16} />
                    {createChatMutation.isPending ? 'Creating...' : 'Message'}
                  </SellerButton>
                  <SellerButton onClick={() => router.push(`/profile/${actualProduct.shop?._id || actualProduct.seller?._id}`)}>
                    View Profile
                  </SellerButton>
                </SellerActions>
              </SellerInfo>
            </SellerCard>
          </SellerSection>

          {/* TRUST BADGES */}
          <TrustSection>
            {/* ... */}
          </TrustSection>

          {/* ACTION BUTTONS */}
          <ActionSection>
            {isOwner ? (
              <>
                <ActionButton $primary onClick={handleEdit}>
                  Edit Product
                </ActionButton>
                <ActionButton onClick={handleDelete} disabled={deleteProduct.isPending}>
                  {deleteProduct.isPending ? 'Deleting...' : 'Delete Product'}
                </ActionButton>
              </>
            ) : (
              <>
                <ActionButton>
                  <ShoppingCart />
                  Add to Cart
                </ActionButton>
                {/* ✅ UPDATE THIS BUTTON */}
                <ActionButton 
                  $primary 
                  onClick={handleContactSeller}
                  disabled={createChatMutation.isPending}
                >
                  <MessageCircle />
                  {createChatMutation.isPending ? 'Creating...' : 'Contact Seller'}
                </ActionButton>
              </>
            )}
          </ActionSection>
        </ContentArea>
      </MainContent>

      <BottomNavWrapper>
        <BottomNav active="products" />
      </BottomNavWrapper>
    </PageWrapper>
  );
}
```

## How It Works

1. **User clicks "Message" or "Contact Seller"** button
2. **`handleContactSeller()` is called** which:
   - Extracts seller ID from product object
   - Validates seller exists and isn't current user
   - Calls `createChatMutation.mutate(sellerId)`
3. **Backend creates/retrieves 1:1 chat** with seller
4. **Frontend navigates to chat page** at `/messages/{chatId}`
5. **User can now send messages** to the seller

## Loading State
The button text changes while creating the chat:
- Before: "Message" or "Contact Seller"
- During: "Creating..."
- After: Redirects to messages page

## Error Handling
If chat creation fails, user sees an alert with the error message. Common errors:
- Seller not found
- User trying to message themselves
- Network error (shows in console)

## Try It Out
1. Go to any product details page
2. Click "Message" or "Contact Seller" button
3. You should be redirected to `/messages/{chatId}`
4. The chat with that seller will appear in your chat list
5. You can now type and send messages!

## Troubleshooting

### Chat doesn't open
- Check browser console (F12) for errors
- Verify seller ID is being extracted correctly
- Ensure `/messages` route exists

### "You can't message yourself" error
- Appears if you're viewing your own product (expected)
- Only non-owners can message sellers

### Chat list doesn't show new chat
- Check React Query cache: `queryClient.getQueryData(['chats'])`
- Try refreshing the page (it will eventually sync)
- Socket.IO should update it automatically in ~30 seconds
