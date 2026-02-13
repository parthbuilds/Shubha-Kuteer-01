/**
 * DTDC Tracking Integration
 * Handles DTDC courier tracking API integration
 */

// DTDC API Configuration
const DTDC_API_URL = process.env.DTDC_API_URL || 'https://track.dtdc.com/ctbs-api/customer/api';
const DTDC_API_KEY = process.env.DTDC_API_KEY;
const DTDC_USERNAME = process.env.DTDC_USERNAME;
const DTDC_PASSWORD = process.env.DTDC_PASSWORD;

/**
 * Track shipment using DTDC API
 * @param {string} trackingNumber - DTDC tracking/AWB number
 * @returns {Object} - Tracking information
 */
export const trackShipment = async (trackingNumber) => {
    try {
        if (!trackingNumber) {
            return {
                success: false,
                message: "Tracking number is required"
            };
        }

        // DTDC API endpoint for tracking
        const trackUrl = `${DTDC_API_URL}/tracking/${trackingNumber}`;

        const headers = {
            'Content-Type': 'application/json',
        };

        // Add API key if available
        if (DTDC_API_KEY) {
            headers['api-key'] = DTDC_API_KEY;
        }

        // Add basic auth if credentials are available
        const auth = DTDC_USERNAME && DTDC_PASSWORD
            ? `Basic ${Buffer.from(`${DTDC_USERNAME}:${DTDC_PASSWORD}`).toString('base64')}`
            : null;

        if (auth) {
            headers['Authorization'] = auth;
        }

        const response = await fetch(trackUrl, {
            method: 'GET',
            headers: headers
        });

        if (!response.ok) {
            // If API fails, return mock data for demonstration
            return getMockTrackingData(trackingNumber);
        }

        const data = await response.json();

        return {
            success: true,
            trackingNumber: trackingNumber,
            data: data
        };
    } catch (error) {
        console.error('DTDC tracking error:', error);
        // Return mock data on error for development
        return getMockTrackingData(trackingNumber);
    }
};

/**
 * Create shipment with DTDC
 * @param {Object} shipmentData - Shipment details
 * @returns {Object} - Shipment creation response
 */
export const createShipment = async (shipmentData) => {
    try {
        const {
            order_id,
            recipient_name,
            recipient_address,
            recipient_city,
            recipient_pincode,
            recipient_phone,
            weight,
            payment_mode,
            declared_value
        } = shipmentData;

        if (!DTDC_API_KEY) {
            return {
                success: false,
                message: "DTDC API credentials not configured"
            };
        }

        // DTDC shipment creation endpoint
        const shipUrl = `${DTDC_API_URL}/shipment/create`;

        const payload = {
            username: DTDC_USERNAME,
            password: DTDC_PASSWORD,
            apikey: DTDC_API_KEY,
            shipment: {
                consignee_name: recipient_name,
                consignee_address: recipient_address,
                consignee_city: recipient_city,
                consignee_pincode: recipient_pincode,
                consignee_mobile: recipient_phone,
                weight: weight || '0.5',
                payment_mode: payment_mode || 'Prepaid',
                declared_value: declared_value || '0',
                order_number: order_id.toString()
            }
        };

        const response = await fetch(shipUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': DTDC_API_KEY
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error('Failed to create shipment');
        }

        const data = await response.json();

        return {
            success: true,
            trackingNumber: data.awb_number || data.tracking_number,
            data: data
        };
    } catch (error) {
        console.error('DTDC shipment creation error:', error);
        return {
            success: false,
            message: error.message || "Failed to create shipment"
        };
    }
};

/**
 * Get mock tracking data for development/testing
 * @param {string} trackingNumber - Tracking number
 * @returns {Object} - Mock tracking data
 */
const getMockTrackingData = (trackingNumber) => {
    const statuses = [
        { status: 'Shipped', description: 'Package has been shipped', timestamp: new Date(Date.now() - 86400000 * 3).toISOString() },
        { status: 'In Transit', description: 'Package is in transit to destination', timestamp: new Date(Date.now() - 86400000 * 2).toISOString() },
        { status: 'Out for Delivery', description: 'Package is out for delivery', timestamp: new Date(Date.now() - 86400000).toISOString() }
    ];

    return {
        success: true,
        trackingNumber: trackingNumber,
        mock: true,
        message: "Using mock data (API not configured or failed)",
        currentStatus: statuses[statuses.length - 1].status,
        trackingHistory: statuses,
        estimatedDelivery: new Date(Date.now() + 86400000).toISOString()
    };
};

/**
 * Format tracking status for display
 * @param {Object} trackingData - Raw tracking data
 * @returns {Object} - Formatted tracking data
 */
export const formatTrackingData = (trackingData) => {
    if (!trackingData || !trackingData.success) {
        return {
            success: false,
            message: trackingData?.message || "Failed to fetch tracking data"
        };
    }

    return {
        success: true,
        trackingNumber: trackingData.trackingNumber,
        currentStatus: trackingData.currentStatus || 'In Transit',
        trackingHistory: trackingData.trackingHistory || [],
        estimatedDelivery: trackingData.estimatedDelivery || null,
        isMock: trackingData.mock || false
    };
};

/**
 * Get all tracking statuses for an order
 * @param {string} awbNumber - Airway bill number
 * @returns {Object} - Tracking information
 */
export const getOrderTracking = async (awbNumber) => {
    if (!awbNumber) {
        return {
            success: false,
            message: "No tracking number available for this order"
        };
    }

    const trackingData = await trackShipment(awbNumber);
    return formatTrackingData(trackingData);
};

export default {
    trackShipment,
    createShipment,
    getOrderTracking,
    formatTrackingData
};
