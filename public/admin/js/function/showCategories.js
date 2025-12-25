// public/admin/js/function/showCategories.js
document.addEventListener("DOMContentLoaded", async () => {
    const categoryList = document.querySelector(".table-all-category .flex-column");
    if (!categoryList) return;

    categoryList.innerHTML = `<li class="product-item gap14"><div class="body-text">Loading categories...</div></li>`;

    try {
        const res = await fetch("/api/admin/categories", { credentials: "include" });
        if (!res.ok) throw new Error("Server error " + res.status);
        const categories = await res.json();

        categoryList.innerHTML = ""; // Clear loading message

        if (!categories.length) {
            categoryList.innerHTML = `<li class="product-item gap14"><div class="body-text">No categories found</div></li>`;
            return;
        }

        categories.forEach(cat => {
            const li = document.createElement("li");
            li.className = "product-item gap14";
            li.dataset.id = cat.id;

            const iconUrl = cat.icon ? `/uploads/categories/${cat.icon}` : "/images/products/default-cat.png";

            li.innerHTML = `
                <div class="image no-bg">
                    <img src="${iconUrl}" alt="${cat.name}">
                </div>
                <div class="flex items-center justify-between gap20 flex-grow">
                    <div class="name">
                        <a href="product-list.html?category=${cat.name}" class="body-title-2">${cat.name}</a>
                    </div>
                    <div class="body-text">${cat.quantity ?? 0}</div>
                    <div class="body-text">${cat.sale ?? 0}</div>
                    <div class="body-text">${new Date(cat.created_at).toLocaleDateString()}</div>
                    <div class="list-icon-function">
                        <a href="edit-category.html?id=${cat.id}" class="item edit">
                            <i class="icon-edit-3"></i>
                        </a>
                        <div class="item trash" data-id="${cat.id}">
                            <i class="icon-trash-2"></i>
                        </div>
                    </div>
                </div>
            `;

            // Attach delete handler
            li.querySelector(".trash").addEventListener("click", () => deleteCategory(cat.id));

            categoryList.appendChild(li);
        });

    } catch (err) {
        console.error("⚠️ Error fetching categories:", err);
        categoryList.innerHTML = `<li class="product-item gap14"><div class="body-text">Error loading categories</div></li>`;
    }
});

// Function to handle category deletion
async function deleteCategory(id) {
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
        const res = await fetch(`/api/admin/categories/${id}`, {
            method: "DELETE",
            credentials: "include"
        });
        const data = await res.json();

        if (res.ok) {
            alert("✅ " + data.message);
            const li = document.querySelector(`li[data-id="${id}"]`);
            if (li) li.remove();
        } else {
            alert("❌ Error: " + data.message);
        }
    } catch (err) {
        console.error("⚠️ Delete failed:", err);
        alert("⚠️ Failed to delete category");
    }
}
