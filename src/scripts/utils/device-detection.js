// device-detection.js

/**
 * Analyzes device quality and optimizes view for mobile devices.
 * The function detects whether the user is on a mobile device and provides tailored recommendations.
 */

function detectDeviceQuality() {
    const userAgent = navigator.userAgent;
    const isMobile = /Mobi|Android/i.test(userAgent);
    const deviceQuality = isMobile ? 'Mobile' : 'Desktop';

    let qualityRecommendation;

    if (deviceQuality === 'Mobile') {
        qualityRecommendation = 'Optimize for lower screen resolution and touch interactions.';
    } else {
        qualityRecommendation = 'Use high-quality graphics and interactive elements.';
    }

    console.log(`Device Quality: ${deviceQuality}`);
    console.log(`Recommendation: ${qualityRecommendation}`);
}

// Run the device detection function
window.onload = detectDeviceQuality;