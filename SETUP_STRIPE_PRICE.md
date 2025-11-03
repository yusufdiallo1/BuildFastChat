# 🎯 SETUP STRIPE PRICE ID - REQUIRED!

## ❌ Current Error:
"No such price: 'price_YOUR_PRO_PRICE_ID_HERE'"

## ✅ FIX IT NOW (5 Steps):

### Step 1: Go to Stripe Dashboard
https://dashboard.stripe.com/test/products

### Step 2: Create or Select Product
- If you have a "Pro" product → Click it
- If not → Click "Add product" → Name it "Pro" → Save

### Step 3: Create Price (if needed)
- Inside your product → Click "Add pricing"
- Type: **Recurring**
- Price: **$9.99** (or your amount)
- Billing period: **Monthly**
- Click **Save**

### Step 4: Copy Price ID
- Look for the **Price ID** (starts with `price_`)
- It looks like: `price_1AbC2DeF3GhI4JkL5MnOpQrS`
- **COPY IT**

### Step 5: Add to .env File
1. Create `.env` file in project root (same folder as `package.json`)
2. Add this line:
   ```env
   VITE_STRIPE_PRO_PRICE_ID=price_your_actual_price_id_here
   ```
3. Replace `price_your_actual_price_id_here` with the Price ID you copied
4. Save the file

### Step 6: Restart Frontend
```bash
# Stop your frontend (Ctrl+C)
# Then restart:
npm run dev
```

## ✅ Verify It Works:
- Click "Upgrade to Pro" → Should open Stripe checkout! ✅

## 🔍 Check If Working:
- Open browser console
- Should see no Price ID errors
- Checkout should redirect to Stripe

---

## ⚠️ IMPORTANT:
- Make sure you're in **TEST mode** in Stripe Dashboard
- Use **test** Price ID with **test** Secret Key (`sk_test_...`)
- Don't mix test/production keys!

