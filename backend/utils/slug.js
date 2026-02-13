/**
 * Slug Utility Functions
 * Handles slug generation, validation, and uniqueness
 */

/**
 * Generate a URL-friendly slug from a string
 * @param {string} text - Text to convert to slug
 * @returns {string} - Generated slug
 */
export const generateSlug = (text) => {
    if (!text || typeof text !== 'string') {
        return '';
    }

    return text
        .toLowerCase()
        .trim()
        // Replace spaces with hyphens
        .replace(/\s+/g, '-')
        // Remove special characters except hyphens and numbers
        .replace(/[^\w\-]+/g, '')
        // Replace multiple hyphens with single hyphen
        .replace(/\-\-+/g, '-')
        // Remove hyphens from start and end
        .replace(/^\-|\-$/g, '');
};

/**
 * Ensure slug uniqueness by adding suffix if needed
 * @param {string} baseSlug - Base slug to check
 * @param {Array} existingSlugs - Array of existing slugs to check against
 * @returns {string} - Unique slug
 */
export const ensureUniqueSlug = (baseSlug, existingSlugs = []) => {
    if (!existingSlugs.includes(baseSlug)) {
        return baseSlug;
    }

    // Add numeric suffix until we find a unique slug
    let counter = 1;
    let uniqueSlug = `${baseSlug}-${counter}`;

    while (existingSlugs.includes(uniqueSlug)) {
        counter++;
        uniqueSlug = `${baseSlug}-${counter}`;
    }

    return uniqueSlug;
};

/**
 * Validate slug format
 * @param {string} slug - Slug to validate
 * @returns {boolean} - Is valid slug
 */
export const isValidSlug = (slug) => {
    if (!slug || typeof slug !== 'string') {
        return false;
    }

    // Slug should contain only lowercase letters, numbers, and hyphens
    // Should not start or end with hyphen
    // Should not have consecutive hyphens
    const slugRegex = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

    return slugRegex.test(slug) && !slug.includes('--');
};

/**
 * Generate product slug with automatic uniqueness check
 * @param {string} productName - Product name
 * @param {number} productId - Product ID (optional)
 * @returns {string} - Generated slug
 */
export const generateProductSlug = (productName, productId = null) => {
    const baseSlug = generateSlug(productName);

    if (!baseSlug) {
        // If no valid name, use ID
        return productId ? `product-${productId}` : `product-${Date.now()}`;
    }

    return baseSlug;
};

export default {
    generateSlug,
    ensureUniqueSlug,
    isValidSlug,
    generateProductSlug
};
