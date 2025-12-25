// add-product.html script update

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("addProductForm");

    // --- Sizes ---
    const sizesSelect = document.getElementById("sizesSelect");
    const selectedSizesDiv = document.getElementById("selectedSizes");
    const sizesHidden = document.getElementById("sizesHidden");
    let selectedSizes = [];

    sizesSelect.addEventListener("change", e => {
        const value = e.target.value;
        if (value && !selectedSizes.includes(value)) {
            selectedSizes.push(value);
            renderSizes();
        }
        sizesSelect.value = ""; // Reset select after choosing
    });

    function renderSizes() {
        selectedSizesDiv.innerHTML = "";
        selectedSizesDiv.classList.toggle("mt-10", selectedSizes.length > 0);
        selectedSizes.forEach(size => {
            const div = document.createElement("div");
            div.className = "box-value-item";
            div.innerHTML = `${size} <span onclick="removeSize('${size}')">✕</span>`;
            selectedSizesDiv.appendChild(div);
        });
        sizesHidden.value = JSON.stringify(selectedSizes);
    }

    window.removeSize = function (size) {
        selectedSizes = selectedSizes.filter(s => s !== size);
        renderSizes();
    }

    // --- Variations (Attributes) ---
    const variationsHidden = document.getElementById("variationsHidden");
    const variantsContainer = document.getElementById("variantsContainer");
    let attributeOptions = {}; // Stores all possible attribute values for rendering checkboxes
    let selectedAttributeVariants = {}; // Stores selected attribute values (e.g., {color: ['Red', 'Blue']})
    let attributes = []; // Raw attributes from the backend

    function renderVariations() {
        variantsContainer.innerHTML = "";

        // Display selected attributes as checkboxes
        Object.keys(attributeOptions).forEach(attrName => {
            const wrapperDiv = document.createElement("div");
            wrapperDiv.className = "attribute-group mb-10";
            wrapperDiv.innerHTML = `<strong>${attrName}:</strong>`;

            attributeOptions[attrName].forEach(value => {
                const id = `attr-${attrName}-${value.replace(/\s+/g, '-')}`; // Unique ID for checkbox
                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.id = id;
                checkbox.value = value;
                checkbox.dataset.attributeName = attrName;
                checkbox.className = "variant-checkbox mr-5";

                // Set initial checked state
                if (selectedAttributeVariants[attrName] && selectedAttributeVariants[attrName].includes(value)) {
                    checkbox.checked = true;
                }

                checkbox.addEventListener('change', (e) => {
                    const name = e.target.dataset.attributeName;
                    const val = e.target.value;
                    if (e.target.checked) {
                        if (!selectedAttributeVariants[name]) {
                            selectedAttributeVariants[name] = [];
                        }
                        selectedAttributeVariants[name].push(val);
                    } else {
                        selectedAttributeVariants[name] = selectedAttributeVariants[name].filter(v => v !== val);
                        if (selectedAttributeVariants[name].length === 0) {
                            delete selectedAttributeVariants[name]; // Remove empty attribute arrays
                        }
                    }
                    variationsHidden.value = JSON.stringify(selectedAttributeVariants);
                });

                const label = document.createElement("label");
                label.htmlFor = id;
                label.textContent = value;
                label.style.marginRight = "15px";

                wrapperDiv.appendChild(checkbox);
                wrapperDiv.appendChild(label);
            });
            variantsContainer.appendChild(wrapperDiv);
        });

        variationsHidden.value = JSON.stringify(selectedAttributeVariants);
    }

    // --- Load Attributes ---
    const attributeSelect = document.getElementById("attributeSelect");
    async function loadAttributes() {
        try {
            const res = await fetch("/api/admin/attributes");
            attributes = await res.json(); // Store all attributes

            const uniqueNames = [...new Set(attributes.map(a => a.attribute_name))];
            attributeSelect.innerHTML = `<option value="">-- Choose Attribute --</option>`;
            uniqueNames.forEach(name => {
                const option = document.createElement("option");
                option.value = name;
                option.textContent = name;
                attributeSelect.appendChild(option);
            });

            attributeSelect.addEventListener("change", () => {
                const attrName = attributeSelect.value;
                if (attrName && !attributeOptions[attrName]) {
                    const attrObj = attributes.find(a => a.attribute_name === attrName);
                    if (attrObj && attrObj.attribute_value) {
                        const values = attrObj.attribute_value.split(",").map(v => v.trim());
                        attributeOptions[attrName] = values; // Add to options for rendering
                        renderVariations();
                    }
                }
                attributeSelect.value = ""; // Reset select after adding
            });
        } catch (err) {
            console.error("Failed to load attributes:", err);
            alert("Failed to load attributes. Check console for details.");
        }
    }

    // --- Load Categories ---
    async function loadCategories() {
        try {
            const res = await fetch("/api/admin/categories/public");
            const categories = await res.json();

            const select = document.getElementById("product-category");
            select.innerHTML = `<option value="">Choose category</option>`;
            categories.forEach(cat => {
                const option = document.createElement("option");
                option.value = cat.name; // Use category name as value
                option.textContent = cat.name;
                select.appendChild(option);
            });
        } catch (err) {
            console.error("Failed to load categories:", err);
            alert("Failed to load categories. Check console for details.");
        }
    }

    // --- Cloudinary Upload ---
    const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dknjr0tj2/upload"; // Replace with your cloud name
    const UPLOAD_PRESET = "unsigned_products"; // Replace with your unsigned upload preset

    async function uploadFileToCloudinary(file) {
        if (!file) return null;
        const data = new FormData();
        data.append("file", file);
        data.append("upload_preset", UPLOAD_PRESET);
        try {
            const res = await fetch(CLOUDINARY_URL, { method: "POST", body: data });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(`Cloudinary upload failed: ${errorData.error.message}`);
            }
            const json = await res.json();
            return json.secure_url;
        } catch (error) {
            console.error("Error uploading to Cloudinary:", error);
            alert(`Image upload failed: ${error.message}`);
            return null;
        }
    }

    const mainFileInput = document.querySelector('input[name="mainImage"]');
    const galleryInput = document.getElementById('galleryInput'); // Changed to match ID

    let uploadedMainImage = "";
    let uploadedGallery = [];

    mainFileInput.addEventListener("change", async e => {
        if (!e.target.files[0]) return;
        const mainImagePreview = document.querySelector('.upload-image .item.up-load img');
        if (mainImagePreview) mainImagePreview.remove(); // Clear previous preview

        uploadedMainImage = await uploadFileToCloudinary(e.target.files[0]);
        if (uploadedMainImage) {
            const img = document.createElement('img');
            img.src = uploadedMainImage;
            img.style.maxWidth = '100px';
            img.style.maxHeight = '100px';
            img.style.marginTop = '10px';
            e.target.closest('.up-load').appendChild(img);
        }
    });

    galleryInput.addEventListener("change", async e => { // Changed to use galleryInput
        if (!e.target.files.length) return;

        const galleryPreviewContainer = document.getElementById("galleryDrop"); // Get the parent container
        // Clear previous previews
        galleryPreviewContainer.querySelectorAll('.uploaded-gallery-img').forEach(img => img.remove());

        uploadedGallery = [];
        for (const file of e.target.files) {
            const url = await uploadFileToCloudinary(file);
            if (url) {
                uploadedGallery.push(url);
                const img = document.createElement('img');
                img.src = url;
                img.style.maxWidth = '80px';
                img.style.maxHeight = '80px';
                img.style.marginRight = '5px';
                img.style.marginTop = '10px';
                img.className = 'uploaded-gallery-img';
                galleryPreviewContainer.appendChild(img);
            }
        }
    });

    // --- Form Submission ---
    form.addEventListener("submit", async e => {
        e.preventDefault();
        const rawForm = new FormData(form);
        const payload = Object.fromEntries(rawForm.entries());

        // Flags
        payload.is_new = form.elements.is_new?.checked ? 1 : 0;
        payload.on_sale = form.elements.on_sale?.checked ? 1 : 0;

        // Numbers default
        ["price", "origin_price", "quantity", "sold", "rate"].forEach(f => {
            payload[f] = Number(payload[f]) || 0;
        });

        // Sizes & Variations (ensure they are stringified JSON)
        payload.sizes = sizesHidden.value; // Already JSON string from renderSizes
        payload.variations = variationsHidden.value; // Already JSON string from renderVariations

        // Images
        payload.main_image = uploadedMainImage;
        payload.gallery = JSON.stringify(uploadedGallery); // Stringify the array for DB

        // Auto-slug
        if (!payload.slug && payload.name) {
            payload.slug = payload.name.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]+/g, "");
        }

        try {
            const res = await fetch("/api/admin/products", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok) {
                alert("✅ Product added successfully!");
                form.reset();
                selectedSizes = [];
                attributeOptions = {}; // Clear attribute options
                selectedAttributeVariants = {}; // Clear selected variants
                uploadedMainImage = "";
                uploadedGallery = [];
                renderSizes();
                renderVariations();
                // Clear image previews
                document.querySelector('.upload-image .item.up-load img')?.remove();
                document.getElementById("galleryDrop").querySelectorAll('.uploaded-gallery-img').forEach(img => img.remove());
            } else {
                alert("❌ Error: " + (data.message || "Unknown error"));
                console.error(data);
            }
        } catch (err) {
            console.error("⚠️ Fetch error:", err);
            alert("⚠️ Failed to add product. See console.");
        }
    });

    // --- Initialize ---
    loadCategories();
    loadAttributes();
    renderSizes(); // Initialize sizes display
    renderVariations(); // Initialize variations display
});