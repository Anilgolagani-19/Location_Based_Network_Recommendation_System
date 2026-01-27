// Location Service Module
// Handles GPS detection, permission management, and reverse geocoding

class LocationService {
    constructor() {
        this.currentLocation = null;
        this.permissionStatus = 'unknown'; // 'unknown', 'granted', 'denied', 'prompt'
        this.detectionStatus = 'idle'; // 'idle', 'detecting', 'success', 'error'
        this.errorMessage = null;
        this.cachedLocation = null;
        this.cacheTimestamp = null;
        this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Check if device is mobile
     */
    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    /**
     * Check if Geolocation API is supported
     */
    isGeolocationSupported() {
        return 'geolocation' in navigator;
    }

    /**
     * Get current permission status
     */
    async checkPermissionStatus() {
        if (!this.isGeolocationSupported()) {
            this.permissionStatus = 'unsupported';
            return 'unsupported';
        }

        // Try to use Permissions API if available
        if ('permissions' in navigator) {
            try {
                const result = await navigator.permissions.query({ name: 'geolocation' });
                this.permissionStatus = result.state;

                // Listen for permission changes
                result.addEventListener('change', () => {
                    this.permissionStatus = result.state;
                });

                return result.state;
            } catch (error) {
                console.warn('[Location] Permissions API not fully supported:', error);
            }
        }

        // Fallback: permission status unknown until we try
        return 'prompt';
    }

    /**
     * Request location permission and get coordinates
     */
    async requestLocation(options = {}) {
        const defaultOptions = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };

        const geoOptions = { ...defaultOptions, ...options };

        return new Promise((resolve, reject) => {
            if (!this.isGeolocationSupported()) {
                this.detectionStatus = 'error';
                this.errorMessage = 'Geolocation is not supported by your browser';
                reject(new Error(this.errorMessage));
                return;
            }

            this.detectionStatus = 'detecting';

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.detectionStatus = 'success';
                    this.currentLocation = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        timestamp: position.timestamp
                    };
                    this.permissionStatus = 'granted';
                    resolve(this.currentLocation);
                },
                (error) => {
                    this.detectionStatus = 'error';
                    this.handleGeolocationError(error);
                    reject(error);
                },
                geoOptions
            );
        });
    }

    /**
     * Handle geolocation errors
     */
    handleGeolocationError(error) {
        switch (error.code) {
            case error.PERMISSION_DENIED:
                this.permissionStatus = 'denied';
                this.errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
                break;
            case error.POSITION_UNAVAILABLE:
                this.errorMessage = 'Location information is unavailable. Please check your device settings.';
                break;
            case error.TIMEOUT:
                this.errorMessage = 'Location request timed out. Please try again.';
                break;
            default:
                this.errorMessage = 'An unknown error occurred while detecting your location.';
        }
        console.error('[Location] Geolocation error:', error.message);
    }

    /**
     * Reverse geocode coordinates to get city/area information
     * Using OpenStreetMap Nominatim API
     */
    async reverseGeocode(latitude, longitude) {
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`;

            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'TeleSignal Dashboard'
                }
            });

            if (!response.ok) {
                throw new Error('Geocoding service unavailable');
            }

            const data = await response.json();

            if (!data || !data.address) {
                throw new Error('Unable to determine location from coordinates');
            }

            // Extract location information
            const address = data.address;
            const locationInfo = {
                city: address.city || address.town || address.village || address.suburb || null,
                state: address.state || null,
                country: address.country || null,
                pincode: address.postcode || null,
                district: address.state_district || null,
                displayName: data.display_name || null,
                raw: address
            };

            console.log('[Location] Reverse geocoded:', locationInfo);
            return locationInfo;

        } catch (error) {
            console.error('[Location] Reverse geocoding failed:', error);
            throw new Error('Failed to determine your location. Please try again or select manually.');
        }
    }

    /**
     * Match detected location against available cities in database
     */
    matchLocationToDatabase(locationInfo, availableCities) {
        if (!locationInfo.city || !availableCities || availableCities.length === 0) {
            return null;
        }

        const detectedCity = locationInfo.city.toLowerCase().trim();

        // Direct match
        const directMatch = availableCities.find(city =>
            city.toLowerCase().trim() === detectedCity
        );

        if (directMatch) {
            return directMatch;
        }

        // Fuzzy match (contains)
        const fuzzyMatch = availableCities.find(city =>
            city.toLowerCase().includes(detectedCity) ||
            detectedCity.includes(city.toLowerCase())
        );

        if (fuzzyMatch) {
            return fuzzyMatch;
        }

        // Common city name variations
        const cityVariations = {
            'bengaluru': 'bangalore',
            'bangalore': 'bengaluru',
            'mumbai': 'bombay',
            'bombay': 'mumbai',
            'kolkata': 'calcutta',
            'calcutta': 'kolkata',
            'chennai': 'madras',
            'madras': 'chennai',
            'thiruvananthapuram': 'trivandrum',
            'trivandrum': 'thiruvananthapuram'
        };

        const variation = cityVariations[detectedCity];
        if (variation) {
            const variationMatch = availableCities.find(city =>
                city.toLowerCase().trim() === variation
            );
            if (variationMatch) {
                return variationMatch;
            }
        }

        return null;
    }

    /**
     * Get location with caching
     */
    async getLocationWithCache() {
        // Check cache
        if (this.cachedLocation && this.cacheTimestamp) {
            const now = Date.now();
            if (now - this.cacheTimestamp < this.CACHE_DURATION) {
                console.log('[Location] Using cached location');
                return this.cachedLocation;
            }
        }

        // Request fresh location
        const coords = await this.requestLocation();
        const locationInfo = await this.reverseGeocode(coords.latitude, coords.longitude);

        // Cache the result
        this.cachedLocation = {
            coords,
            locationInfo
        };
        this.cacheTimestamp = Date.now();

        return this.cachedLocation;
    }

    /**
     * Complete location detection flow
     * Returns matched location data ready for dashboard filters
     */
    async detectAndMatchLocation(dataProcessor) {
        try {
            // Step 1: Check permission
            await this.checkPermissionStatus();

            // Step 2: Request location
            const coords = await this.requestLocation();
            console.log('[Location] GPS coordinates:', coords);

            // Step 3: Reverse geocode
            const locationInfo = await this.reverseGeocode(coords.latitude, coords.longitude);
            console.log('[Location] Location info:', locationInfo);

            // Check if we got basic location data from geocoding
            if (!locationInfo.city) {
                return {
                    success: false,
                    error: 'incomplete_detection',
                    message: 'Unable to detect your city. Please select manually.',
                    detectedLocation: locationInfo
                };
            }

            // Step 4: Match city against database
            const availableCities = dataProcessor.getUniqueValues('city');
            const matchedCity = this.matchLocationToDatabase(locationInfo, availableCities);

            if (!matchedCity) {
                return {
                    success: false,
                    error: 'city_not_available',
                    message: `Service not available in ${locationInfo.city}. Please select from available cities.`,
                    detectedLocation: locationInfo
                };
            }

            // Step 5: Get state for the matched city
            const stateForCity = dataProcessor.getStateForCity(matchedCity);

            // Step 6: Try to match Area and Pincode (OPTIONAL)
            // Get all records for this city
            const cityRecords = dataProcessor.rawData.filter(r => r.city === matchedCity);

            // Try to match area and pincode from detected location
            let matchedArea = 'All';
            let matchedPincode = null;

            // If we have a pincode from geocoding, try to find exact match
            if (locationInfo.pincode && cityRecords.length > 0) {
                const pincodeMatch = cityRecords.find(r =>
                    r.pincode && r.pincode.toString() === locationInfo.pincode.toString()
                );

                if (pincodeMatch) {
                    matchedArea = pincodeMatch.area;
                    matchedPincode = pincodeMatch.pincode;
                    console.log('[Location] Exact pincode match found:', matchedPincode, matchedArea);
                }
            }

            // If no pincode match, try to find closest area based on coordinates
            if (matchedArea === 'All' && cityRecords.length > 0) {
                // Find the closest area by calculating distance
                const closest = this.findClosestArea(coords, cityRecords);

                if (closest) {
                    matchedArea = closest.area;
                    matchedPincode = closest.pincode;
                    console.log('[Location] Closest area match:', matchedArea, matchedPincode);
                }
            }

            // SUCCESS: City matched (area and pincode are optional)
            return {
                success: true,
                location: {
                    state: stateForCity || 'All',
                    city: matchedCity,
                    area: matchedArea,
                    network: 'All',
                    pincode: matchedPincode ? matchedPincode.toString() : null
                },
                detectedLocation: locationInfo,
                coords: coords,
                matchDetails: {
                    city: matchedCity,
                    area: matchedArea,
                    pincode: matchedPincode
                }
            };

        } catch (error) {
            console.error('[Location] Detection failed:', error);

            return {
                success: false,
                error: this.permissionStatus === 'denied' ? 'permission_denied' : 'detection_failed',
                message: this.errorMessage || error.message,
                permissionStatus: this.permissionStatus
            };
        }
    }

    /**
     * Find closest area based on GPS coordinates
     * Uses Haversine formula to calculate distance
     */
    findClosestArea(coords, cityRecords) {
        if (!cityRecords || cityRecords.length === 0) return null;

        let closestRecord = null;
        let minDistance = Infinity;

        cityRecords.forEach(record => {
            if (record.latitude && record.longitude) {
                const distance = this.calculateDistance(
                    coords.latitude,
                    coords.longitude,
                    record.latitude,
                    record.longitude
                );

                if (distance < minDistance) {
                    minDistance = distance;
                    closestRecord = record;
                }
            }
        });

        // Only return if within reasonable distance (e.g., 5km)
        if (closestRecord && minDistance < 5) {
            return closestRecord;
        }

        return null;
    }

    /**
     * Calculate distance between two coordinates using Haversine formula
     * Returns distance in kilometers
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        return distance;
    }

    /**
     * Convert degrees to radians
     */
    toRad(degrees) {
        return degrees * (Math.PI / 180);
    }

    /**
     * Clear cached location
     */
    clearCache() {
        this.cachedLocation = null;
        this.cacheTimestamp = null;
    }

    /**
     * Reset service state
     */
    reset() {
        this.currentLocation = null;
        this.detectionStatus = 'idle';
        this.errorMessage = null;
        this.clearCache();
    }
}

// Create singleton instance
const locationService = new LocationService();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = locationService;
}
