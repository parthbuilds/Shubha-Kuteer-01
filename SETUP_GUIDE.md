# Shubha Kuteer - Local Setup & Testing Guide

## Quick Start Guide

### Prerequisites

1. **Node.js installed** (v16 or higher recommended)
2. **MySQL database** (local or remote)
3. **Code editor** (VS Code recommended)

---

## Step 1: Initial Setup

### 1.1. Install Dependencies

```bash
cd /Users/parthpandey/Developer/Shubha-Kuteer-01
npm install
```

### 1.2. Create Environment File

```bash
# Copy the example file
cp .env.example .env
```

### 1.3. Configure Environment Variables

Edit `.env` file and add your values:

**REQUIRED:**
```bash
NODE_ENV=development

# Database
DB_HOST=localhost
DB_USER=root
DB_PASS=your_password
DB_NAME=shubha_kuteer
DB_PORT=3306

# JWT (Generate with: openssl rand -base64 32)
JWT_SECRET=your-generated-secret-here

# CORS (for local development)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Payment (Razorpay - get from dashboard.razorpay.com)
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret

# Shipping (DTDC - optional for testing)
DTDC_API_URL=https://track.dtdc.com/ctbs-api/customer/api
DTDC_API_KEY=your_api_key
DTDC_USERNAME=your_username
DTDC_PASSWORD=your_password

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Generate Strong JWT Secret:

```bash
openssl rand -base64 32
```

---

## Step 2: Database Setup

### 2.1. Create Database

```bash
mysql -u root -p
CREATE DATABASE shubha_kuteer;
USE shubha_kuteer;
```

### 2.2. Run Schema Files

**In order:**
1. `backend/utils/couponSchema.sql`
2. `backend/utils/bannerSchema.sql`
3. Add tracking columns to orders table:

```bash
mysql -u root -p shubha_kuteer < backend/utils/couponSchema.sql
mysql -u root -p shubha_kuteer < backend/utils/bannerSchema.sql
```

**Add tracking to orders table:**
```sql
ALTER TABLE orders
ADD COLUMN dtdc_tracking_number VARCHAR(100) NULL,
ADD COLUMN courier_name VARCHAR(50) NULL,
ADD COLUMN shipping_date DATETIME NULL,
ADD COLUMN tracking_status VARCHAR(50) NULL,
ADD COLUMN tracking_info JSON NULL,
ADD COLUMN tracking_updated_at DATETIME NULL,
ADD INDEX idx_tracking (dtdc_tracking_number);
```

### 2.3. Verify Tables

```bash
mysql -u root -p shubha_kuteer -e "SHOW TABLES;"
mysql -u root -p shubha_kuteer -e "DESCRIBE coupons;"
mysql -u root -p shubha_kuteer -e "DESCRIBE banners;"
```

---

## Step 3: Run Application Locally

### Option A: Using Vercel CLI (Recommended)

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to Vercel (development mode)
vercel dev

# Access the application
# Will be available at http://localhost:3000
```

### Option B: Using Node Directly (For Testing API)

```bash
# Run the serverless function handler
node api/index.js
```

But since this is a Vercel serverless function, use **Vercel Dev** for best local testing experience.

### Option C: Using Existing Backend + Frontend

If you have a separate Express backend:

```bash
cd backend
node server.js
```

---

## Step 4: Testing the Application

### 4.1. Test Basic Endpoints

Open browser and navigate to: `http://localhost:3000`

**Test these endpoints:**

1. **Health Check:**
   - GET `http://localhost:3000/api/health`
   - Should return: `{"status":"healthy","database":"connected"}`

2. **Admin Authentication:**
   - Open: `http://localhost:3000/admin/login.html`
   - Login with credentials from database
   - Check that JWT cookies are set

3. **Product Management:**
   - Create product with auto-slug
   - Verify slug is auto-generated
   - Search product by slug

4. **Coupon System:**
   - Open: `http://localhost:3000/admin/coupons.html`
   - Create new coupon
   - Validate coupon via API

5. **Banner Management:**
   - Open: `http://localhost:3000/admin/banners.html`
   - Create new banner
   - Reorder banners

6. **Attributes with Colors:**
   - Open: `http://localhost:3000/admin/add-attributes.html`
   - Add color attribute
   - Use color picker to select colors
   - Add size attributes

### 4.2. Test Console Logs

You should see blue console.log output like:

```javascript
Loading coupons...
Saving coupon: { code: 'TEST10', discount_type: 'percentage', ... }
Coupon created successfully
Loading banners...
Banner saved successfully
```

**If console text appears white**, your terminal theme has light background. The console outputs from the code are working correctly - this is just a display setting on your computer.

### 4.3. Test Product Search

Test slug-based search:

```bash
# Test product search
curl "http://localhost:3000/api/products/search?q=bed"
curl "http://localhost:3000/api/products/slug/cotton-bed-linen"
```

### 4.4. Test Coupon Validation

```bash
# Test coupon validation
curl -X POST http://localhost:3000/api/coupons/validate \
  -H "Content-Type: application/json" \
  -d '{"code":"SAVE10","cart_total":1000,"user_email":"test@example.com"}'
```

### 4.5. Test DTDC Tracking

```bash
# Test order tracking
curl "http://localhost:3000/api/orders/123/tracking"
```

---

## Step 5: Frontend Integration (Still Needed)

### 5.1. Display Banners

Add this to your homepage (`public/index.html`):

```javascript
// Load active banners
async function loadBanners() {
    const res = await fetch('/api/admin/banners/active?banner_type=hero&page_location=home');
    const { banners } = await res.json();

    // Render hero banner
    const heroSection = document.querySelector('.hero-section');
    if (heroSection && banners.length > 0) {
        heroSection.innerHTML = banners
            .filter(b => b.banner_type === 'hero')
            .map(banner => `
                <div class="hero-banner">
                    <a href="${banner.link_url || '#'}" target="${banner.link_target || '_self'}">
                        <img src="${banner.image_url}" alt="${banner.title}">
                    </a>
                </div>
            `).join('');
    }
}

loadBanners();
```

### 5.2. Apply Coupon at Checkout

Add to your checkout page:

```javascript
async function applyCoupon(code) {
    const cartTotal = calculateCartTotal();

    const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            code: code,
            cart_total: cartTotal,
            user_email: user.email
        })
    });

    const result = await res.json();

    if (result.success) {
        // Apply discount
        const discount = result.coupon.discount_value;
        updateCartDisplay(discount);
    } else {
        showError(result.message);
    }
}
```

### 5.3. Display Product Attributes

Add to product detail page:

```javascript
function renderProductAttributes(product) {
    if (!product.variations) return;

    // Render color swatches
    if (product.variations.color) {
        const colorSection = document.getElementById('color-variants');
        colorSection.innerHTML = `
            <h3>Available Colors</h3>
            <div class="color-swatches">
                ${product.variations.color.map(color => `
                    <div class="color-swatch"
                         style="background-color: ${color.hex};"
                         title="${color.value}"
                         onclick="selectColor('${color.hex}')">
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Render sizes
    if (product.variations.size) {
        const sizeSection = document.getElementById('size-variants');
        sizeSection.innerHTML = `
            <h3>Available Sizes</h3>
            <div class="size-options">
                ${product.variations.size.map(size => `
                    <button class="size-btn" onclick="selectSize('${size.code}')">
                        ${size.value}
                    </button>
                `).join('')}
            </div>
        `;
    }
}
```

### 5.4. Order Tracking Display

Add to user dashboard/order tracking:

```javascript
async function loadOrderTracking(orderId) {
    const res = await fetch(`/api/orders/${orderId}/tracking`);
    const { trackingHistory, currentStatus } = await res.json();

    // Render tracking timeline
    const timeline = document.getElementById('tracking-timeline');
    timeline.innerHTML = trackingHistory.map(event => `
        <div class="tracking-event">
            <div class="tracking-status">${event.status}</div>
            <div class="tracking-description">${event.description}</div>
            <div class="tracking-time">${formatDateTime(event.timestamp)}</div>
        </div>
    `).join('');
}
```

---

## Step 6: Deployment

### 6.1. Deploy to Vercel Production

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Or deploy preview
vercel
```

### 6.2. Set Environment Variables in Vercel Dashboard

Go to: `https://vercel.com/[your-project]/settings/environment-variables`

Add all required variables from `.env.example`:

**Critical:**
- `NODE_ENV=production`
- `JWT_SECRET`
- `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
- `ALLOWED_ORIGINS` (set to your production domain)
- `DTDC_API_URL`, `DTDC_API_KEY`, `DTDC_USERNAME`, `DTDC_PASSWORD`

---

## Troubleshooting

### Issue: Application Won't Start

**Solution:**
1. Check `.env` file exists and has all required values
2. Verify database is running: `mysql -u root -p -e "SHOW PROCESSLIST;"`
3. Check ports: No other service on port 3000
4. Run `npm install` if dependencies are missing

### Issue: Database Connection Failed

**Solution:**
1. Verify MySQL credentials in `.env`
2. Test connection: `mysql -u root -p -e "SHOW DATABASES;"`
3. Check database exists: `mysql -u root -p -e "USE shubha_kuteer; SHOW TABLES;"`
4. Verify user has privileges: `GRANT ALL PRIVILEGES ON shubha_kuteer.* TO 'user'@'localhost';`

### Issue: API Returns 404

**Solution:**
1. Check Vercel routes are configured correctly
2. Verify `vercel.json` has correct rewrite: `{"source":"/api/(.*)","destination":"/api"}`
3. Check API path matches route definitions in `api/index.js`

### Issue: CORS Errors

**Solution:**
1. Add your local development URL to `ALLOWED_ORIGINS`:
   ```bash
   # In .env
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
   ```
2. For production, add actual domain to Vercel environment variables

### Issue: Console Output Hard to Read

**Terminal Display Colors:**
- This is a **terminal theme setting**, not a code issue
- The console.log() outputs in the code are working correctly
- Your terminal is showing white text because of your terminal's color theme
- **The blue console.log() outputs in this guide are just examples** - your actual terminal will show based on your terminal settings

**VS Code Users:**
- If using VS Code integrated terminal: View → Terminal
- Toggle menu → "Toggle Terminal Output"
- Try different terminals: bash, zsh, powershell
- Some terminals have better color support than others

**Mac Terminal Colors:**
- Terminal → Preferences → Profiles → Text
- Change basic colors to improve visibility
- Or use dark theme for better contrast

---

## Testing Checklist

- [ ] Environment file created (`.env`)
- [ ] All dependencies installed (`npm install` completed)
- [ ] Database tables created
- [ ] `.env` variables configured
- [ ] Application starts without errors
- [ ] Admin login works
- [ ] Product CRUD operations work
- [ ] Slug auto-generation works
- [ ] Product search by slug works
- [ ] Coupon creation works
- [ ] Coupon validation works
- [ ] Banner creation works
- [ ] Banner active endpoint works
- [ ] Color picker works in attributes
- [ ] Attributes save to database
- [ ] DTDC tracking endpoint responds
- [ ] Frontend loads banners (needs implementation)
- [ ] Frontend shows attributes (needs implementation)
- [ ] Deployed to production

---

## API Documentation

### Product Endpoints
- `GET /api/products` - List all products
- `POST /api/admin/products` - Create product (auto-slug)
- `PUT /api/admin/products/:id` - Update product (auto-slug)
- `GET /api/products/slug/:slug` - Get by slug
- `GET /api/products/search?q=query` - Search products

### Coupon Endpoints
- `GET /api/admin/coupons` - List coupons
- `POST /api/admin/coupons` - Create coupon
- `PUT /api/admin/coupons/:id` - Update coupon
- `DELETE /api/admin/coupons/:id` - Delete coupon
- `POST /api/coupons/validate` - Validate coupon (public)

### Banner Endpoints
- `GET /api/admin/banners` - List banners
- `GET /api/admin/banners/active` - Get active banners
- `GET /api/admin/banners/:id` - Get single banner
- `POST /api/admin/banners` - Create banner
- `PUT /api/admin/banners/:id` - Update banner
- `DELETE /api/admin/banners/:id` - Delete banner

### Order Endpoints
- `GET /api/orders/:id/tracking` - Get tracking
- `PUT /api/orders/:id/shipping` - Update shipping

### Attribute Endpoints
- `GET /api/admin/attributes` - List attributes
- `POST /api/admin/attributes` - Create attribute (with colors)
- `DELETE /api/admin/attributes/:id` - Delete attribute

---

## Quick Reference

### Start Application:
```bash
# Method 1: Vercel Dev (Recommended)
vercel dev

# Method 2: Direct Node (Testing API only)
node api/index.js
```

### Access Application:
- **Local:** http://localhost:3000
- **Admin Panel:** http://localhost:3000/admin/login.html
- **API Health:** http://localhost:3000/api/health

### Database Reset (if needed):
```bash
mysql -u root -p -e "DROP DATABASE IF EXISTS shubha_kuteer;"
mysql -u root -p < backend/utils/couponSchema.sql
mysql -u root -p < backend/utils/bannerSchema.sql
```

---

**Need Help?**
- Check error messages in browser console (F12)
- Check terminal/command output for errors
- Review `SECURITY_FIXES_SUMMARY.md` for security improvements
- Review `FEATURES_IMPLEMENTATION_SUMMARY.md` for feature details

---

**Last Updated:** 2025-02-13
**Version:** 1.0.0
