
document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("searchInput");
    const suggestionsBox = document.getElementById("suggestions");
    const searchIcon = document.querySelector(".ph-magnifying-glass");

    // Exit if search elements don't exist on this page
    if (!searchInput || !suggestionsBox || !searchIcon) {
        return;
    }

    const API_URL = "https://www.shubhakuteer.in/api/admin/products"; 
    const SHOP_PAGE_BASE_URL = "/shop.html"; 
    // New: Define the base URL for your generic product display page
    const PRODUCT_DISPLAY_BASE_URL = "/product-default.html"; 


    const CANONICAL_CATEGORIES = [
        "Bedsheets",
        "Honeycomb Towels",
        "Dohar and Quilts",
        "Table Range",
        "More",
        "Gifting",
        "Apparels",
        "Bags and Kits",
        "Cushions and Pillow Covers"
    ];

    const SYNONYM_MAP = {
        "kaftan": "Apparels",
        "kaftans": "Apparels",
        "kaf": "Apparels", 
        "king size bedsheets" : "Bedsheets",
        "kingsize bedsheet" : "Bedsheets",
        "Queen size bedsheets" : "Bedsheets",
        "queensize bedsheet" : "Bedsheets",
        "towel": "Honeycomb Towels", 
        "towels": "Honeycomb Towels", 
        "pillow": "Cushions and Pillow Covers",
        "cushion": "Cushions and Pillow Covers",
        "cushion cover": "Cushions and Pillow Covers",
        "pillow cover": "Cushions and Pillow Covers",
        "dohar": "Dohar and Quilts",
        "quilts": "Dohar and Quilts",
        "table mat": "Table Range",
        "tablemats": "Table Range",
        "runner": "Table Range",
        "table runner": "Table Range",
        "bag": "Bags and Kits",
        "tote": "Bags and Kits",
        "tote bags": "Bags and Kits",
        "travel kit": "Bags and Kits",
        "travel kits": "Bags and Kits",
        "curtain": "More" 
    };

    let products = [];
    let fuzzysortSearchableItems = []; 
    let fuzzysortCanonicalAndSynonymTerms = []; 


    fetch(API_URL)
        .then(res => {
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.json();
        })
        .then(data => {
            products = data;
            fuzzysortSearchableItems = products.map(p => {
                // Ensure id is present and is a string for URL use, slug for search target
                const safeSlug = p.slug ? String(p.slug) : ''; 
                const safeId = p.id ? String(p.id) : ''; // Assuming 'p.id' exists in your product data

                return {
                    target: `${p.name} ${p.category || ''} ${p.type || ''} ${p.brand || ''} ${safeSlug}`.trim(), 
                    original: { ...p, slug: safeSlug, id: safeId } // Ensure id is part of original for later use
                };
            });

            fuzzysortCanonicalAndSynonymTerms = CANONICAL_CATEGORIES.map(cat => ({
                target: cat.toLowerCase(),
                original: cat 
            }));

            Object.entries(SYNONYM_MAP).forEach(([searchTerm, canonicalCategory]) => {
                if (!CANONICAL_CATEGORIES.includes(searchTerm) && !fuzzysortCanonicalAndSynonymTerms.some(item => item.target === searchTerm.toLowerCase())) {
                    fuzzysortCanonicalAndSynonymTerms.push({
                        target: searchTerm.toLowerCase(),
                        original: canonicalCategory 
                    });
                }
            });

            console.log("Products loaded and indexed for fuzzy search.");
        })
        .catch(err => {
            console.error("Failed to fetch products:", err);
            suggestionsBox.innerHTML = "<div class='p-2 text-red-500'>Failed to load products. Please try again later.</div>";
            suggestionsBox.classList.remove("hidden");
        });

    // --- UPDATED: getProductUrl to use product-default.html with ID ---
    const getProductUrl = (productId) => {
        if (productId && productId !== '') {
            return `${PRODUCT_DISPLAY_BASE_URL}?id=${encodeURIComponent(productId)}`; 
        }
        // Fallback: If no valid ID, redirect to a general shop page.
        console.warn("Attempted to get product URL for an item with no ID. Redirecting to shop page.");
        return SHOP_PAGE_BASE_URL; 
    };

    const showSuggestions = (query) => {
        const q = query.trim();
        if (!q) {
            suggestionsBox.classList.add("hidden");
            return;
        }

        const results = fuzzysort.go(q, fuzzysortSearchableItems, {
            key: 'target',
            limit: 5,
            threshold: -500 
        });

        if (results.length === 0) {
            suggestionsBox.classList.add("hidden");
            return;
        }

        const html = results.map(result => {
            const originalProduct = result.obj.original;
            // Now passing originalProduct.id to getProductUrl
            const productUrl = getProductUrl(originalProduct.id); 
            
            const displayValue = originalProduct.name;
            const highlightedDisplayValue = fuzzysort.highlight(fuzzysort.single(q, displayValue), 
                                                                 '<b class="text-blue-600">', '</b>') || displayValue;

            return `
                <div class="p-2 hover:bg-gray-100 cursor-pointer text-gray-800" data-url="${productUrl}">
                    ${highlightedDisplayValue}
                </div>
            `;
        }).join("");

        suggestionsBox.innerHTML = html;
        suggestionsBox.classList.remove("hidden");
    };

    searchInput.addEventListener("input", (e) => {
        showSuggestions(e.target.value);
    });

    document.addEventListener("click", (e) => {
        if (!suggestionsBox.contains(e.target) && e.target !== searchInput && e.target !== searchIcon) {
            suggestionsBox.classList.add("hidden");
        }
    });

    suggestionsBox.addEventListener("click", (e) => {
        const url = e.target.closest("[data-url]")?.dataset.url;
        if (url) {
            window.location.href = url;
        }
    });

    const performSearch = (query) => {
        const q = query.trim().toLowerCase();
        if (!q) {
            window.location.href = SHOP_PAGE_BASE_URL; 
            return;
        }

        // 1. Redirect to Canonical Categories (including synonyms)
        const categoryRedirectMatch = fuzzysort.go(q, fuzzysortCanonicalAndSynonymTerms, {
            key: 'target',
            limit: 1,
            threshold: -200 
        });

        if (categoryRedirectMatch.length > 0) {
            const finalCategoryForUrl = categoryRedirectMatch[0].obj.original; 
            window.location.href = `${SHOP_PAGE_BASE_URL}?cat=${encodeURIComponent(finalCategoryForUrl)}`;
            return; 
        }

        // 2. Redirect to Individual Product Pages using the new ID-based URL
        const productResults = fuzzysort.go(q, fuzzysortSearchableItems, {
            key: 'target',
            limit: 1,
            threshold: -300 
        });

        if (productResults.length > 0) {
            const bestMatchProduct = productResults[0].obj.original;
            // --- UPDATED: Passing bestMatchProduct.id to getProductUrl ---
            const productUrl = getProductUrl(bestMatchProduct.id); 
            window.location.href = productUrl;
            return; 
        }

        // 3. Fallback to general shop search if nothing else matches
        alert(`No close match found for "${query}". Redirecting to general shop page with search term.`);
        window.location.href = `${SHOP_PAGE_BASE_URL}?cat=${encodeURIComponent(query)}`;
    };

    searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            performSearch(searchInput.value);
        }
    });

    searchIcon.addEventListener("click", () => {
        performSearch(searchInput.value);
    });
});