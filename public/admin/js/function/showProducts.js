document.addEventListener("DOMContentLoaded", async () => {
    const productList = document.getElementById("productList");

    function renderMessage(msg) {
        productList.innerHTML = `<li class="product-item gap14"><div class="body-text">${msg}</div></li>`;
    }

    renderMessage("Loading products...");

    async function fetchProducts() {
        try {
            const res = await fetch("/api/admin/products", { credentials: "include" });
            if (!res.ok) throw new Error("Server error " + res.status);
            const products = await res.json();

            productList.innerHTML = "";

            if (!products.length) {
                renderMessage("No products found");
                return;
            }

            products.forEach(p => {
                const li = document.createElement("li");
                li.className = "product-item gap14";
                li.dataset.id = p.id;

                let sizes = "-";
                if (p.sizes) {
                    try {
                        const parsedSizes = JSON.parse(p.sizes);
                        if (Array.isArray(parsedSizes) && parsedSizes.length) sizes = parsedSizes.join(", ");
                    } catch (e) { console.warn("Failed to parse sizes:", e); }
                }

                li.innerHTML = `
                    <div class="image no-bg">
                        <img src="${p.main_image || '/images/products/default.png'}" alt="${p.name}">
                    </div>
                    <div class="flex items-center justify-between gap20 flex-grow">
                        <div class="name">
                            <a href="product-detail.html?id=${p.id}" class="body-title-2">${p.name}</a>
                        </div>
                        <div class="body-text">#${p.id}</div>
                        <div class="body-text">₹${p.price}</div>
                        <div class="body-text">${p.category || '-'}</div>
                        <div class="body-text">${sizes}</div>
                        <div><div class="block-available">${p.quantity > 0 ? 'In stock' : 'Out of stock'}</div></div>
                        <div class="body-text">${new Date(p.created_at).toLocaleDateString()}</div>
                        <div class="list-icon-function">
                            <a href="product-detail.html?id=${p.id}" class="item eye"><i class="icon-eye"></i></a>
                            <a href="edit-product.html?id=${p.id}" class="item edit"><i class="icon-edit-3"></i></a>
                            <div class="item trash" data-id="${p.id}"><i class="icon-trash-2"></i></div>
                        </div>
                    </div>
                `;

                // Attach delete handler
                li.querySelector(".item.trash").addEventListener("click", () => deleteProduct(p.id));
                productList.appendChild(li);
            });
        } catch (err) {
            console.error("Error fetching products:", err);
            renderMessage("Error loading products");
        }
    }

    async function deleteProduct(id) {
        if (!confirm("Are you sure you want to delete this product?")) return;
        try {
            const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE", credentials: "include" });
            const data = await res.json();
            if (res.ok) {
                alert("✅ " + data.message);
                document.querySelector(`#productList li[data-id="${id}"]`)?.remove();
            } else {
                alert("❌ Error: " + data.message);
            }
        } catch (err) {
            console.error("Delete failed:", err);
            alert("⚠️ Failed to delete product");
        }
    }

    fetchProducts();
});
