# 🚨 FIX PRICE ID ERROR - DO THIS NOW!

## ❌ ERROR:
"No such price: 'price_YOUR_PRO_PRICE_ID_HERE'"

## ✅ FIX IN 3 STEPS:

### Step 1: Get Your Price ID
1. Go to: **https://dashboard.stripe.com/test/products**
2. Click your **"Pro"** product (or create one for $9.99/month)
3. Click on the **pricing** section
4. **COPY** the Price ID (looks like `price_1AbC2DeF3GhI...`)

### Step 2: Edit .env File
Open `.env` file in project root and add/update:

```env
VITE_STRIPE_PRO_PRICE_ID=price_your_actual_price_id_here
```

Replace `price_your_actual_price_id_here` with the ID you copied!

### Step 3: Restart Frontend
```bash
# Stop frontend (Ctrl+C in terminal)
# Then restart:
npm run dev
```

---

## ✅ DONE! Now try "Upgrade to Pro" again!

---

## 🔍 Still Not Working?

Check:
- ✅ Price ID starts with `price_`
- ✅ Using TEST mode Price ID with TEST mode Secret Key
- ✅ Restarted frontend dev server after updating .env
- ✅ No typos in Price ID

---

**Need help?** See `SETUP_STRIPE_PRICE.md` for detailed instructions.

