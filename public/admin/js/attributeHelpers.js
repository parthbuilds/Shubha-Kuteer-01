// Helper functions for attribute management

class AttributeManager {
    static async loadAttributes() {
        try {
            const response = await fetch('/api/admin/attributes');
            if (!response.ok) throw new Error('Failed to fetch attributes');
            return await response.json();
        } catch (error) {
            console.error('Error loading attributes:', error);
            return [];
        }
    }

    static parseAttributeValues(attributeValues) {
        if (!attributeValues) return [];
        
        try {
            const parsed = JSON.parse(attributeValues);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.error('Error parsing attribute values:', e);
            return [];
        }
    }

    static formatAttributeForDisplay(valueObj) {
        if (valueObj.color && valueObj.colorCode) {
            return {
                type: 'color',
                name: valueObj.color,
                code: valueObj.colorCode,
                display: `${valueObj.color} (${valueObj.colorCode})`
            };
        } else if (valueObj.size) {
            return {
                type: 'size',
                name: valueObj.size,
                display: valueObj.size
            };
        } else if (valueObj.value) {
            return {
                type: 'value',
                name: valueObj.value,
                display: valueObj.value
            };
        } else {
            const stringValue = Object.values(valueObj)[0] || valueObj;
            return {
                type: 'string',
                name: stringValue,
                display: stringValue
            };
        }
    }

    static createColorVariation(colorData) {
        return {
            color: colorData.name,
            colorCode: colorData.code,
            colorImage: './assets/images/product/color/48x48.png',
            image: './assets/images/product/default.png'
        };
    }
}

// Export for use in other scripts
window.AttributeManager = AttributeManager;
