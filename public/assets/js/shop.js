// Table of contents
/**** Sidebar ****/
/**** List product ****/
/**** Handle layout cols in list product ****/
/**** Filer product by type(in breadcrumb and sidebar) ****/
/**** Tow bar filter product by price ****/
/**** Function to fetch products from backend API ****/
/**** Function to transform backend product data to frontend format ****/
/*****----- handle event when user change filter -----************/
/*****----- Filter options -----************/
/*****----- filter product base on items filtered -----************/
/*****----- Handle sort product -----************/
/*****----- Rerender product base on items filtered -----************/
/*****----- filter product -----************/
/*****----- sort product -----************/
/*****----- handle events when user change filter -----************/
/**** Function to render products for a specific page ****/
/**** Function to render pagination buttons ****/
/**** Initial fetch of products ****/



// Sidebar
const filterSidebarBtn = document.querySelector('.filter-sidebar-btn')
const sidebar = document.querySelector('.sidebar')
const sidebarMain = document.querySelector('.sidebar .sidebar-main')
const closeSidebarBtn = document.querySelector('.sidebar .sidebar-main .close-sidebar-btn')

if (filterSidebarBtn && sidebar) {
    filterSidebarBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open')
    })

    if (sidebarMain) {
        sidebar.addEventListener('click', () => {
            sidebar.classList.remove('open')
        })

        sidebarMain.addEventListener('click', (e) => {
            e.stopPropagation()
        })

        closeSidebarBtn.addEventListener('click', () => {
            sidebar.classList.remove('open')
        })
    }
}


// List product
const productContainer = document.querySelector('.shop-product .list-product-block');
const productList = document.querySelector('.list-product-block .list-product');
const listPagination = document.querySelector('.list-pagination');

let currentPage = 1;
window.productsPerPage = productList ? Number(productList.getAttribute('data-item')) : 12;
window.productsData = []; // Expose productsData globally
let allFetchedProducts = []; // Store the initially fetched products

// Filer product by type(in breadcrumb and sidebar)
let selectedType = localStorage.getItem('selectedType');
localStorage.setItem('selectedType', '')


// Tow bar filter product by price
const rangeInput = document.querySelectorAll('.range-input input')
const progress = document.querySelector('.tow-bar-block .progress')
const minPrice = document.querySelector('.min-price')
const maxPrice = document.querySelector('.max-price')

let priceGap = 10

rangeInput.forEach(input => {
    input.addEventListener('input', e => {
        let minValue = parseInt(rangeInput[0].value)
        let maxValue = parseInt(rangeInput[1].value)

        if (maxValue - minValue < priceGap) {
            if (e.target.classList.contains('range-min')) { // Use classList.contains
                rangeInput[0].value = maxValue - priceGap
            } else {
                rangeInput[1].value = minValue + priceGap
            }
        } else {
            progress.style.left = (minValue / rangeInput[0].max) * 100 + "%";
            progress.style.right = 100 - (maxValue / rangeInput[1].max) * 100 + "%";
        }

        minPrice.innerHTML = '₹' + minValue
        maxPrice.innerHTML = '₹' + maxValue

        if (minValue >= 290) { // Assuming a max range of 300 for the UI initially
            minPrice.innerHTML = '₹' + 290
        }

        if (maxValue <= 10) { // Assuming a min range of 0 for the UI initially
            maxPrice.innerHTML = '₹' + 10
        }
    })
})

// Expose transformBackendProduct globally so shop.html can use it
window.transformBackendProduct = function transformBackendProduct(backendProduct) {
    // Attempt to parse gallery string into an array, default to empty array if parsing fails
    let galleryImages = [];
    try {
        galleryImages = JSON.parse(backendProduct.gallery);
    } catch (e) {
        console.warn("Could not parse gallery string for product:", backendProduct.id, e);
        galleryImages = [];
    }

    // Combine main_image and thumb_image into thumbImage array, ensuring no duplicates
    const thumbImages = [];
    if (backendProduct.thumb_image) {
        thumbImages.push(backendProduct.thumb_image);
    }
    if (backendProduct.main_image && !thumbImages.includes(backendProduct.main_image)) {
        thumbImages.push(backendProduct.main_image);
    }
    // If no specific thumb_image or main_image, use first from gallery if available
    if (thumbImages.length === 0 && galleryImages.length > 0) {
        thumbImages.push(galleryImages[0]);
    }
    // Ensure at least one image if possible, using a placeholder if absolutely nothing is found
    if (thumbImages.length === 0) {
        thumbImages.push('./assets/images/placeholder.png'); // Fallback placeholder
    }

    // Default values for sizes and variation, as they are not directly in the backend data
    // You might need to extend your backend API or add logic here to fetch/infer these
    const defaultSizes = ["S", "M", "L", "XL"];

    // --- START OF MODIFICATION FOR VARIATIONS (UPDATED FOR 'code' KEY) ---
    let variations = [];

    // Assuming backendProduct has an 'attributes' property which is an array
    // and one of its elements is a 'color' attribute with values and hex codes.
    if (backendProduct.attributes && Array.isArray(backendProduct.attributes)) {
        const colorAttribute = backendProduct.attributes.find(
            attr => attr.attribute_name && attr.attribute_name.toLowerCase() === 'color'
        );

        if (colorAttribute && colorAttribute.attribute_values) {
            try {
                const attributeValues = typeof colorAttribute.attribute_values === 'string'
                    ? JSON.parse(colorAttribute.attribute_values)
                    : attributeValues; // Fixed: Use `attributeValues` if already parsed.

                if (Array.isArray(attributeValues)) {
                    variations = attributeValues.map(valueObj => ({
                        color: valueObj.value,      // e.g., "Red"
                        colorCode: valueObj.code,   // <--- CHANGED FROM 'hex_code' TO 'code'
                        colorImage: "./assets/images/product/color/48x48.png", // This might still be a generic placeholder or dynamic based on color name
                        image: backendProduct.main_image || "./assets/images/product/bag-1.png" // Use main product image or default
                    }));
                }
            } catch (e) {
                console.warn("Could not parse color attribute_values for product:", backendProduct.id, e);
            }
        }
    }

    // Fallback to default variations if none are generated from backend attributes
    if (variations.length === 0) {
        variations = [
            { color: "red", colorCode: "#DB4444", colorImage: "./assets/images/product/color/48x48.png", image: backendProduct.main_image || "./assets/images/product/bag-1.png" },
            { color: "yellow", colorCode: "#ECB018", colorImage: "./assets/images/product/color/48x48.png", image: backendProduct.main_image || "./assets/images/product/bag-1.png" }
        ];
    }
    // --- END OF MODIFICATION FOR VARIATIONS (UPDATED FOR 'code' KEY) ---


    return {
        id: String(backendProduct.id), // Ensure ID is a string for consistency
        category: backendProduct.category,
        type: backendProduct.type,
        name: backendProduct.name,
        new: Boolean(backendProduct.is_new),
        sale: Boolean(backendProduct.on_sale),
        rate: parseFloat(backendProduct.rate),
        price: parseFloat(backendProduct.price),
        originPrice: parseFloat(backendProduct.origin_price),
        brand: backendProduct.brand,
        sold: backendProduct.sold,
        quantity: backendProduct.quantity,
        quantityPurchase: 1, // Default, not in backend data
        sizes: defaultSizes, // Default sizes, or fetch/infer from backend if available
        variation: variations, // Use the dynamically generated variations
        thumbImage: thumbImages, // Combined main and thumb image
        images: galleryImages.length > 0 ? galleryImages : thumbImages, // Use gallery if available, otherwise thumbImages
        description: backendProduct.description,
        action: backendProduct.action,
        slug: backendProduct.slug
    };
}

// Function to fetch products from backend API
async function fetchProductsFromBackend() {
    try {
        // Replace with your actual backend API endpoint
        const response = await fetch('api/admin/products');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        // Store all fetched products, for initial load and subsequent filtering
        allFetchedProducts = data.map(window.transformBackendProduct);
        window.productsData = [...allFetchedProducts]; // Make a copy available globally

        // NOTE: No rendering here. Initial rendering will be handled by shop.html's loadAndRenderWithCategory

        // Switch between grid <-> list layout - This should ideally be outside, or re-attached after render
        const layoutItems = productContainer.querySelectorAll('.choose-layout .item')

        layoutItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();

                if (item.classList.contains('style-grid')) {
                    productContainer.classList.remove('style-list');
                    productContainer.classList.add('style-grid');
                    const currentProductList = productContainer.querySelector('.list-product');
                    if (currentProductList) {
                        currentProductList.classList.remove('flex', 'flex-col');
                        currentProductList.classList.add('grid');

                        // Determine the correct productsPerPage for the grid layout
                        // Assuming 'five-col' is the class on the button you described
                        // and it's meant to show 6 products. Adjust to 9 if 3x3.
                        if (item.classList.contains('five-col')) { // Check for your specific 6-grid button class
                            window.productsPerPage = 6; // Set to 6 for a 2x3 grid, or 9 for a 3x3 grid
                            currentProductList.setAttribute('data-item', '6'); // Update data-item attribute
                        } else {
                            // Default grid, assuming 4x3 if you have other grid options
                            window.productsPerPage = 12; // Your default grid count
                            currentProductList.setAttribute('data-item', '12'); // Update data-item attribute
                        }
                    }
                } else if (item.classList.contains('style-list')) {
                    productContainer.classList.remove('style-grid');
                    productContainer.classList.add('style-list');
                    const currentProductList = productContainer.querySelector('.list-product');
                    if (currentProductList) {
                        currentProductList.classList.remove('grid');
                        currentProductList.classList.add('flex', 'flex-col');
                        window.productsPerPage = 4; // List view
                        currentProductList.setAttribute('data-item', '4'); // Update data-item attribute
                    }
                }

                // After updating window.productsPerPage, reset currentPage and re-render
                currentPage = 1; // Always reset to page 1 on layout change
                window.renderProducts(currentPage, window.productsData);
                window.renderPagination(window.productsData);
                window.addEventToProductItem(window.productsData);
            });
        });

        let selectedFilters = {};

        // handle event when user change filter
        window.handleFiltersChange = function handleFiltersChange() { // Expose globally
            selectedFilters = {
                type: document.querySelector('.filter-type .active')?.getAttribute('data-item'),
                size: Array.from(document.querySelectorAll('.filter-size .size-item.active')).map(item => item.getAttribute('data-item')),
                color: Array.from(document.querySelectorAll('.filter-color .color-item.active')).map(item => item.getAttribute('data-item')),
                brand: Array.from(document.querySelectorAll('.filter-brand .brand-item input[type="checkbox"]:checked')).map(item => item.getAttribute('name')),
                minPrice: 0, //default
                maxPrice: 300, //default (assuming a max price, adjust as needed based on your data)
                sale: document.querySelector('.check-sale input[type="checkbox"]:checked')
            };

            // Filter options for select elements
            if (document.querySelector('.filter-type select')) {
                const typeValue = document.querySelector('.filter-type select').value;
                selectedFilters.type = typeValue !== "null" && typeValue !== "" ? typeValue : null; // Use null for no selection
            }

            if (document.querySelector('.filter-size select')) {
                const sizeValue = document.querySelector('.filter-size select').value;
                selectedFilters.size = sizeValue !== "null" && sizeValue !== "" ? [sizeValue] : []; // Convert to array if selected
            }

            if (document.querySelector('.filter-color select')) {
                const colorValue = document.querySelector('.filter-color select').value;
                selectedFilters.color = colorValue !== "null" && colorValue !== "" ? [colorValue] : []; // Convert to array if selected
            }

            if (document.querySelector('.filter-brand select')) {
                const brandValue = document.querySelector('.filter-brand select').value;
                selectedFilters.brand = brandValue !== "null" && brandValue !== "" ? [brandValue] : []; // Convert to array if selected
            }

            // Price range filter
            if (rangeInput && rangeInput.length > 1) {
                selectedFilters.minPrice = parseInt(rangeInput[0].value);
                selectedFilters.maxPrice = parseInt(rangeInput[1].value);

                if (document.querySelector('.filter-price select')) {
                    const selectPrice = document.querySelector('.filter-price select').value;
                    if (selectPrice !== "null" && selectPrice !== "") {
                        const [min, max] = selectPrice.split('-').map(val => parseInt(val.replace('₹', '').trim()));
                        selectedFilters.minPrice = min;
                        selectedFilters.maxPrice = max;
                    } else {
                        // Reset to default range if 'null' is selected from dropdown
                        selectedFilters.minPrice = parseInt(rangeInput[0].min || 0);
                        selectedFilters.maxPrice = parseInt(rangeInput[1].max || 300); // Adjust default max as per your range input config
                    }
                }
            }

            // filter product base on items filtered
            // IMPORTANT: Filter from `allFetchedProducts` not `window.productsData` to always have the full dataset
            let filteredProducts = allFetchedProducts.filter(product => {
                if (selectedFilters.type && selectedFilters.type.length > 0 && product.type !== selectedFilters.type) return false;
                if (selectedFilters.size && selectedFilters.size.length > 0 && !product.sizes.some(size => selectedFilters.size.includes(size))) return false;
                // For color filter, we need to check if any variation's color matches
                if (selectedFilters.color && selectedFilters.color.length > 0 && !product.variation.some(variant => selectedFilters.color.includes(variant.color))) return false;
                if (selectedFilters.brand && selectedFilters.brand.length > 0 && !selectedFilters.brand.includes(product.brand)) return false;
                if (selectedFilters.minPrice !== null && product.price < selectedFilters.minPrice) return false;
                if (selectedFilters.maxPrice !== null && product.price > selectedFilters.maxPrice) return false;
                if (selectedFilters.sale && product.sale !== true) return false;
                return true;
            });

            // Set list filtered
            const listFiltered = document.querySelector('.list-filtered')

            let newHtmlListFiltered = `
                <div class="total-product">
                    ${filteredProducts?.length}
                    <span class='text-secondary pl-1'>Products Found</span>
                </div>
                <div class="list flex items-center gap-3">
                    <div class='w-px h-4 bg-line'></div>
                    ${selectedFilters.type ? ( // Check if type is selected
                    `
                            <div class="item flex items-center px-2 py-1 gap-1 bg-linear rounded-full capitalize" data-type="type">
                                <i class='ph ph-x cursor-pointer'></i>
                                <span>${selectedFilters.type}</span>
                            </div>
                        `
                ) : ''}
                    ${selectedFilters.size?.length ? (
                    `${selectedFilters.size.map(item => (
                        `<div class="item flex items-center px-2 py-1 gap-1 bg-linear rounded-full capitalize" data-type="size" data-item="${item}">
                                <i class='ph ph-x cursor-pointer'></i>
                                <span>${item}</span>
                            </div>`
                    )).join('')}`
                ) : ''}
                    ${selectedFilters.color?.length ? (
                    `${selectedFilters.color.map(item => (
                        `<div class="item flex items-center px-2 py-1 gap-1 bg-linear rounded-full capitalize" data-type="color" data-item="${item}">
                                <i class='ph ph-x cursor-pointer'></i>
                                <span>${item}</span>
                            </div>`
                    )).join('')}`
                ) : ''}
                    ${selectedFilters.brand?.length ? (
                    `${selectedFilters.brand.map(item => (
                        `
                                <div class="item flex items-center px-2 py-1 gap-1 bg-linear rounded-full capitalize" data-type="brand" data-item=${item}>
                                    <i class='ph ph-x cursor-pointer'></i>
                                    <span>${item}</span>
                                </div>
                            `
                    )).join('')}
                    `
                ) : ''}
                </div>
                <div
                    class="clear-btn flex items-center px-2 py-1 gap-1 rounded-full w-fit border border-red cursor-pointer">
                    <i class='ph ph-x cursor-pointer text-red'></i>
                    <span class='text-button-uppercase text-red'>Clear All</span>
                </div>
            `

            // remove content in listFiltered
            if (listFiltered) {
                listFiltered.innerHTML = '';
            }


            // Only add newHtmlListFiltered if there are active filters
            const hasActiveFilters = selectedFilters.type || selectedFilters.size?.length > 0 || selectedFilters.color?.length > 0 || selectedFilters.brand?.length > 0 || selectedFilters.sale;
            if (listFiltered && hasActiveFilters) {
                listFiltered.insertAdjacentHTML('beforeend', newHtmlListFiltered);

                // Remove filtered
                // Remove item from list filtered
                const clearBtnItem = document.querySelectorAll('.list-filtered .list .item')

                clearBtnItem.forEach(btn => {
                    btn.addEventListener('click', () => {
                        let dataType = btn.getAttribute('data-type')
                        let dataItem = btn.getAttribute('data-item') // Get data-item for specific removal

                        document.querySelectorAll(`.filter-${dataType} .active`)?.forEach(item => {
                            if (!dataItem || item.getAttribute('data-item') === dataItem) {
                                item.classList.remove('active');
                            }
                        })

                        if (document.querySelector(`.filter-${dataType} select`)) {
                            // If it's a select dropdown, set its value to "null" or an empty string
                            document.querySelector(`.filter-${dataType} select`).value = "null"; // or ""
                        }

                        if (dataType === 'brand') {
                            document.querySelectorAll('.filter-brand .brand-item input[type="checkbox"]:checked').forEach(item => {
                                if (item.name === dataItem) { // Use item.name for checkbox
                                    item.checked = false
                                }
                            })
                        }
                        if (dataType === 'size' || dataType === 'color') {
                            // For size and color, if multiple are active and dataItem exists, remove only that one
                            if (dataItem) {
                                const currentActive = selectedFilters[dataType];
                                selectedFilters[dataType] = currentActive.filter(item => item !== dataItem);
                            }
                        }

                        handleFiltersChange() // Recalculate filters
                    })
                })

                // Remove all
                const clearBtn = document.querySelector('.list-filtered .clear-btn')

                clearBtn?.addEventListener('click', () => {
                    document.querySelectorAll('.filter-type .active')?.forEach(item => item.classList.remove('active'))
                    document.querySelectorAll('.filter-size .active')?.forEach(item => item.classList.remove('active'))
                    document.querySelectorAll('.filter-color .active')?.forEach(item => item.classList.remove('active'))
                    document.querySelectorAll('.filter-brand .brand-item input[type="checkbox"]:checked').forEach(item => item.checked = false)
                    if (document.querySelector('.check-sale input[type="checkbox"]:checked')) {
                        document.querySelector('.check-sale input[type="checkbox"]:checked').checked = false
                    }

                    // Reset select dropdowns as well
                    if (document.querySelector('.filter-type select')) document.querySelector('.filter-type select').value = "null";
                    if (document.querySelector('.filter-size select')) document.querySelector('.filter-size select').value = "null";
                    if (document.querySelector('.filter-color select')) document.querySelector('.filter-color select').value = "null";
                    if (document.querySelector('.filter-brand select')) document.querySelector('.filter-brand select').value = "null";
                    if (document.querySelector('.filter-price select')) document.querySelector('.filter-price select').value = "null";


                    handleFiltersChange()
                    listFiltered.innerHTML = '' // Clear the filtered list UI
                })
            } else if (listFiltered) {
                listFiltered.innerHTML = ''; // Ensure it's cleared if no filters
            }


            // Handle sort product
            if (window.sortOption === 'soldQuantityHighToLow') { // Use global sortOption
                filteredProducts = filteredProducts.sort((a, b) => b.sold - a.sold)
            }

            if (window.sortOption === 'discountHighToLow') { // Use global sortOption
                filteredProducts = filteredProducts
                    .sort((a, b) => (
                        (Math.floor(100 - ((b.price / b.originPrice) * 100))) - (Math.floor(100 - ((a.price / a.originPrice) * 100)))
                    ))
            }

            if (window.sortOption === 'priceHighToLow') { // Use global sortOption
                filteredProducts = filteredProducts.sort((a, b) => b.price - a.price)
            }

            if (window.sortOption === 'priceLowToHigh') { // Use global sortOption
                filteredProducts = filteredProducts.sort((a, b) => a.price - b.price)
            }

            // Update the globally available productsData with the filtered/sorted result
            window.productsData = filteredProducts;

            // Rerender product base on items filtered
            window.renderProducts(1, filteredProducts);
            currentPage = 1;
            window.renderPagination(filteredProducts)
            window.addEventToProductItem(filteredProducts) // Add event listeners to newly rendered items
        }

        // filter product
        const typeItems = document.querySelectorAll('.filter-type .item')
        const sizeItems = document.querySelectorAll('.filter-size .size-item')
        const colorItems = document.querySelectorAll('.filter-color .color-item')
        const brandItems = document.querySelectorAll('.filter-brand .brand-item')
        const checkboxBrandItems = document.querySelectorAll('.filter-brand .brand-item input[type="checkbox"]')
        const checkSale = document.querySelector('.check-sale input')

        // sort product
        const sortSelect = document.querySelector('.sort-product select')
        window.sortOption = sortSelect ? sortSelect.value : 'default'; // Expose globally

        // Get filter type from url
        const pathname = new URL(window.location.href)
        const typeUrl = pathname.searchParams.get('type') === null ? '' : pathname.searchParams.get('type')

        if (typeUrl !== '') {
            localStorage.setItem('selectedType', typeUrl)
            typeItems.forEach(item => {
                if (item.getAttribute('data-item') === localStorage.getItem('selectedType')) {
                    item.classList.add('active')
                } else {
                    item.classList.remove('active')
                }
            });
            // Don't call handleFiltersChange here, it will be called by loadAndRenderWithCategory in shop.html
        }


        // handle events when user change filter
        typeItems.forEach(item => {
            item.addEventListener('click', () => {
                localStorage.setItem('selectedType', item.getAttribute('data-item'))

                typeItems.forEach(typeItem => {
                    if (typeItem.getAttribute('data-item') === localStorage.getItem('selectedType')) {
                        typeItem.classList.add('active')
                    } else {
                        typeItem.classList.remove('active')
                    }
                })
                window.handleFiltersChange();
            });

            if (item.querySelector('.number')) {
                item.querySelector('.number').innerHTML = allFetchedProducts.filter(product => product.type === item.getAttribute('data-item')).length
            }
        });

        // shop-filter-options.html - for select elements
        if (document.querySelector('.filter-type select')) {
            document.querySelector('.filter-type select').addEventListener('change', window.handleFiltersChange)
        }

        sizeItems.forEach(item => {
            item.addEventListener('click', () => {
                let parent = item.parentElement;
                if (!parent.querySelector(".active")) {
                    item.classList.add("active");
                } else {
                    parent.querySelector(".active").classList.remove("active");
                    item.classList.add("active");
                }
                window.handleFiltersChange()
            });
        });

        // shop-filter-options.html - for select elements
        if (document.querySelector('.filter-size select')) {
            document.querySelector('.filter-size select').addEventListener('change', window.handleFiltersChange)
        }

        colorItems.forEach(item => {
            item.addEventListener('click', () => {
                let parent = item.parentElement;
                if (!parent.querySelector(".active")) {
                    item.classList.add("active");
                } else {
                    parent.querySelector(".active").classList.remove("active");
                    item.classList.add("active");
                }
                window.handleFiltersChange()
            });
        });

        // shop-filter-options.html - for select elements
        if (document.querySelector('.filter-color select')) {
            document.querySelector('.filter-color select').addEventListener('change', window.handleFiltersChange)
        }

        brandItems.forEach(item => {
            if (item.querySelector('.number')) {
                item.querySelector('.number').innerHTML = allFetchedProducts.filter(product => product.brand === item.getAttribute('data-item')).length
            }
        })

        checkboxBrandItems.forEach(item => {
            item.addEventListener('change', window.handleFiltersChange);
        })

        // shop-filter-options.html - for select elements
        if (document.querySelector('.filter-brand select')) {
            document.querySelector('.filter-brand select').addEventListener('change', window.handleFiltersChange)
        }

        rangeInput.forEach(input => {
            input.addEventListener('input', window.handleFiltersChange)
        })

        // shop-filter-options.html - for select elements
        if (document.querySelector('.filter-price select')) {
            document.querySelector('.filter-price select').addEventListener('change', window.handleFiltersChange)
        }

        if (checkSale) {
            checkSale.addEventListener('change', window.handleFiltersChange)
        }

        if (sortSelect) {
            sortSelect.addEventListener('change', () => {
                window.sortOption = sortSelect.value
                window.handleFiltersChange();
            })
        }
        return window.productsData; // Return the fetched products for use by shop.html
    } catch (error) {
        console.error('Error fetching products from backend:', error);
        // Optionally, render an error message to the user
        if (productList) {
            productList.innerHTML = `<div class="list-empty"><p class="text-red-500 text-base">Failed to load products. Please try again later.</p></div>`;
        }
        throw error; // Re-throw to propagate the error
    }
}
window.fetchProductsFromBackend = fetchProductsFromBackend; // Expose globally


// Function to render products for a specific page
window.renderProducts = function renderProducts(page, products = []) { // Expose globally
    if (!productList) return; // Ensure productList exists

    productList.innerHTML = '';
    const productsToDisplay = products;

    const startIndex = (page - 1) * window.productsPerPage;
    const endIndex = startIndex + window.productsPerPage;
    const displayedProducts = productsToDisplay.slice(startIndex, endIndex);

    if (displayedProducts.length === 0) {
        productList.innerHTML = `
            <div class="list-empty text-center py-10">
                <p class="text-gray-500 text-lg">No product found matching your criteria.</p>
            </div>
        `;
        return;
    }

    displayedProducts.forEach(product => {
        const productItem = document.createElement('div');
        productItem.setAttribute('data-item', product.id)

        let productTags = '';
        if (product.new) {
            productTags += `<div class="product-tag text-button-uppercase bg-green px-3 py-0.5 inline-block rounded-full absolute top-3 left-3 z-[1]">New</div>`;
        }
        // If both new and sale, only show sale or handle placement. Current JSON has sale true/false, not mutually exclusive.
        // If you want to prioritize "Sale" over "New", add a condition `!product.sale` to the "New" tag.
        if (product.sale) {
            productTags += `<div class="product-tag text-button-uppercase text-white bg-red px-3 py-0.5 inline-block rounded-full absolute top-3 left-3 z-[1]">Sale</div>`;
        }
        // If `product.new` is meant to be displayed *only if not on sale*, change the first `if` to `if (product.new && !product.sale)`


        let productImages = '';
        // Ensure product.thumbImage is an array and has items
        if (product.thumbImage && Array.isArray(product.thumbImage) && product.thumbImage.length > 0) {
            product.thumbImage.forEach((img, index) => {
                productImages += `<img key="${index}" class="w-full h-full object-cover duration-700" src="${img}" alt="product image">`;
            });
        } else if (product.images && Array.isArray(product.images) && product.images.length > 0) {
            // Fallback to general images if thumbImage is not set
            product.images.forEach((img, index) => {
                productImages += `<img key="${index}" class="w-full h-full object-cover duration-700" src="${img}" alt="product image">`;
            });
        } else {
            // Default placeholder if no images are found
            productImages += `<img class="w-full h-full object-cover duration-700" src="./assets/images/placeholder.png" alt="placeholder image">`;
        }


        if (productContainer && productContainer.classList.contains('style-grid')) {
            productItem.classList.add('product-item', 'grid-type');
            productItem.innerHTML = `
                    <div class="product-main cursor-pointer block" data-item="${product.id}">
                        <div class="product-thumb bg-white relative overflow-hidden rounded-2xl">
                            ${productTags}
                            <div class="list-action-right absolute top-3 right-3 max-lg:hidden">
                                <div
                                    class="add-wishlist-btn w-[32px] h-[32px] flex items-center justify-center rounded-full bg-white duration-300 relative">
                                    <div class="tag-action bg-black text-white caption2 px-1.5 py-0.5 rounded-sm">
                                        Add To Wishlist</div>
                                    <i class="ph ph-heart text-lg"></i>
                                </div>
                                <div
                                    class="compare-btn w-[32px] h-[32px] flex items-center justify-center rounded-full bg-white duration-300 relative mt-2">
                                    <div class="tag-action bg-black text-white caption2 px-1.5 py-0.5 rounded-sm">
                                        Compare Product</div>
                                    <i class="ph ph-arrow-counter-clockwise text-lg compare-icon"></i>
                                    <i class="ph ph-check-circle text-lg checked-icon"></i>
                                </div>
                            </div>
                            <div class="product-img w-full h-full aspect-[3/4]">
                                ${productImages}
                            </div>
                            <div class="list-action grid grid-cols-2 gap-3 px-5 absolute w-full bottom-5 max-lg:hidden">
                                <div
                                    class="quick-view-btn w-full text-button-uppercase py-2 text-center rounded-full duration-300 bg-white hover:bg-black hover:text-white text-secondary">
                                    <span class="max-lg:hidden">Quick View</span>
                                    <i class="ph ph-eye lg:hidden text-xl"></i>
                                </div>
                                    ${product.action === 'add to cart' ? (
                    `
                                        <div
                                            class="add-cart-btn w-full text-button-uppercase py-2 text-center rounded-full duration-300 bg-white hover:bg-black hover:text-white text-secondary"
                                            >
                                            <span class="max-lg:hidden">Add To Cart</span>
                                            <i class="ph ph-shopping-bag-open lg:hidden text-xl"></i>
                                        </div>
                                    `
                ) : (
                    `
                                        <div
                                            class="quick-shop-btn text-button-uppercase py-2 text-center rounded-full duration-500 bg-white hover:bg-black hover:text-white max-lg:hidden text-secondary">
                                            Quick Shop</div>
                                        <div
                                            class="add-cart-btn w-full text-button-uppercase py-2 text-center rounded-full duration-300 bg-white hover:bg-black hover:text-white text-secondary lg:hidden"
                                            >
                                            <span class="max-lg:hidden">Add To Cart</span>
                                            <i class="ph ph-shopping-bag-open lg:hidden text-xl"></i>
                                        </div>
                                        <div class="quick-shop-block absolute left-5 right-5 bg-white p-5 rounded-[20px]">
                                            <div class="list-size flex items-center justify-center flex-wrap gap-2">
                                                ${product.sizes && product.sizes.map((size, index) => (
                        `<div key="${index}" class="size-item w-10 h-10 rounded-full flex items-center justify-center text-button bg-white border border-line">${size.trim()}</div>`
                    )).join('')}
                                            </div >
                                            <div class="add-cart-btn button-main w-full text-center rounded-full py-3 mt-4">Add
                                                To cart</div>
                                        </div >
                        `
                )}
                                    </div>
                                </div>
                                <div class="product-infor mt-4 lg:mb-7">
                                    <div class="product-sold sm:pb-4 pb-2">
                                        <div class="progress bg-line h-1.5 w-full rounded-full overflow-hidden relative">
                                            <div class='progress-sold bg-red absolute left-0 top-0 h-full' style="width: ${Math.floor((product.sold / product.quantity) * 100)}%">
                                            </div>
                                        </div>
                                        <div class="flex items-center justify-between gap-3 gap-y-1 flex-wrap mt-2">
                                            <div class="text-button-uppercase">
                                                <span class='text-secondary2 max-sm:text-xs'>Sold:
                                                </span>
                                                <span class='max-sm:text-xs'>${product.sold}</span>
                                            </div>
                               <div class="text-button-uppercase">
    <span class='text-secondary2 max-sm:text-xs'>Available:
    </span>
    <span class='max-sm:text-xs'>${product.quantity - product.sold}</span>
</div>
</div>
</div>
<div class="product-name text-title duration-300">${product.name}</div>
${product.variation.length > 0 && product.action === 'add to cart' ? (
                    `
        <div class="list-color py-2 max-md:hidden flex items-center gap-3 flex-wrap duration-500">
            ${product.variation.map((item, index) => (
                        `<div
                    key="${index}"
                    class="color-item w-8 h-8 rounded-full duration-300 relative"
                    style="background-color:${item.colorCode};"
                >
                    <div class="tag-action bg-black text-white caption2 capitalize px-1.5 py-0.5 rounded-sm">${item.color}</div>
                </div>
                `
                    )).join('')}
        </div>`
                ) : (
                    `
        <div class="list-color list-color-image max-md:hidden flex items-center gap-3 flex-wrap duration-500">
            ${product.variation.map((item, index) => (
                        `
                <div
                    class="color-item w-12 h-12 rounded-xl duration-300 relative"
                    key="${index}"
                >
                    <img
                        src="${item.colorImage}"
                        alt='color'
                        class='rounded-xl w-full h-full object-cover'
                    />
                    <div class="tag-action bg-black text-white caption2 capitalize px-1.5 py-0.5 rounded-sm">${item.color}</div>
                </div>
            `
                    )).join('')}
        </div>
    `
                )}
<div
    class="product-price-block flex items-center gap-2 flex-wrap mt-1 duration-300 relative z-[1]">
    <div class="product-price text-title">₹${product.price}.00</div>
    ${Math.floor(100 - ((product.price / product.originPrice) * 100)) > 0 ? (
                    `
            <div class="product-origin-price caption1 text-secondary2">
                <del>₹${product.originPrice}.00</del>
            </div>
            <div
                class="product-sale caption1 font-medium bg-green px-3 py-0.5 inline-block rounded-full">
                -${Math.floor(100 - ((product.price / product.originPrice) * 100))}%
            </div>
    `
                ) : ('')}
</div>
</div>
</div>
</div>
`
            productList.appendChild(productItem);
        }
        if (productContainer && productContainer.classList.contains('style-list')) {
            productItem.classList.add('product-item', 'list-type');
            productItem.innerHTML = `
                    <div class="product-main cursor-pointer flex lg:items-center sm:justify-between gap-7 max-lg:gap-5">
                        <div class="product-thumb bg-white relative overflow-hidden rounded-2xl block max-sm:w-1/2">
                            ${productTags}
                            <div class="product-img w-full aspect-[3/4] rounded-2xl overflow-hidden">
                                ${productImages}
                            </div>
                            <div class="list-action px-5 absolute w-full bottom-5 max-lg:hidden">
                                <div class="quick-shop-block absolute left-5 right-5 bg-white p-5 rounded-[20px]">
                                        <div class="list-size flex items-center justify-center flex-wrap gap-2">
                                            ${product.sizes && product.sizes.map((size, index) => (
                `
                                                ${size.toLowerCase() === 'freesize' ? ( // Check for lowercase 'freesize'
                    `
                                                    <div key="${index}" class="size-item px-3 py-1.5 rounded-full text-button bg-white border border-line">${size.trim()}</div>
                                                    `
                ) : (
                    `<div key="${index}" class="size-item w-10 h-10 rounded-full flex items-center justify-center text-button bg-white border border-line">${size.trim()}</div>`
                )}
                `
            )).join('')}
                                        </div>
                                        <div class="add-cart-btn button-main w-full text-center rounded-full py-3 mt-4">Add To cart</div>
                                </div>
                            </div>
                        </div>
                        <div class='flex sm:items-center gap-7 max-lg:gap-4 max-lg:flex-wrap lg:w-2/3 lg:flex-shrink-0 max-lg:w-full max-sm:flex-col max-sm:w-1/2'>
                                <div class="product-infor max-sm:w-full">
                                    <div class="product-name heading6 inline-block duration-300">${product.name}</div>
                                    <div class="product-price-block flex items-center gap-2 flex-wrap mt-2 duration-300 relative z-[1]">
                                        <div class="product-price text-title">₹${product.price}.00</div>
                                        ${Math.floor(100 - ((product.price / product.originPrice) * 100)) > 0 ? (
                    `
                                                <div class="product-origin-price caption1 text-secondary2">
                                                    <del>₹${product.originPrice}.00</del>
                                                </div>
                                                <div
                                                    class="product-sale caption1 font-medium bg-green px-3 py-0.5 inline-block rounded-full">
                                                    -${Math.floor(100 - ((product.price / product.originPrice) * 100))}%
                                                </div>
                                        `
                ) : ('')}
                                    </div>
                                    <div class='text-secondary desc mt-5 max-sm:hidden'>${product.description}</div>
                                </div>
                                <div class="action w-fit flex flex-col items-center justify-center">
                                    <div class="quick-shop-btn button-main whitespace-nowrap py-2 px-9 max-lg:px-5 rounded-full bg-white text-black border border-black hover:bg-black hover:text-white">
                                        Quick Shop
                                    </div>
                                    <div class="list-action-right flex items-center justify-center gap-3 mt-4">
                                        <div
                                            class="add-wishlist-btn w-[32px] h-[32px] flex items-center justify-center rounded-full bg-white duration-300 relative">
                                            <div class="tag-action bg-black text-white caption2 px-1.5 py-0.5 rounded-sm">
                                                Add To Wishlist</div>
                                                <i class="ph ph-heart text-lg"></i>
                                            </div>
                                        <div
                                            class="compare-btn w-[32px] h-[32px] flex items-center justify-center rounded-full bg-white duration-300 relative">
                                            <div class="tag-action bg-black text-white caption2 px-1.5 py-0.5 rounded-sm">
                                                Compare Product</div>
                                            <i class="ph ph-arrow-counter-clockwise text-lg compare-icon"></i>
                                            <i class="ph ph-check-circle text-lg checked-icon"></i>
                                        </div>
                                        <div
                                            class="quick-view-btn quick-view-btn-list w-[32px] h-[32px] flex items-center justify-center rounded-full bg-white duration-300 relative">
                                            <div class="tag-action bg-black text-white caption2 px-1.5 py-0.5 rounded-sm">
                                                Quick View</div>
                                            <i class="ph ph-eye text-lg"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `
            productList.appendChild(productItem);
        }
    });

    // Call addEventToProductItem after products are rendered
    window.addEventToProductItem(products); // Pass products to ensure all items are covered
}

// Function to render pagination buttons
window.renderPagination = function renderPagination(products = []) { // Expose globally
    if (!listPagination) return; // Ensure listPagination exists

    listPagination.innerHTML = '';
    const productsToDisplay = products.length ? products : window.productsData; // Use window.productsData if no specific list is passed

    let totalPages = Math.ceil(productsToDisplay.length / window.productsPerPage);
    const maxVisiblePages = 3; // Keep maximum of 3 page buttons visible

    if (productsToDisplay.length <= productsPerPage) {
        // If all products fit on one page, or there are no products, hide pagination
        listPagination.style.display = 'none';
        return;
    } else {
        listPagination.style.display = 'flex'; // Ensure it's visible if needed
    }

    let startPage = 1;
    let endPage = totalPages;

    // Adjust start and end pages for pagination display
    if (totalPages > maxVisiblePages) {
        if (currentPage <= Math.ceil(maxVisiblePages / 2)) {
            startPage = 1;
            endPage = maxVisiblePages;
        } else if (currentPage + Math.floor(maxVisiblePages / 2) >= totalPages) {
            startPage = totalPages - maxVisiblePages + 1;
            endPage = totalPages;
        } else {
            startPage = currentPage - Math.floor(maxVisiblePages / 2);
            endPage = currentPage + Math.floor(maxVisiblePages / 2);
        }
    }


    // "<<" (First page) button
    if (currentPage > 1) {
        const startButton = document.createElement('button');
        startButton.textContent = '<<';
        startButton.classList.add('pagination-button', 'page-first');
        startButton.addEventListener('click', () => {
            currentPage = 1;
            window.renderProducts(currentPage, products);
            window.renderPagination(products);
        });
        listPagination.appendChild(startButton);
    }

    // "<" (Previous page) button
    if (currentPage > 1) {
        const prevButton = document.createElement('button');
        prevButton.textContent = '<';
        prevButton.classList.add('pagination-button', 'page-prev');
        prevButton.addEventListener('click', () => {
            currentPage--;
            window.renderProducts(currentPage, products);
            window.renderPagination(products);
        });
        listPagination.appendChild(prevButton);
    }

    // Page number buttons
    for (let i = startPage; i <= endPage; i++) {
        const button = document.createElement('button');
        button.textContent = i;
        button.classList.add('pagination-button');

        if (i === currentPage) {
            button.classList.add('active');
        }

        button.addEventListener('click', () => {
            currentPage = i;
            window.renderProducts(currentPage, products);
            window.renderPagination(products);
        });
        listPagination.appendChild(button);
    }

    // ">" (Next page) button
    if (currentPage < totalPages) {
        const nextButton = document.createElement('button');
        nextButton.textContent = '>';
        nextButton.classList.add('pagination-button', 'page-next');
        nextButton.addEventListener('click', () => {
            currentPage++;
            window.renderProducts(currentPage, products);
            window.renderPagination(products);
        });
        listPagination.appendChild(nextButton);
    }

    // ">>" (Last page) button
    if (currentPage < totalPages) {
        const endButton = document.createElement('button');
        endButton.textContent = '>>';
        endButton.classList.add('pagination-button', 'page-last');
        endButton.addEventListener('click', () => {
            currentPage = totalPages;
            window.renderProducts(currentPage, products);
            window.renderPagination(products);
        });
        listPagination.appendChild(endButton);
    }
}

// Dummy function for product item events.
// This function needs to be properly implemented based on what 'addEventToProductItem' is supposed to do.
// For example, it might open quick view modals, add to cart, etc.
// For now, it's a placeholder to prevent errors.
window.addEventToProductItem = function addEventToProductItem(products) { // Expose globally
    // Example: Attach event listeners for quick view buttons
    document.querySelectorAll('.quick-view-btn').forEach(button => {
        button.onclick = (e) => {
            e.preventDefault();
            const productElement = e.target.closest('.product-item');
            const productId = productElement ? productElement.getAttribute('data-item') : null;
            if (productId) {
                const product = products.find(p => p.id === productId);
                if (product) {
                    console.log('Quick View clicked for product:', product.name);
                    // Implement your quick view modal logic here
                    alert(`Quick View for: ${product.name}`);
                }
            }
        };
    });

    document.querySelectorAll('.add-cart-btn').forEach(button => {
        button.onclick = (e) => {
            e.preventDefault();
            const productElement = e.target.closest('.product-item');
            const productId = productElement ? productElement.getAttribute('data-item') : null;
            if (productId) {
                const product = products.find(p => p.id === productId);
                if (product) {
                    console.log('Add to Cart clicked for product:', product.name);
                    // Implement your add to cart logic here
                    alert(`Added to cart: ${product.name}`);
                }
            }
        };
    });

    document.querySelectorAll('.quick-shop-btn').forEach(button => {
        button.onclick = (e) => {
            e.preventDefault();
            const productElement = e.target.closest('.product-item');
            const productId = productElement ? productElement.getAttribute('data-item') : null;
            if (productId) {
                const product = products.find(p => p.id === productId);
                if (product) {
                    console.log('Quick Shop clicked for product:', product.name);
                    // Implement your quick shop modal/inline display logic here
                    // This might involve showing the .quick-shop-block
                    const quickShopBlock = productElement.querySelector('.quick-shop-block');
                    if (quickShopBlock) {
                        quickShopBlock.classList.toggle('active'); // Toggle visibility
                    }
                }
            }
        };
    });

    // Hide quick shop block when clicking outside (or handle its visibility in other ways)
    document.addEventListener('click', (e) => {
        document.querySelectorAll('.quick-shop-block.active').forEach(block => {
            if (!block.contains(e.target) && !e.target.closest('.quick-shop-btn')) {
                block.classList.remove('active');
            }
        });
    });

    // Handle size selection within quick shop block
    document.querySelectorAll('.quick-shop-block .size-item').forEach(sizeItem => {
        sizeItem.onclick = (e) => {
            e.preventDefault();
            sizeItem.parentElement.querySelectorAll('.size-item').forEach(item => item.classList.remove('active'));
            sizeItem.classList.add('active');
            console.log('Selected size:', sizeItem.textContent.trim());
            // You might want to update a hidden input or a product object property here
        };
    });

    // Add wishlist button functionality
    document.querySelectorAll('.add-wishlist-btn').forEach(button => {
        button.onclick = (e) => {
            e.preventDefault();
            const productElement = e.target.closest('.product-item');
            const productId = productElement ? productElement.getAttribute('data-item') : null;
            if (productId) {
                console.log('Added to wishlist:', productId);
                // Toggle active class or change icon to indicate it's in wishlist
                button.classList.toggle('active');
                button.querySelector('.ph-heart').classList.toggle('ph-heart-fill'); // Assuming you have a filled heart icon
                alert(`Product ${productId} added to wishlist!`);
            }
        };
    });

    // Add compare button functionality
    document.querySelectorAll('.compare-btn').forEach(button => {
        button.onclick = (e) => {
            e.preventDefault();
            const productElement = e.target.closest('.product-item');
            const productId = productElement ? productElement.getAttribute('data-item') : null;
            if (productId) {
                console.log('Added to compare:', productId);
                // Toggle active class or change icon to indicate it's in compare list
                button.classList.toggle('active');
                // You might want to switch between compare-icon and checked-icon
                const compareIcon = button.querySelector('.compare-icon');
                const checkedIcon = button.querySelector('.checked-icon');
                if (compareIcon && checkedIcon) {
                    compareIcon.classList.toggle('hidden');
                    checkedIcon.classList.toggle('hidden');
                }
                alert(`Product ${productId} added to compare!`);
            }
        };
    });
}


// Initial fetch of products - BUT DO NOT RENDER YET
// This will just populate allFetchedProducts and window.productsData
if (productList) {
    // Call fetchProductsFromBackend, but don't perform initial rendering
    // The shop.html script will trigger rendering after category filtering.
    window.fetchProductsFromBackend().catch(err => {
        console.error("Initial product fetch failed in shop.js", err);
    });
}