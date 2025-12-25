// Working serverless function using Vercel format
export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { pathname } = new URL(req.url, `http://${req.headers.host}`);

    try {
        // Test endpoint
        if (pathname === '/api/test') {
            return res.status(200).json({
                message: "API is working",
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV || "development"
            });
        }

        // Health check with database
        if (pathname === '/api/health') {
            try {
                const pool = await import("../backend/utils/db.js");
                const [rows] = await pool.default.query("SELECT 1 as test");
                return res.status(200).json({
                    status: "healthy",
                    database: "connected",
                    timestamp: new Date().toISOString(),
                    test: rows[0]
                });
            } catch (error) {
                console.error("Health check error:", error);
                return res.status(500).json({
                    status: "unhealthy",
                    database: "disconnected",
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        }

        // Auth routes
        if (pathname === '/api/auth/register' && req.method === 'POST') {
            try {
                const { registerUser } = await import("../backend/controllers/authController.js");
                const mockReq = {
                    body: req.body,
                    method: req.method,
                    url: req.url
                };
                const mockRes = {
                    status: (code) => ({
                        json: (data) => res.status(code).json(data)
                    }),
                    json: (data) => res.status(200).json(data)
                };
                await registerUser(mockReq, mockRes);
                return;
            } catch (error) {
                console.error("Register error:", error);
                return res.status(500).json({ message: "Registration failed", error: error.message });
            }
        }

        if (pathname === '/api/auth/login' && req.method === 'POST') {
            try {
                const { loginUser } = await import("../backend/controllers/authController.js");
                const mockReq = {
                    body: req.body,
                    method: req.method,
                    url: req.url
                };
                const mockRes = {
                    status: (code) => ({
                        json: (data) => res.status(code).json(data)
                    }),
                    json: (data) => res.status(200).json(data)
                };
                await loginUser(mockReq, mockRes);
                return;
            } catch (error) {
                console.error("Login error:", error);
                return res.status(500).json({ message: "Login failed", error: error.message });
            }
        }

        if (pathname === '/api/dashboard-content' && method === 'GET') {
            let authResult;
            const authCheckMockRes = {
                status: (code) => ({
                    json: (data) => {
                        authResult = { code, data };
                        if (code !== 200) {
                            sendResponse(code, data);
                        }
                    }
                }),
                json: (data) => {
                    authResult = { code: 200, data };
                    sendResponse(200, data);
                }
            };

            await checkAuth(req, authCheckMockRes);

            if (authResult && authResult.code === 200) {
                sendResponse(200, {
                    message: `Welcome to your dashboard, ${authResult.data.user.first_name}!`,
                    userData: authResult.data.user,
                    dashboardStats: "Your personalized statistics are here.",
                    recentActivity: ["User logged in", "Viewed analytics"]
                });
            }
            return;
        }

        // Admin auth routes
        if (pathname === '/api/admin/auth/login' && req.method === 'POST') {
            try {
                const { email, password } = req.body;
                const bcrypt = await import("bcrypt");
                const jwt = await import("jsonwebtoken");
                const pool = await import("../backend/utils/db.js");

                const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

                const [rows] = await pool.default.query("SELECT * FROM admins WHERE email = ?", [email]);
                if (rows.length === 0) {
                    return res.status(401).json({ message: "Invalid credentials ❌" });
                }

                const admin = rows[0];
                const isMatch = await bcrypt.default.compare(password, admin.password_hash);
                if (!isMatch) {
                    return res.status(401).json({ message: "Invalid credentials ❌" });
                }

                const token = jwt.default.sign({ id: admin.id, email: admin.email, role: admin.role }, JWT_SECRET, { expiresIn: "2h" });

                // Set cookie for serverless
                const cookieOptions = [
                    `adminToken=${token}`,
                    'HttpOnly',
                    'Path=/',
                    `Max-Age=${2 * 60 * 60}`,
                    'SameSite=Lax'
                ];
                if (process.env.NODE_ENV === "production") {
                    cookieOptions.push('Secure');
                }
                res.setHeader('Set-Cookie', cookieOptions.join('; '));

                return res.status(200).json({
                    message: "Login successful ✅",
                    redirect: "/admin/index.html",
                    admin: { id: admin.id, email: admin.email, role: admin.role }
                });
            } catch (error) {
                console.error("Admin login error:", error);
                return res.status(500).json({ message: "Database error ❌", error: error.message });
            }
        }

        if (pathname === '/api/admin/auth/logout' && req.method === 'POST') {
            try {
                // Clear the admin cookie
                const cookieOptions = [
                    'adminToken=',
                    'HttpOnly',
                    'Path=/',
                    'Max-Age=0',
                    'SameSite=Lax'
                ];
                if (process.env.NODE_ENV === "production") {
                    cookieOptions.push('Secure');
                }
                res.setHeader('Set-Cookie', cookieOptions.join('; '));

                return res.status(200).json({
                    message: "Logged out ✅",
                    redirect: "/admin/login.html"
                });
            } catch (error) {
                console.error("Admin logout error:", error);
                return res.status(500).json({ message: "Logout failed ❌", error: error.message });
            }
        }

        if (pathname === '/api/admin/auth/check' && req.method === 'GET') {
            try {
                const jwt = await import("jsonwebtoken");
                const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

                const token = req.headers.cookie?.split(';')
                    .find(c => c.trim().startsWith('adminToken='))
                    ?.split('=')[1];

                if (!token) {
                    return res.status(401).json({ message: "Unauthorized ❌" });
                }

                const decoded = jwt.default.verify(token, JWT_SECRET);
                return res.status(200).json({
                    message: "Authorized ✅",
                    admin: decoded
                });
            } catch (error) {
                console.error("Admin auth check error:", error);
                return res.status(401).json({ message: "Unauthorized ❌" });
            }
        }

        // Admin middleware check for protected pages
        if (pathname.startsWith('/admin/') && !pathname.includes('/admin/login.html') && !pathname.includes('/admin/assets/')) {
            try {
                const jwt = await import("jsonwebtoken");
                const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

                const token = req.headers.cookie?.split(';')
                    .find(c => c.trim().startsWith('adminToken='))
                    ?.split('=')[1];

                if (!token) {
                    return res.status(401).json({
                        message: "Unauthorized ❌",
                        redirect: "/admin/login.html"
                    });
                }

                const decoded = jwt.default.verify(token, JWT_SECRET);
                // Token is valid, allow access
                return res.status(200).json({
                    message: "Authorized ✅",
                    admin: decoded
                });
            } catch (error) {
                return res.status(401).json({
                    message: "Unauthorized ❌",
                    redirect: "/admin/login.html"
                });
            }
        }

        // Products routes
        if (pathname.startsWith('/api/admin/products')) {
            try {
                const pool = await import("../backend/utils/db.js");

                // GET all products
                if (pathname === '/api/admin/products' && req.method === 'GET') {
                    const [rows] = await pool.default.query(`
                        SELECT id, name, slug, price, origin_price, quantity, sold,
                            rate, is_new, on_sale, category, description, type, brand,
                            main_image, thumb_image, gallery, action, created_at
                        FROM products
                        ORDER BY created_at DESC
                    `);
                    return res.status(200).json(rows);
                }

                // POST new product
                if (pathname === '/api/admin/products' && req.method === 'POST') {
                    try {
                        const {
                            name, category, type, price, origin_price, quantity, sold, rate,
                            brand, description, sizes, variations, gallery, main_image,
                            is_new, on_sale, slug, action
                        } = req.body;

                        // Validate required fields
                        if (!name || !category || !price) {
                            return res.status(400).json({
                                success: false,
                                error: 'Missing required fields: name, category, price'
                            });
                        }

                        // --- Parsing logic (adjusted for schema types and frontend output) ---
                        let parsedVariations = {}; // Store as an object for key-value pairs
                        if (variations) {
                            try {
                                // Assuming `variations` from frontend is already a JSON string of `{attrName: [value1, value2]}`
                                const variationsData = JSON.parse(variations);
                                // Ensure it's an object and contains actual selected variants
                                if (typeof variationsData === 'object' && Object.keys(variationsData).length > 0) {
                                    parsedVariations = variationsData;
                                }
                            } catch (e) {
                                console.error('Error parsing variations:', e);
                                // Even if parsing fails, we'll proceed with an empty object for variations
                            }
                        }

                        let parsedSizes = [];
                        if (sizes) {
                            try {
                                parsedSizes = JSON.parse(sizes);
                                if (!Array.isArray(parsedSizes)) {
                                    parsedSizes = []; // Ensure it's an array
                                }
                            } catch (e) {
                                console.error('Error parsing sizes:', e);
                                parsedSizes = [];
                            }
                        }

                        let parsedGallery = [];
                        if (gallery) {
                            try {
                                parsedGallery = JSON.parse(gallery);
                                if (!Array.isArray(parsedGallery)) {
                                    parsedGallery = []; // Ensure it's an array
                                }
                            } catch (e) {
                                console.error('Error parsing gallery:', e);
                                parsedGallery = [];
                            }
                        }
                        // --- End of parsing logic ---

                        // Generate slug if not provided
                        const productSlug = slug && slug.trim() !== '' ? slug : name.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]+/g, "");

                        // Determine thumb_image (first image from gallery, then main_image, else null)
                        const finalThumbImage = parsedGallery.length > 0 ? parsedGallery[0] : (main_image || null);


                        // Manual ID generation as requested: "check the last items id and just add one"
                        const [maxIdRows] = await pool.default.query("SELECT MAX(id) as maxId FROM products");
                        const nextId = (maxIdRows[0].maxId || 0) + 1;

                        // Prepare the SQL query and values including the explicit ID
                        const sql = `
                            INSERT INTO products
                            (id, name, slug, price, origin_price, quantity, sold, rate,
                            is_new, on_sale, category, description, type, brand,
                            main_image, thumb_image, gallery, sizes, variations, action)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `;
                        const values = [
                            nextId,
                            name,
                            productSlug,
                            parseFloat(price) || 0.00, // Ensure it's a float, default to 0.00
                            parseFloat(origin_price) || null, // Allow NULL if not provided
                            parseInt(quantity) || 0,
                            parseInt(sold) || 0,
                            parseFloat(rate) || 0.0, // Use parseFloat for decimal rate
                            Boolean(is_new) ? 1 : 0, // Convert boolean to 1 or 0 for MySQL TINYINT(1)
                            Boolean(on_sale) ? 1 : 0, // Convert boolean to 1 or 0
                            category,
                            description || null, // Allow NULL for text field
                            type || null,        // Allow NULL
                            brand || null,       // Allow NULL
                            main_image || null,
                            finalThumbImage,
                            JSON.stringify(parsedGallery), // Store gallery as JSON string
                            JSON.stringify(parsedSizes),   // Store sizes as JSON string
                            JSON.stringify(parsedVariations), // Store variations as JSON string
                            action || 'add to cart' // Use provided action or default
                        ];

                        // Log the data before insertion for debugging
                        console.log('Product data to insert:', {
                            id: nextId, name, slug: productSlug, price: values[3], origin_price: values[4]
                        });

                        // Execute the insert query
                        await pool.default.query(sql, values);

                        return res.status(201).json({
                            success: true,
                            message: 'Product added successfully!',
                            productId: nextId,
                            insertedProduct: { // Return some of the data for confirmation
                                id: nextId,
                                name: name,
                                slug: productSlug,
                                category: category,
                                main_image: main_image,
                                price: parseFloat(price)
                            }
                        });

                    } catch (error) {
                        console.error('Product creation error:', error);
                        return res.status(500).json({
                            success: false,
                            error: 'Failed to create product',
                            details: error.message,
                            stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined // Include stack in dev
                        });
                    }
                }

                // GET single product by ID
                if (pathname.startsWith('/api/admin/products/') && req.method === 'GET' && pathname !== '/api/admin/products') {
                    const id = pathname.split('/').pop();
                    const [rows] = await pool.default.query("SELECT * FROM products WHERE id = ?", [id]);
                    if (rows.length === 0) {
                        return res.status(404).json({ message: "Product not found" });
                    }
                    return res.status(200).json(rows[0]);
                }

                // PUT update product
                 if (pathname.startsWith('/api/admin/products/') && req.method === 'PUT') {
                    const id = pathname.split('/').pop();
                    try {
                        const {
                            name, category, type, price, origin_price, quantity, sold, rate,
                            brand, description, sizes, variations, gallery, main_image,
                            is_new, on_sale, slug, action
                        } = req.body;

                        if (!name || !category || !price) {
                            return res.status(400).json({
                                success: false,
                                error: 'Missing required fields: name, category, price'
                            });
                        }

                         // --- Parsing logic (Duplicated for availability) ---
                        let parsedVariations = {};
                        if (variations) {
                            try {
                                const variationsData = typeof variations === 'string' ? JSON.parse(variations) : variations;
                                if (typeof variationsData === 'object' && Object.keys(variationsData).length > 0) {
                                    parsedVariations = variationsData;
                                }
                            } catch (e) { console.error('Error parsing variations:', e); }
                        }

                        let parsedSizes = [];
                        if (sizes) {
                            try {
                                parsedSizes = typeof sizes === 'string' ? JSON.parse(sizes) : sizes;
                                if (!Array.isArray(parsedSizes)) parsedSizes = [];
                            } catch (e) { console.error('Error parsing sizes:', e); }
                        }

                        let parsedGallery = [];
                        if (gallery) {
                            try {
                                parsedGallery = typeof gallery === 'string' ? JSON.parse(gallery) : gallery;
                                if (!Array.isArray(parsedGallery)) parsedGallery = [];
                            } catch (e) { console.error('Error parsing gallery:', e); }
                        }

                        const productSlug = slug && slug.trim() !== '' ? slug : name.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]+/g, "");
                        const finalThumbImage = parsedGallery.length > 0 ? parsedGallery[0] : (main_image || null);

                        const sql = `
                            UPDATE products SET
                            name=?, slug=?, price=?, origin_price=?, quantity=?, sold=?, rate=?,
                            is_new=?, on_sale=?, category=?, description=?, type=?, brand=?,
                            main_image=?, thumb_image=?, gallery=?, sizes=?, variations=?, action=?
                            WHERE id=?
                        `;
                         const values = [
                            name,
                            productSlug,
                            parseFloat(price) || 0.00,
                            parseFloat(origin_price) || null,
                            parseInt(quantity) || 0,
                            parseInt(sold) || 0,
                            parseFloat(rate) || 0.0,
                            Boolean(is_new) ? 1 : 0,
                            Boolean(on_sale) ? 1 : 0,
                            category,
                            description || null,
                            type || null,
                            brand || null,
                            main_image || null,
                            finalThumbImage,
                            JSON.stringify(parsedGallery),
                            JSON.stringify(parsedSizes),
                            JSON.stringify(parsedVariations),
                            action || 'add to cart',
                            id // Where clause
                        ];

                        const [result] = await pool.default.query(sql, values);

                        if (result.affectedRows === 0) {
                             return res.status(404).json({ message: "Product not found or no changes made." });
                        }

                        return res.status(200).json({
                            success: true,
                            message: 'Product updated successfully!',
                            productId: id
                        });

                    } catch (error) {
                        console.error('Product update error:', error);
                        return res.status(500).json({
                            success: false,
                            error: 'Failed to update product',
                            details: error.message
                        });
                    }
                }

                // DELETE product
                if (pathname.startsWith('/api/admin/products/') && req.method === 'DELETE') {
                    const id = pathname.split('/').pop();
                    await pool.default.query("DELETE FROM products WHERE id = ?", [id]);
                    return res.status(200).json({ message: "Product deleted successfully!" });
                }

                return res.status(404).json({ message: "Product endpoint not found" });
            } catch (error) {
                console.error("Product operation error:", error);
                return res.status(500).json({ message: "Product operation failed", error: error.message });
            }
        }

        // Categories routes
        if (pathname.startsWith('/api/admin/categories')) {
            try {
                const pool = await import("../backend/utils/db.js");

                // Handle different category endpoints
                if (pathname === '/api/admin/categories/public' && req.method === 'GET') {
                    const [rows] = await pool.default.query(`
                        SELECT id, name, data_item, sale, created_at
                        FROM categories
                        ORDER BY created_at DESC
                    `);
                    return res.status(200).json(rows);
                }

                if (pathname === '/api/admin/categories' && req.method === 'POST') {
                    const { name, sale, data_item } = req.body;
                    if (!name) {
                        return res.status(400).json({ message: "Category name is required!" });
                    }
                    const finalDataItem = data_item?.trim() || name.toLowerCase().replace(/\s+/g, "");
                    const [result] = await pool.default.query(
                        "INSERT INTO categories (name, data_item, sale) VALUES (?, ?, ?)",
                        [name, finalDataItem, sale || 0]
                    );
                    return res.status(200).json({
                        message: "Category added successfully!",
                        data: { id: result.insertId, name, data_item: finalDataItem, sale: sale || 0 }
                    });
                }

                if (pathname.startsWith('/api/admin/categories/') && req.method === 'DELETE') {
                    const id = pathname.split('/').pop();
                    await pool.default.query("DELETE FROM categories WHERE id = ?", [id]);
                    return res.status(200).json({ message: "Category deleted successfully!" });
                }

                return res.status(404).json({ message: "Category endpoint not found" });
            } catch (error) {
                console.error("Category operation error:", error);
                return res.status(500).json({ message: "Category operation failed", error: error.message });
            }
        }

        // --- ATTRIBUTES ROUTES - REWRITTEN ---
        if (pathname.startsWith('/api/admin/attributes')) {
            try {
                const pool = await import("../backend/utils/db.js");

                // GET all attributes
                if (pathname === '/api/admin/attributes' && req.method === 'GET') {
                    const [rows] = await pool.default.query(`
                        SELECT a.id, a.attribute_name, a.attribute_values, a.created_at,
                               c.name AS category_name
                        FROM attributes a
                        LEFT JOIN categories c ON a.category_id = c.id
                        ORDER BY a.created_at DESC
                    `);
                    return res.status(200).json(rows);
                }

                // POST new attribute
                if (pathname === '/api/admin/attributes' && req.method === 'POST') {
                    const { category_id, attribute_name, attribute_values } = req.body;

                    // Validate that all required fields are present
                    if (!category_id || !attribute_name || !attribute_values) {
                        return res.status(400).json({
                            error: "Missing required fields: category_id, attribute_name, and attribute_values",
                        });
                    }

                    // Validate that attribute_values is a non-empty array
                    if (!Array.isArray(attribute_values) || attribute_values.length === 0) {
                        return res.status(400).json({
                            error: "attribute_values must be a non-empty array of objects.",
                        });
                    }

                    const [result] = await pool.default.query(
                        `INSERT INTO attributes (category_id, attribute_name, attribute_values)
                        VALUES (?, ?, ?)`,
                        [category_id, attribute_name, JSON.stringify(attribute_values)]
                    );

                    return res.status(201).json({
                        success: true,
                        id: result.insertId,
                        message: "Attribute added successfully",
                    });
                }

                // DELETE attribute
                if (pathname.startsWith('/api/admin/attributes/') && req.method === 'DELETE') {
                    const id = pathname.split('/').pop();
                    await pool.default.query("DELETE FROM attributes WHERE id = ?", [id]);
                    return res.status(200).json({ message: "Attribute deleted successfully!" });
                }

                return res.status(404).json({ message: "Attribute endpoint not found" });
            } catch (error) {
                console.error("Attribute operation error:", error);
                return res.status(500).json({ message: "Attribute operation failed", error: error.message });
            }
        }



        // Admin Users routes (for managing admins)
        if (pathname.startsWith('/api/admin/users')) {
            try {
                const pool = await import("../backend/utils/db.js");
                const bcrypt = await import("bcrypt");
                const jwt = await import("jsonwebtoken");
                const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

                // GET all admins
                if (pathname === '/api/admin/users' && req.method === 'GET') {
                    const [rows] = await pool.default.query(`
                SELECT id, name, email, phone, role, permissions, created_at
                FROM admins
                ORDER BY created_at DESC
            `);
                    return res.status(200).json(rows);
                }

                // GET current logged-in admin (from cookie/token)
                if (pathname === '/api/admin/users/me' && req.method === 'GET') {
                    try {
                        // Extract token from cookie
                        const token = req.headers.cookie?.split(';')
                            .find(c => c.trim().startsWith('adminToken='))
                            ?.split('=')[1];

                        if (!token) {
                            return res.status(401).json({ message: "Unauthorized ❌ (no token)" });
                        }

                        // Verify token
                        const decoded = jwt.default.verify(token, JWT_SECRET);

                        // Fetch admin from DB
                        const [rows] = await pool.default.query(
                            "SELECT id, name, email, role, phone, permissions FROM admins WHERE id = ? LIMIT 1",
                            [decoded.id]
                        );

                        if (rows.length === 0) {
                            return res.status(404).json({ message: "Admin not found ❌" });
                        }

                        return res.status(200).json({
                            success: true,
                            admin: rows[0]
                        });
                    } catch (err) {
                        console.error("Error in /api/admin/users/me:", err);
                        return res.status(500).json({ message: "Failed to fetch admin ❌", error: err.message });
                    }
                }

                // POST new admin
                if (pathname === '/api/admin/users' && req.method === 'POST') {
                    const { name, email, password, phone, role, permissions } = req.body;

                    if (!name || !email || !password) {
                        return res.status(400).json({
                            message: "Name, email, and password are required!"
                        });
                    }

                    // Check if admin already exists
                    const [existing] = await pool.default.query(
                        "SELECT id FROM admins WHERE email = ?", [email]
                    );

                    if (existing.length > 0) {
                        return res.status(409).json({ message: "Admin with this email already exists!" });
                    }

                    // Hash password
                    const password_hash = await bcrypt.default.hash(password, 10);

                    const [result] = await pool.default.query(`
                INSERT INTO admins (name, email, password_hash, phone, role, permissions)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [name, email, password_hash, phone || null, role || 'admin', JSON.stringify(permissions || {})]);

                    return res.status(200).json({
                        message: "Admin created successfully!",
                        data: { id: result.insertId, name, email, role: role || 'admin' }
                    });
                }

                // PUT update admin
                if (pathname.startsWith('/api/admin/users/') && req.method === 'PUT') {
                    const id = pathname.split('/').pop();
                    const { name, email, phone } = req.body;

                    if (!name || !email) {
                        return res.status(400).json({
                            message: "Name and email are required!"
                        });
                    }

                    // Check if email already exists for another admin
                    const [existing] = await pool.default.query(
                        "SELECT id FROM admins WHERE email = ? AND id != ?", [email, id]
                    );

                    if (existing.length > 0) {
                        return res.status(409).json({ message: "Email already exists for another admin!" });
                    }

                    const [result] = await pool.default.query(`
                UPDATE admins SET name = ?, email = ?, phone = ? WHERE id = ?
            `, [name, email, phone || null, id]);

                    if (result.affectedRows === 0) {
                        return res.status(404).json({ message: "Admin not found!" });
                    }

                    return res.status(200).json({
                        message: "Admin updated successfully!",
                        data: { id, name, email, phone }
                    });
                }

                // DELETE admin
                if (pathname.startsWith('/api/admin/users/') && req.method === 'DELETE') {
                    const id = pathname.split('/').pop();
                    const [result] = await pool.default.query("DELETE FROM admins WHERE id = ?", [id]);

                    if (result.affectedRows === 0) {
                        return res.status(404).json({ message: "Admin not found!" });
                    }

                    return res.status(200).json({ message: "Admin deleted successfully!" });
                }

                return res.status(404).json({ message: "Admin endpoint not found" });
            } catch (error) {
                console.error("Admin operation error:", error);
                return res.status(500).json({ message: "Admin operation failed", error: error.message });
            }
        }

        // Orders routes
        if (pathname.startsWith('/api/orders')) {
            try {
                const pool = await import("../backend/utils/db.js");

                // Check if Razorpay credentials are available
                if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
                    console.error("Razorpay credentials not found in environment variables");
                    // Important: Decide if you want to block all order operations if payment gateway is not configured
                    // For now, we'll let non-payment-related order routes proceed.
                    // return res.status(500).json({
                    //     success: false,
                    //     error: "Payment gateway configuration error"
                    // });
                }

                const Razorpay = await import("razorpay");

                // Initialize Razorpay
                const razorpay = new Razorpay.default({
                    key_id: process.env.RAZORPAY_KEY_ID,
                    key_secret: process.env.RAZORPAY_KEY_SECRET,
                });

                // POST /api/orders/create-order
                if (pathname === '/api/orders/create-order' && req.method === 'POST') {
                    const {
                        first_name, last_name, email, phone_number,
                        city, apartment, postal_code, note, amount, products // `products` is already expected as an array/object
                    } = req.body;

                    if (!amount || !first_name || !email || !products || !Array.isArray(products) || products.length === 0) {
                        return res.status(400).json({
                            success: false,
                            error: 'Missing required fields: amount, first_name, email, or products array is empty'
                        });
                    }

                    try {
                        // Recalculate amount from the products array for accuracy,
                        // assuming `amount` from frontend is for initial Razorpay order creation.
                        const calculatedAmount = products.reduce((sum, p) => {
                            const price = parseFloat(p.price) || 0;
                            const quantity = parseInt(p.quantity) || 0;
                            return sum + (price * quantity);
                        }, 0);

                        // Create Razorpay order
                        const razorpayOrder = await razorpay.orders.create({
                            amount: calculatedAmount * 100, // Convert to paise
                            currency: "INR",
                            receipt: `order_${Date.now()}`,
                        });

                        console.log("Razorpay order created:", razorpayOrder.id);

                        // Save order to database with products JSON
                        const [result] = await pool.default.query(`
                            INSERT INTO orders (first_name, last_name, email, phone_number,
                                city, apartment, postal_code, note, amount,
                                razorpay_order_id, status, products, created_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                        `, [
                            first_name, last_name, email, phone_number,
                            city, apartment, postal_code, note, calculatedAmount, // Use calculated amount
                            razorpayOrder.id, 'pending', JSON.stringify(products) // Store `products` as JSON string
                        ]);

                        console.log("Order saved to database with ID:", result.insertId);
                        console.log("Products saved:", products);

                        return res.status(200).json({
                            success: true,
                            key: process.env.RAZORPAY_KEY_ID,
                            razorpay_order: razorpayOrder,
                            order_id: result.insertId
                        });
                    } catch (error) {
                        console.error("Razorpay order creation or DB save error details:", error);
                        return res.status(500).json({
                            success: false,
                            error: `Payment gateway or database save error: ${error.message || 'Unknown error'}`,
                            details: process.env.NODE_ENV !== 'production' ? error.stack : undefined
                        });
                    }
                }

                // POST /api/orders/capture-order
                if (pathname === '/api/orders/capture-order' && req.method === 'POST') {
                    const { razorpay_order_id, razorpay_payment_id, payment_status, order_id } = req.body;

                    try {
                        // Update order status in database
                        await pool.default.query(`
                            UPDATE orders
                            SET razorpay_payment_id = ?, status = ?, updated_at = NOW()
                            WHERE razorpay_order_id = ?
                        `, [razorpay_payment_id, payment_status, razorpay_order_id]);

                        console.log(`Order ${order_id} payment captured successfully`);

                        return res.status(200).json({
                            success: true,
                            message: 'Payment captured successfully',
                            order_id: order_id
                        });
                    } catch (error) {
                        console.error("Payment capture error:", error);
                        return res.status(500).json({
                            success: false,
                            error: 'Failed to capture payment',
                            details: process.env.NODE_ENV !== 'production' ? error.stack : undefined
                        });
                    }
                }

                // GET /api/orders - Get all orders with product details
                if (pathname === '/api/orders' && req.method === 'GET') {
                    try {
                        console.log("Attempting to fetch all orders from database...");
                        const [orders] = await pool.default.query(`
            SELECT
                id, first_name, last_name, email, phone_number,
                city, apartment, postal_code, note, amount,
                razorpay_order_id, razorpay_payment_id, status,
                delivery_status,
                out_for_delivery_at,
                delivered_at,
                products, created_at, updated_at, canceled_at
            FROM orders
            ORDER BY created_at DESC
        `);
                        console.log(`Successfully fetched ${orders.length} raw orders.`);

                        const ordersWithProducts = orders.map(order => {
                            let parsedProducts = [];
                            let recalculatedAmount = parseFloat(order.amount) || 0; // Initialize with DB amount

                            // If products column is of JSON type, mysql2 might auto-parse it.
                            // If not, it will be a string, and we need to parse it.
                            if (typeof order.products === 'string') {
                                try {
                                    parsedProducts = JSON.parse(order.products);
                                    if (!Array.isArray(parsedProducts)) {
                                        console.warn(`Backend: Order ${order.id}: Parsed 'products' was not an array. Resetting. Raw: ${order.products}`);
                                        parsedProducts = [];
                                    }
                                } catch (e) {
                                    console.error(`Backend: Order ${order.id}: Error parsing 'products' JSON string: ${e.message}. Raw: ${order.products}`);
                                    parsedProducts = []; // Fallback to empty array on parse error
                                }
                            } else if (Array.isArray(order.products)) {
                                parsedProducts = order.products; // Already parsed by driver
                            } else {
                                // Handle null, undefined, or other unexpected types
                                console.warn(`Backend: Order ${order.id}: 'products' column had unexpected type. Raw:`, order.products, `(Type: ${typeof order.products})`);
                                parsedProducts = [];
                            }

                            // Recalculate amount from the actual products for display consistency
                            if (parsedProducts.length > 0) {
                                recalculatedAmount = parsedProducts.reduce((sum, p) => {
                                    const price = parseFloat(p.price) || 0;
                                    const quantity = parseInt(p.quantity) || 0;
                                    return sum + (price * quantity);
                                }, 0);
                            }

                            return {
                                ...order,
                                products: parsedProducts,
                                amount: recalculatedAmount.toFixed(2),
                                // Ensure timestamps are correctly formatted if needed by frontend
                                created_at: order.created_at ? new Date(order.created_at).toISOString() : null,
                                updated_at: order.updated_at ? new Date(order.updated_at).toISOString() : null,
                                delivered_at: order.delivered_at ? new Date(order.delivered_at).toISOString() : null,
                                out_for_delivery_at: order.out_for_delivery_at ? new Date(order.out_for_delivery_at).toISOString() : null,
                                canceled_at: order.canceled_at ? new Date(order.canceled_at).toISOString() : null,
                            };
                        });
                        console.log("Successfully processed all orders.");

                        return res.status(200).json({
                            success: true,
                            orders: ordersWithProducts
                        });
                    } catch (dbError) {
                        console.error("Database query error for GET /api/orders:", dbError);
                        return res.status(500).json({
                            success: false,
                            error: 'Failed to fetch orders from the database.',
                            details: process.env.NODE_ENV !== 'production' ? dbError.message : undefined,
                            stack: process.env.NODE_ENV !== 'production' ? dbError.stack : undefined
                        });
                    }
                }

                // GET /api/orders/stats - Summary of order analytics
                // (No changes needed here based on your description, assuming 'amount' in DB is reliable for sums)
                if (pathname === '/api/orders/stats' && req.method === 'GET') {
                    try {
                        const [rows] = await pool.default.query(`
                            SELECT
                                COUNT(*) AS total_orders,
                                SUM(amount) AS total_income,
                                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_orders,
                                COUNT(DISTINCT email) AS unique_customers
                            FROM orders
                        `);

                        const stats = rows[0] || {};

                        const totalOrders = stats.total_orders || 0;
                        const totalIncome = parseFloat(stats.total_income || 0).toFixed(2); // Ensure income is formatted
                        const completedOrders = stats.completed_orders || 0;
                        const totalVisitors = stats.unique_customers || 0;

                        const ordersPaid = completedOrders; // Assuming 'completed' means paid
                        const totalSales = completedOrders; // Assuming 'completed' means sales

                        return res.status(200).json({
                            success: true,
                            data: {
                                totalSales,
                                totalIncome,
                                ordersPaid,
                                totalVisitors
                            }
                        });
                    } catch (error) {
                        console.error("Order stats fetch error:", error);
                        return res.status(500).json({
                            success: false,
                            error: 'Failed to fetch order stats',
                            details: process.env.NODE_ENV !== 'production' ? error.message : undefined
                        });
                    }
                }


                // GET /api/orders/:id - Get specific order details
                if (pathname.startsWith('/api/orders/') && req.method === 'GET') {
                    const orderId = pathname.split('/')[3];

                    if (!orderId || isNaN(orderId)) {
                        console.warn(`Attempt to fetch order with invalid ID: ${orderId}`);
                        return res.status(400).json({
                            success: false,
                            error: 'Invalid order ID provided.'
                        });
                    }

                    try {
                        console.log(`Attempting to fetch specific order ID: ${orderId} from database...`);
                        const [orders] = await pool.default.query(`
                            SELECT
                                id, first_name, last_name, email, phone_number,
                                city, apartment, postal_code, note, amount,
                                razorpay_order_id, razorpay_payment_id, status,
                                delivery_status, out_for_delivery_at, delivered_at, canceled_at,
                                products, created_at, updated_at
                            FROM orders
                            WHERE id = ?
                        `, [orderId]);

                        if (orders.length === 0) {
                            console.warn(`Order ID: ${orderId} not found.`);
                            return res.status(404).json({
                                success: false,
                                error: 'Order not found'
                            });
                        }

                        const order = orders[0];
                        let parsedProducts = [];
                        let recalculatedAmount = parseFloat(order.amount) || 0;

                        // If products column is of JSON type, mysql2 might auto-parse it.
                        // If not, it will be a string, and we need to parse it.
                        if (typeof order.products === 'string') {
                            try {
                                parsedProducts = JSON.parse(order.products);
                                if (!Array.isArray(parsedProducts)) {
                                    console.warn(`Backend: Order ${order.id}: Parsed 'products' was not an array. Resetting. Raw: ${order.products}`);
                                    parsedProducts = [];
                                }
                            } catch (e) {
                                console.error(`Backend: Order ${order.id}: Error parsing 'products' JSON string: ${e.message}. Raw: ${order.products}`);
                                parsedProducts = []; // Fallback to empty array on parse error
                            }
                        } else if (Array.isArray(order.products)) {
                            parsedProducts = order.products; // Already parsed by driver
                        } else {
                            // Handle null, undefined, or other unexpected types
                            console.warn(`Backend: Order ${order.id}: 'products' column had unexpected type. Raw:`, order.products, `(Type: ${typeof order.products})`);
                            parsedProducts = [];
                        }

                        // Recalculate amount from the actual products for display consistency
                        if (parsedProducts.length > 0) {
                            recalculatedAmount = parsedProducts.reduce((sum, p) => {
                                const price = parseFloat(p.price) || 0;
                                const quantity = parseInt(p.quantity) || 0;
                                return sum + (price * quantity);
                            }, 0);
                        }

                        return res.status(200).json({
                            success: true,
                            order: {
                                ...order,
                                products: parsedProducts,
                                amount: recalculatedAmount.toFixed(2),
                                // Ensure timestamps are correctly formatted if needed by frontend
                                created_at: order.created_at ? new Date(order.created_at).toISOString() : null,
                                updated_at: order.updated_at ? new Date(order.updated_at).toISOString() : null,
                                delivered_at: order.delivered_at ? new Date(order.delivered_at).toISOString() : null,
                                out_for_delivery_at: order.out_for_delivery_at ? new Date(order.out_for_delivery_at).toISOString() : null,
                                canceled_at: order.canceled_at ? new Date(order.canceled_at).toISOString() : null,
                            }
                        });
                    } catch (error) {
                        console.error(`Get specific order ID: ${orderId} error:`, error);
                        return res.status(500).json({
                            success: false,
                            error: 'Failed to fetch order',
                            details: process.env.NODE_ENV !== 'production' ? error.message : undefined,
                            stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
                        });
                    }
                }
                // DELETE /api/orders/:id - Delete order
                if (pathname.startsWith('/api/orders/') && req.method === 'DELETE') {
                    const orderId = pathname.split('/')[3];

                    try {
                        const [result] = await pool.default.query(`
                            DELETE FROM orders WHERE id = ?
                        `, [orderId]);

                        if (result.affectedRows === 0) {
                            return res.status(404).json({
                                success: false,
                                error: 'Order not found'
                            });
                        }

                        return res.status(200).json({
                            success: true,
                            message: 'Order deleted successfully'
                        });
                    } catch (error) {
                        console.error("Delete order error:", error);
                        return res.status(500).json({
                            success: false,
                            error: 'Failed to delete order',
                            details: process.env.NODE_ENV !== 'production' ? error.message : undefined,
                            stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
                        });
                    }
                }

                // PUT /api/orders/:id/delivery-status - Update delivery status
                if (pathname.startsWith('/api/orders/') && pathname.endsWith('/delivery-status') && req.method === 'PUT') {
                    const orderId = pathname.split('/')[3]; // Extracts ID from /api/orders/{id}/delivery-status
                    const { delivery_status } = req.body;

                    if (!orderId || isNaN(orderId)) {
                        return res.status(400).json({ success: false, error: 'Invalid order ID provided.' });
                    }
                    if (!delivery_status || typeof delivery_status !== 'string' || delivery_status.trim() === '') {
                        return res.status(400).json({ success: false, error: 'A valid delivery_status is required.' });
                    }

                    // Ensure this list matches your ENUM in the database
                    const validStatuses = ['pending', 'processing', 'shipped', 'out for delivery', 'delivered', 'returned', 'cancelled'];
                    if (!validStatuses.includes(delivery_status.toLowerCase())) {
                        return res.status(400).json({ success: false, error: `Invalid delivery status: ${delivery_status}. Must be one of: ${validStatuses.join(', ')}.` });
                    }

                    try {
                        const setClauses = [`delivery_status = ?`, `updated_at = NOW()`];
                        const updateValues = [delivery_status];

                        // Add specific timestamp updates based on status
                        if (delivery_status.toLowerCase() === 'out for delivery') {
                            setClauses.push(`out_for_delivery_at = NOW()`);
                        } else if (delivery_status.toLowerCase() === 'delivered') {
                            setClauses.push(`delivered_at = NOW()`);
                        } else if (delivery_status.toLowerCase() === 'cancelled') {
                            setClauses.push(`canceled_at = NOW()`);
                        }

                        const updateSql = `UPDATE orders SET ${setClauses.join(', ')} WHERE id = ?`;
                        updateValues.push(orderId); // Add orderId at the end for the WHERE clause

                        const [result] = await pool.default.query(updateSql, updateValues);

                        if (result.affectedRows === 0) {
                            const [existingOrderRows] = await pool.default.query(`SELECT id FROM orders WHERE id = ?`, [orderId]);
                            if (existingOrderRows.length === 0) {
                                return res.status(404).json({ success: false, message: 'Order not found.' });
                            }
                            // If order found but no rows affected, it means the status was already the same.
                            return res.status(200).json({ success: true, message: `Order ${orderId} delivery status is already "${delivery_status}".`, new_status: delivery_status });
                        }

                        return res.status(200).json({
                            success: true,
                            message: `Order ${orderId} delivery status updated to "${delivery_status}".`,
                            new_status: delivery_status
                        });
                    } catch (error) {
                        console.error(`Error updating delivery status for order ID: ${orderId}:`, error);
                        return res.status(500).json({
                            success: false,
                            error: 'Failed to update delivery status.',
                            details: process.env.NODE_ENV !== 'production' ? error.message : undefined,
                            stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
                        });
                    }
                }

                // GET /api/orders/test - Test endpoint
                if (pathname === '/api/orders/test' && req.method === 'GET') {
                    return res.status(200).json({
                        success: true,
                        message: "Orders API is working",
                        hasRazorpayKey: !!process.env.RAZORPAY_KEY_ID,
                        hasRazorpaySecret: !!process.env.RAZORPAY_KEY_SECRET,
                        timestamp: new Date().toISOString()
                    });
                }

                // POST /api/orders/cancel-order - THIS IS A DUPLICATE OF PUT /delivery-status for 'cancelled'
                // It's generally better to use the PUT /delivery-status endpoint for consistency
                // and to avoid duplicate logic. I've updated the PUT to handle 'cancelled' status.
                // You can remove this /api/orders/cancel-order endpoint if you use the PUT for all status updates.
                if (pathname === '/api/orders/cancel-order' && req.method === 'POST') {
                    const { order_id } = req.body;

                    if (!order_id) {
                        return res.status(400).json({
                            success: false,
                            error: 'Missing required field: order_id'
                        });
                    }

                    try {
                        // Update order status to 'cancelled' and set canceled_at timestamp
                        const [result] = await pool.default.query(`
            UPDATE orders
            SET status = 'cancelled', delivery_status = 'cancelled', canceled_at = NOW(), updated_at = NOW()
            WHERE id = ? AND status != 'delivered' AND delivery_status != 'delivered' -- Prevent canceling already delivered orders
        `, [order_id]);

                        if (result.affectedRows === 0) {
                            return res.status(404).json({
                                success: false,
                                error: 'Order not found or cannot be cancelled (e.g., already delivered).'
                            });
                        }

                        console.log(`Order ${order_id} cancelled successfully`);

                        return res.status(200).json({
                            success: true,
                            message: 'Order cancelled successfully'
                        });
                    } catch (error) {
                        console.error("Order cancellation error:", error);
                        return res.status(500).json({
                            success: false,
                            error: `Failed to cancel order: ${error.message || 'Unknown error'}`,
                            details: process.env.NODE_ENV !== 'production' ? error.stack : undefined
                        });
                    }
                }

                return res.status(404).json({ message: "Order endpoint not found" });
            } catch (error) {
                console.error("Order operation error (outer catch):", error); // Clarified log
                return res.status(500).json({
                    message: "Order operation failed (outer catch)", // Clarified message
                    error: error.message,
                    details: process.env.NODE_ENV !== 'production' ? error.stack : undefined
                });
            }
        }
        // User Profile Routes
        if (pathname.startsWith('/api/user')) {
            const jwt = await import("jsonwebtoken");
            const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";
            const pool = await import("../backend/utils/db.js");
            const bcrypt = await import("bcrypt");

            // Extract token from Authorization header (Bearer token)
            const authHeader = req.headers.authorization;
            const token = authHeader && authHeader.split(' ')[1];

            if (!token) {
                return res.status(401).json({ message: "Unauthorized: No token provided ❌" });
            }

            let decoded;
            try {
                decoded = jwt.default.verify(token, JWT_SECRET);
            } catch (err) {
                return res.status(401).json({ message: "Unauthorized: Invalid token ❌" });
            }

            const userId = decoded.id;


            // GET /api/user/profile - Fetch user data and their orders
            if (pathname === '/api/user/profile' && req.method === 'GET') {
                try {
                    // 1. Fetch user basic data from the 'users' table
                    const [userRows] = await pool.default.query(
                        "SELECT id, name, email FROM users WHERE id = ?",
                        [userId]
                    );

                    if (userRows.length === 0) {
                        return res.status(404).json({ message: "User not found ❌" });
                    }
                    const user = userRows[0];
                    const [firstName, lastName] = user.name ? user.name.split(' ') : ['', ''];

                    // 2. Fetch user's orders from the 'orders' table
                    // IMPORTANT: Ensure your 'orders' table has an 'email' column that matches the user's email
                    // For robustness, consider adding a `user_id` foreign key to your 'orders' table.
                    const [orderRows] = await pool.default.query(
                        `
                        SELECT
                            id, first_name, last_name, email, phone_number, city, apartment,
                            postal_code, note, amount, razorpay_order_id, razorpay_payment_id,
                            status, products, created_at, updated_at
                        FROM orders
                        WHERE email = ? -- Linking orders to the user via email
                        ORDER BY created_at DESC;
                        `,
                        [user.email] // Use the email fetched from the 'users' table
                    );

                    // Parse the 'products' JSON string in each order
                    const ordersWithParsedProducts = orderRows.map(order => {
                        // Ensure 'products' exists and is a string before parsing
                        if (order.products && typeof order.products === 'string') {
                            try {
                                order.products = JSON.parse(order.products);
                            } catch (e) {
                                console.error(`Error parsing products JSON for order ${order.id}:`, e);
                                order.products = []; // Set to empty array on parse error
                            }
                        } else if (!order.products) { // If products column is null/undefined
                            order.products = [];
                        }
                        // If it's already an array (mysql2 driver auto-parsed JSON), keep it as is
                        return order;
                    });

                    return res.status(200).json({
                        message: "User data and orders fetched successfully ✅",
                        user: {
                            id: user.id,
                            first_name: firstName,
                            last_name: lastName || '',
                            email: user.email,
                            // If you have phone_number/dob in your 'users' table, fetch them here.
                            // Otherwise, they will remain empty in the profile data.
                            phone_number: '',
                            dob: ''
                        },
                        orders: ordersWithParsedProducts
                    });
                } catch (error) {
                    console.error("Fetch user data and orders error:", error);
                    return res.status(500).json({ message: "Failed to fetch user data and orders ❌", error: error.message });
                }
            }

            // PUT /api/user/profile - Update profile
            if (pathname === '/api/user/profile' && req.method === 'PUT') {
                const { first_name, last_name, phone_number, email, dob } = req.body;
                const fullName = `${first_name || ''} ${last_name || ''}`.trim();
                if (!fullName || !email) {
                    return res.status(400).json({ message: "Name and email are required ❌" });
                }
                try {
                    const [result] = await pool.default.query(
                        "UPDATE users SET name = ?, email = ? WHERE id = ?",
                        [fullName, email, userId]
                    );
                    if (result.affectedRows === 0) {
                        return res.status(404).json({ message: "User not found ❌" });
                    }
                    return res.status(200).json({ message: "Profile updated successfully ✅" });
                } catch (error) {
                    console.error("Update profile error:", error);
                    return res.status(500).json({ message: "Failed to update profile ❌", error: error.message });
                }
            }

            // PUT /api/user/password - Change password
            if (pathname === '/api/user/password' && req.method === 'PUT') {
                const { current_password, new_password, confirm_new_password } = req.body;
                if (!current_password || !new_password || new_password !== confirm_new_password) {
                    return res.status(400).json({ message: "Passwords are required and must match ❌" });
                }
                try {
                    const [rows] = await pool.default.query(
                        "SELECT password_hash FROM users WHERE id = ?",
                        [userId]
                    );
                    if (rows.length === 0) {
                        return res.status(404).json({ message: "User not found ❌" });
                    }
                    const isMatch = await bcrypt.default.compare(current_password, rows[0].password_hash);
                    if (!isMatch) {
                        return res.status(401).json({ message: "Current password is incorrect ❌" });
                    }
                    const newHash = await bcrypt.default.hash(new_password, 10);
                    await pool.default.query(
                        "UPDATE users SET password_hash = ? WHERE id = ?",
                        [newHash, userId]
                    );
                    return res.status(200).json({ message: "Password changed successfully ✅" });
                } catch (error) {
                    console.error("Change password error:", error);
                    return res.status(500).json({ message: "Failed to change password ❌", error: error.message });
                }
            }

            return res.status(404).json({ message: "User endpoint not found" });
        }

        // Add /api/auth/check endpoint before the default response
        if (pathname === '/api/auth/check' && req.method === 'GET') {
            try {
                const { checkAuth } = await import("../backend/controllers/authController.js");
                const mockReq = {
                    headers: req.headers,
                    method: req.method,
                    url: req.url
                };
                const mockRes = {
                    status: (code) => ({
                        json: (data) => res.status(code).json(data)
                    }),
                    json: (data) => res.status(200).json(data)
                };
                await checkAuth(mockReq, mockRes);
                return;
            } catch (error) {
                console.error("Auth check error:", error);
                return res.status(500).json({ message: "Auth check failed ❌", error: error.message });
            }
        }

        // Default response for unhandled API paths
        return res.status(200).json({
            message: "API function is running",
            path: pathname,
            method: req.method,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error("Function error (top-level catch):", error); // Clarified log
        return res.status(500).json({
            error: "Internal server error (top-level catch)", // Clarified message
            message: error.message,
            timestamp: new Date().toISOString(),
            details: process.env.NODE_ENV !== 'production' ? error.stack : undefined
        });
    }
}