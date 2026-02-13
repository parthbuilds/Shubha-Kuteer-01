/**
 * Input Validation Schemas
 * Provides validation rules for various API endpoints
 */

import { validators } from "../middlewares/security.js";

/**
 * User registration validation
 */
export const userRegistrationSchema = {
    name: {
        required: true,
        type: 'string',
        validate: (value) => value.trim().length >= 2 && value.trim().length <= 100,
        message: 'Name must be between 2 and 100 characters'
    },
    email: {
        required: true,
        type: 'string',
        validate: validators.isEmail,
        message: 'Invalid email format'
    },
    phone: {
        required: true,
        type: 'string',
        validate: validators.isPhone,
        message: 'Invalid phone number format'
    },
    password: {
        required: true,
        type: 'string',
        validate: (value) => {
            const validation = validators.validatePassword(value);
            return validation.isValid;
        },
        message: 'Password must be at least 8 characters with uppercase, lowercase, and numbers'
    }
};

/**
 * User login validation
 */
export const userLoginSchema = {
    email: {
        required: true,
        type: 'string',
        validate: validators.isEmail,
        message: 'Invalid email format'
    },
    password: {
        required: true,
        type: 'string',
        validate: (value) => value.length > 0,
        message: 'Password is required'
    }
};

/**
 * Admin registration validation
 */
export const adminRegistrationSchema = {
    name: {
        required: true,
        type: 'string',
        validate: (value) => value.trim().length >= 2 && value.trim().length <= 100,
        message: 'Name must be between 2 and 100 characters'
    },
    email: {
        required: true,
        type: 'string',
        validate: validators.isEmail,
        message: 'Invalid email format'
    },
    password: {
        required: true,
        type: 'string',
        validate: (value) => {
            const validation = validators.validatePassword(value);
            return validation.isValid;
        },
        message: 'Password must be at least 8 characters with uppercase, lowercase, and numbers'
    },
    phone: {
        required: false,
        type: 'string',
        validate: validators.isPhone,
        message: 'Invalid phone number format'
    }
};

/**
 * Admin login validation
 */
export const adminLoginSchema = {
    email: {
        required: true,
        type: 'string',
        validate: validators.isEmail,
        message: 'Invalid email format'
    },
    password: {
        required: true,
        type: 'string',
        validate: (value) => value.length > 0,
        message: 'Password is required'
    }
};

/**
 * Product creation validation
 */
export const productCreationSchema = {
    name: {
        required: true,
        type: 'string',
        validate: (value) => value.trim().length >= 2 && value.trim().length <= 200,
        message: 'Product name must be between 2 and 200 characters'
    },
    category: {
        required: true,
        type: 'string',
        validate: (value) => value.trim().length > 0,
        message: 'Category is required'
    },
    price: {
        required: true,
        validate: (value) => validators.isPositiveNumber(value),
        message: 'Price must be a positive number'
    },
    origin_price: {
        required: false,
        validate: (value) => !value || validators.isPositiveNumber(value),
        message: 'Origin price must be a positive number'
    },
    quantity: {
        required: false,
        validate: (value) => {
            const num = parseInt(value);
            return !isNaN(num) && num >= 0;
        },
        message: 'Quantity must be a non-negative number'
    },
    description: {
        required: false,
        type: 'string',
        validate: (value) => value.length <= 5000,
        message: 'Description must not exceed 5000 characters'
    },
    main_image: {
        required: false,
        type: 'string',
        validate: (value) => !value || validators.isURL(value),
        message: 'Main image must be a valid URL'
    }
};

/**
 * Product update validation
 */
export const productUpdateSchema = {
    ...productCreationSchema,
    // All fields optional for update
    name: { ...productCreationSchema.name, required: false },
    category: { ...productCreationSchema.category, required: false },
    price: { ...productCreationSchema.price, required: false }
};

/**
 * Category creation validation
 */
export const categoryCreationSchema = {
    name: {
        required: true,
        type: 'string',
        validate: (value) => value.trim().length >= 2 && value.trim().length <= 100,
        message: 'Category name must be between 2 and 100 characters'
    },
    data_item: {
        required: false,
        type: 'string',
        validate: (value) => value.trim().length <= 100,
        message: 'Data item must not exceed 100 characters'
    },
    sale: {
        required: false,
        validate: (value) => {
            const num = parseInt(value);
            return !isNaN(num) && num >= 0;
        },
        message: 'Sale must be a non-negative number'
    }
};

/**
 * Order creation validation
 */
export const orderCreationSchema = {
    first_name: {
        required: true,
        type: 'string',
        validate: (value) => value.trim().length >= 2 && value.trim().length <= 100,
        message: 'First name must be between 2 and 100 characters'
    },
    email: {
        required: true,
        type: 'string',
        validate: validators.isEmail,
        message: 'Invalid email format'
    },
    phone_number: {
        required: true,
        type: 'string',
        validate: validators.isPhone,
        message: 'Invalid phone number format'
    },
    city: {
        required: true,
        type: 'string',
        validate: (value) => value.trim().length > 0,
        message: 'City is required'
    },
    apartment: {
        required: false,
        type: 'string',
        validate: (value) => value.length <= 200,
        message: 'Apartment address must not exceed 200 characters'
    },
    postal_code: {
        required: true,
        type: 'string',
        validate: (value) => /^\d{6}$/.test(value),
        message: 'Postal code must be 6 digits'
    },
    amount: {
        required: true,
        validate: (value) => validators.isPositiveNumber(value),
        message: 'Amount must be a positive number'
    },
    products: {
        required: true,
        validate: (value) => Array.isArray(value) && value.length > 0,
        message: 'At least one product is required'
    }
};

/**
 * Order status update validation
 */
export const orderStatusUpdateSchema = {
    delivery_status: {
        required: true,
        type: 'string',
        validate: (value) => {
            const validStatuses = ['pending', 'processing', 'shipped', 'out for delivery', 'delivered', 'returned', 'cancelled'];
            return validStatuses.includes(value.toLowerCase());
        },
        message: 'Invalid delivery status'
    }
};

/**
 * User profile update validation
 */
export const userProfileUpdateSchema = {
    first_name: {
        required: false,
        type: 'string',
        validate: (value) => value.trim().length >= 2 && value.trim().length <= 100,
        message: 'First name must be between 2 and 100 characters'
    },
    last_name: {
        required: false,
        type: 'string',
        validate: (value) => !value || value.trim().length <= 100,
        message: 'Last name must not exceed 100 characters'
    },
    email: {
        required: false,
        type: 'string',
        validate: validators.isEmail,
        message: 'Invalid email format'
    },
    phone_number: {
        required: false,
        type: 'string',
        validate: validators.isPhone,
        message: 'Invalid phone number format'
    }
};

/**
 * Password change validation
 */
export const passwordChangeSchema = {
    current_password: {
        required: true,
        type: 'string',
        validate: (value) => value.length > 0,
        message: 'Current password is required'
    },
    new_password: {
        required: true,
        type: 'string',
        validate: (value) => {
            const validation = validators.validatePassword(value);
            return validation.isValid;
        },
        message: 'New password must be at least 8 characters with uppercase, lowercase, and numbers'
    },
    confirm_new_password: {
        required: true,
        type: 'string',
        validate: (value) => value.length > 0,
        message: 'Password confirmation is required'
    }
};

/**
 * Attribute creation validation
 */
export const attributeCreationSchema = {
    category_id: {
        required: true,
        validate: (value) => validators.isPositiveNumber(value),
        message: 'Category ID must be a positive number'
    },
    attribute_name: {
        required: true,
        type: 'string',
        validate: (value) => value.trim().length >= 2 && value.trim().length <= 100,
        message: 'Attribute name must be between 2 and 100 characters'
    },
    attribute_values: {
        required: true,
        validate: (value) => Array.isArray(value) && value.length > 0,
        message: 'At least one attribute value is required'
    }
};

/**
 * ID parameter validation
 */
export const idParamSchema = {
    id: {
        required: true,
        validate: (value) => {
            const num = parseInt(value);
            return !isNaN(num) && num > 0;
        },
        message: 'Valid ID parameter is required'
    }
};

/**
 * Sanitization helpers
 */
export const sanitizers = {
    /**
     * Sanitize user input
     */
    sanitizeUserInput: (data) => {
        const sanitized = {};
        const fields = ['name', 'first_name', 'last_name', 'email', 'phone', 'city', 'apartment'];

        for (const field of fields) {
            if (data[field]) {
                sanitized[field] = validators.sanitizeString(data[field]);
            }
        }

        return sanitized;
    },

    /**
     * Sanitize product input
     */
    sanitizeProductInput: (data) => {
        const sanitized = {};
        const stringFields = ['name', 'description', 'category', 'type', 'brand', 'slug', 'action'];
        const numberFields = ['price', 'origin_price', 'quantity', 'sold', 'rate'];

        for (const field of stringFields) {
            if (data[field] !== undefined) {
                sanitized[field] = validators.sanitizeString(data[field]);
            }
        }

        for (const field of numberFields) {
            if (data[field] !== undefined) {
                sanitized[field] = parseFloat(data[field]) || 0;
            }
        }

        // Handle boolean fields
        if (data.is_new !== undefined) sanitized.is_new = Boolean(data.is_new);
        if (data.on_sale !== undefined) sanitized.on_sale = Boolean(data.on_sale);

        // Handle URLs
        if (data.main_image) sanitized.main_image = data.main_image;
        if (data.gallery) sanitized.gallery = data.gallery;

        return sanitized;
    }
};

export default {
    userRegistrationSchema,
    userLoginSchema,
    adminRegistrationSchema,
    adminLoginSchema,
    productCreationSchema,
    productUpdateSchema,
    categoryCreationSchema,
    orderCreationSchema,
    orderStatusUpdateSchema,
    userProfileUpdateSchema,
    passwordChangeSchema,
    attributeCreationSchema,
    idParamSchema,
    sanitizers
};
