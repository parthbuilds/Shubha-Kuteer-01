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
        sizesSelect.value = "";
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

    window.removeSize = function(size) {
        selectedSizes = selectedSizes.filter(s => s !== size);
        renderSizes();
    }

    // --- Color Variations ---
    const variationsHidden = document.getElementById("variationsHidden");
    const variationsContainer = document.getElementById("variationsContainer");
    let variationList = [];

    document.getElementById("addColorBtn").addEventListener("click", () => {
        const colorName = prompt("Enter color name:");
        if (!colorName) return;
        const colorCode = prompt("Enter hex code (e.g. #DB4444):", "#000000");
        if (!colorCode) return;

        variationList.push({ color: colorName, colorCode, colorImage: null });
        renderColorVariations();
    });

    function renderColorVariations() {
        variationsContainer.innerHTML = "";
        variationList.forEach(v => {
            const div = document.createElement("div");
            div.className = "variation-item mb-10";
            div.innerHTML = `
                <div class="body-text">
                    ${v.color}
                    <span style="background:${v.colorCode};padding:0 10px;margin-left:10px;border-radius:3px;">&nbsp;</span>
                    <button type="button" onclick="removeColorVariation('${v.color}', '${v.colorCode}')">Remove</button>
                </div>`;
            variationsContainer.appendChild(div);
        });
        variationsHidden.value = JSON.stringify(variationList);
    }

    window.removeColorVariation = function(colorName, colorCode) {
        variationList = variationList.filter(v => !(v.color === colorName && v.colorCode === colorCode));
        renderColorVariations();
    }

    // --- Attributes & Variants ---
    const variantsContainer = document.getElementById("variantsContainer");

    async function loadAttributes() {
        try {
            const res = await fetch("/api/admin/attributes");
            const attributes = await res.json();

            const select = document.getElementById("attributeSelect");
            const uniqueNames = [...new Set(attributes.map(a => a.attribute_name))];
            uniqueNames.forEach(name => {
                const option = document.createElement("option");
                option.value = name;
                option.textContent = name;
                select.appendChild(option);
            });

            select.addEventListener("change", () => displayVariants(select.value, attributes));
        } catch (err) {
            console.error("Error loading attributes:", err);
        }
    }

    function displayVariants(attributeName, attributes) {
        variantsContainer.innerHTML = "";
        const attrObj = attributes.find(a => a.attribute_name === attributeName);
        if (!attrObj || !attrObj.attribute_value) return;

        const variants = attrObj.attribute_value.split(",");
        variants.forEach(value => {
            const wrapper = document.createElement("div");
            wrapper.style.display = "inline-block";
            wrapper.style.marginRight = "10px";

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.value = value.trim();
            checkbox.dataset.attribute = attributeName;
            checkbox.className = "variant-checkbox";

            const label = document.createElement("label");
            label.textContent = value.trim();
            label.style.marginLeft = "5px";

            wrapper.appendChild(checkbox);
            wrapper.appendChild(label);
            variantsContainer.appendChild(wrapper);
        });
    }

    loadAttributes();

    // --- Form Submission ---
    form.addEventListener("submit", async e => {
        e.preventDefault();

        // Collect selected variants
        const checkboxes = document.querySelectorAll(".variant-checkbox:checked");
        const selectedVariants = {};
        checkboxes.forEach(cb => {
            const attr = cb.dataset.attribute;
            if (!selectedVariants[attr]) selectedVariants[attr] = [];
            selectedVariants[attr].push(cb.value);
        });
        variationsHidden.value = JSON.stringify({ colors: variationList, attributes: selectedVariants });

        const formData = new FormData(form);

        // Checkboxes
        formData.set("is_new", form.is_new?.checked ? 1 : 0);
        formData.set("on_sale", form.on_sale?.checked ? 1 : 0);

        // Convert empty numbers to 0
        ["price", "origin_price", "quantity", "sold", "quantity_purchase", "rate"].forEach(f => {
            if (form[f] && !form[f].value) formData.set(f, 0);
        });

        // Auto-generate slug
        if (form.slug && !form.slug.value && form.name.value) {
            formData.set("slug", form.name.value.toLowerCase().replace(/\s+/g, "-"));
        }

        try {
            const res = await fetch("/api/admin/products", { method: "POST", body: formData });
            const data = await res.json();
            if (res.ok) {
                alert("✅ Product added successfully!");
                form.reset();
                selectedSizes = [];
                variationList = [];
                renderSizes();
                renderColorVariations();
                variantsContainer.innerHTML = "";
            } else {
                alert("❌ Error: " + (data.message || "Unknown error"));
                console.error(data);
            }
        } catch (err) {
            console.error("⚠️ Fetch error:", err);
            alert("⚠️ Failed to add product. See console.");
        }
    });

    // --- Load Categories ---
    async function loadCategories() {
        try {
            const res = await fetch("/api/admin/categories");
            const categories = await res.json();

            const select = document.getElementById("product-category");
            categories.forEach(cat => {
                const option = document.createElement("option");
                option.value = cat.name;
                option.textContent = cat.name;
                select.appendChild(option);
            });
        } catch (err) {
            console.error("Error loading categories:", err);
        }
    }

    loadCategories();
});
