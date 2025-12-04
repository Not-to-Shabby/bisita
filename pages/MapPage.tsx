
import React, { useState, useEffect, useCallback } from 'react';
import BottomNav from '../components/BottomNav';
import { Search, SlidersHorizontal, Plus, Minus, Navigation, Bus, ArrowLeft, X, Store, ChevronRight, Star, Layers, Clock, Banknote, MapPin, Footprints, Bike, AlertTriangle, Loader2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, LayersControl, useMap, useMapEvents } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import { getMedia } from '../data/mediaLibrary';
import { attractionsApi, MapLocation } from '../services/api';

// Fix for default marker icon in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Iligan Coordinates
const CENTER_LAT = 8.2280;
const CENTER_LNG = 124.2452;
const ILIGAN_BOUNDS: L.LatLngBoundsExpression = [
    [8.10, 124.10],
    [8.30, 124.30]
];

interface LocationData {
    id: string;
    name: string;
    position: [number, number];
    description: string;
    image: string;
    transport?: {
        vehicle: string;
        route: string;
        note: string;
        duration?: string;
        fareRegular?: string;
        fareDiscounted?: string;
        fareHabal?: string;
        segments?: ('Jeepney' | 'Tricycle' | 'Habal-habal' | 'Walk' | 'Bus')[];
    };
}

interface MsmeAd {
    id: string;
    attractionId: string;
    name: string;
    tagline: string;
    image: string;
    rating: number;
    nearLocationIds: string[];
}

// MSME Ads Data - Local businesses promoting near attractions
const msmeAds: MsmeAd[] = [
    {
        id: 'ad-chedings',
        attractionId: '101',
        name: "Cheding's Peanuts",
        tagline: "Iligan's #1 Pasalubong since 1974!",
        image: getMedia('chedingsPeanuts'),
        rating: 4.9,
        nearLocationIds: ['city-proper', 'chedings', 'paseo', 'gohotels']
    },
    {
        id: 'ad-timoga-lechon',
        attractionId: '103',
        name: 'Timoga Lechon House',
        tagline: 'Crispy skin, juicy meat. Best lechon in Iligan!',
        image: getMedia('timogaLechon'),
        rating: 4.7,
        nearLocationIds: ['timoga', 'macaraeg', 'mimbalot', 'maria-cristina']
    },
    {
        id: 'ad-tita-fannies',
        attractionId: '102',
        name: "Tita Fannie's Halang-Halang",
        tagline: 'The spiciest beef soup in the city!',
        image: getMedia('titaFannies'),
        rating: 4.6,
        nearLocationIds: ['city-proper', 'paseo', 'chedings', 'gohotels']
    },
    {
        id: 'ad-gohotels',
        attractionId: '5',
        name: 'Go Hotels Iligan',
        tagline: 'Affordable comfort at Robinsons Place',
        image: getMedia('goHotels'),
        rating: 4.4,
        nearLocationIds: ['gohotels', 'city-proper', 'timoga', 'maria-cristina']
    },
    {
        id: 'ad-tinago-cottages',
        attractionId: '3',
        name: 'Tinago Falls Cottages',
        tagline: 'Rest & refresh after your hike!',
        image: getMedia('tinagoCottages'),
        rating: 4.5,
        nearLocationIds: ['tinago', 'mimbalot', 'maria-cristina']
    }
];

// Curated locations with detailed transport info (used as guides only)
const transportGuides: LocationData[] = [
    {
        id: 'city-proper',
        name: 'Iligan City Proper',
        position: [8.2293, 124.2395],
        description: 'The heart of Iligan City.',
        image: getMedia('cityProper'),
        transport: {
            vehicle: 'Walking / Tricycle',
            route: 'N/A',
            note: 'Central hub. Accessible by all jeepneys.',
            fareRegular: '₱13.00',
            fareDiscounted: '₱11.00',
            duration: '5 mins',
            segments: ['Walk', 'Tricycle']
        }
    },
    {
        id: 'maria-cristina',
        name: 'Maria Cristina Falls',
        position: [8.1836, 124.1919],
        description: 'Standing 320 feet tall, the "Twin Falls" is the primary source of hydroelectric power for Mindanao. It is Iligan\'s most famous landmark, known for its grandeur and historical significance in powering the region\'s industrialization.',
        image: getMedia('mariaCristinaFalls'),
        transport: {
            vehicle: 'Jeepney',
            route: 'Code 1C (Buru-un)',
            note: 'Ride a Buru-un jeep from city proper. Drop off at the crossing to Maria Cristina Falls (Agus Bridge). Take a short walk or habal-habal to the gate.',
            fareRegular: '₱35.00',
            fareDiscounted: '₱28.00',
            duration: '30-45 mins',
            segments: ['Jeepney', 'Walk']
        }
    },
    {
        id: 'tinago',
        name: 'Tinago Falls',
        position: [8.1594, 124.1739],
        description: 'Hidden deep in a ravine with blue-green waters.',
        image: getMedia('tinagoFalls'),
        transport: {
            vehicle: 'Jeepney + Habal-habal',
            route: 'Code 1C (Buru-un)',
            note: 'Ride Buru-un jeep to Buru-un Market/Talipapa. Transfer to a Habal-habal (motorcycle) going to Tinago/Linamon resort entrance.',
            fareRegular: '₱35.00',
            fareDiscounted: '₱28.00',
            fareHabal: 'Negotiated (~₱75/pax)',
            duration: '1 hour',
            segments: ['Jeepney', 'Habal-habal']
        }
    },
    {
        id: 'timoga',
        name: 'Timoga Cold Springs',
        position: [8.1965, 124.1802],
        description: 'Famous roadside cold springs.',
        image: getMedia('timogaSprings'),
        transport: {
            vehicle: 'Jeepney',
            route: 'Code 1C (Buru-un)',
            note: 'Ride Buru-un jeep. Tell driver to drop you at Timoga. Springs are located along the highway.',
            fareRegular: '₱30.00',
            fareDiscounted: '₱24.00',
            duration: '30 mins',
            segments: ['Jeepney']
        }
    },
    {
        id: 'paseo',
        name: 'Paseo de Santiago',
        position: [8.2416, 124.2394],
        description: 'Seaside park with the "Iligan City" sign.',
        image: getMedia('paseoDeSantiago'),
        transport: {
            vehicle: 'Jeepney',
            route: 'Code 1A (Santiago)',
            note: 'Ride a Santiago line jeepney from the city market. It stops directly near the entrance.',
            fareRegular: '₱13.00',
            fareDiscounted: '₱11.00',
            duration: '15 mins',
            segments: ['Jeepney']
        }
    },
    {
        id: 'mimbalot',
        name: 'Mimbalot Falls',
        position: [8.1849, 124.1651],
        description: 'Accessible waterfall with picnic spots.',
        image: getMedia('mimbalotFalls'),
        transport: {
            vehicle: 'Jeepney + Walk',
            route: 'Code 1C (Buru-un)',
            note: 'Ride Buru-un jeep. Drop off at Miguel Canoy Memorial School. Walk 10-15 mins or take a habal-habal inside.',
            fareRegular: '₱35.00',
            fareDiscounted: '₱28.00',
            duration: '40 mins',
            segments: ['Jeepney', 'Walk']
        }
    },
    {
        id: 'macaraeg',
        name: 'Macaraeg-Macapagal House',
        position: [8.1981, 124.1811],
        description: 'Ancestral house of two Philippine Presidents.',
        image: getMedia('macaraegHouse'),
        transport: {
            vehicle: 'Jeepney',
            route: 'Code 1C (Buru-un)',
            note: 'Located along the highway in Timoga. Ask driver to drop you at Macapagal House.',
            fareRegular: '₱30.00',
            fareDiscounted: '₱24.00',
            duration: '30 mins',
            segments: ['Jeepney']
        }
    },
    {
        id: 'chedings',
        name: "Cheding's Peanuts",
        position: [8.2293, 124.2395],
        description: 'Famous pasalubong store.',
        image: getMedia('chedingsPeanuts'),
        transport: {
            vehicle: 'Tricycle / Jeepney',
            route: 'City Proper',
            note: 'Located at Quezon Ave. Accessible by most city jeeps or a short tricycle ride from the plaza.',
            fareRegular: '₱13.00',
            fareDiscounted: '₱11.00',
            duration: '10 mins',
            segments: ['Tricycle']
        }
    },
    {
        id: 'gohotels',
        name: "Go Hotels Iligan",
        position: [8.2187, 124.2406],
        description: 'Located at Robinsons Place Iligan.',
        image: getMedia('goHotels'),
        transport: {
            vehicle: 'Jeepney',
            route: 'Code 1C / Tubod',
            note: 'Ride a jeep going to Tubod or Buru-un. Get off at Robinsons Place.',
            fareRegular: '₱13.00',
            fareDiscounted: '₱11.00',
            duration: '20 mins',
            segments: ['Jeepney']
        }
    }
];

const normalizeName = (value: string): string =>
    value
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

const guideLookup = transportGuides.reduce<Record<string, LocationData>>((acc, guide) => {
    const slug = normalizeName(guide.name);
    acc[slug] = guide;
    return acc;
}, {});

const guidePositions = transportGuides.reduce<Record<string, [number, number]>>((acc, guide) => {
    const slug = normalizeName(guide.name);
    acc[slug] = guide.position;
    return acc;
}, {});

const guideAliases: Record<string, string> = {
    'paseo-de-santiago-park': 'paseo-de-santiago',
    'paseo-de-santiago-seaside-park': 'paseo-de-santiago',
    'paseo-de-santiago-iligan': 'paseo-de-santiago',
    'paseo-santiago': 'paseo-de-santiago',
    'paseo-santiago-iligan': 'paseo-de-santiago',
    'tinago-falls-iligan': 'tinago-falls',
    'maria-cristina-falls-power-plant': 'maria-cristina-falls',
};

const coordinateOverrides: Record<string, [number, number]> = {
    'paseo-de-santiago-park': guidePositions['paseo-de-santiago'],
    'paseo-de-santiago-seaside-park': guidePositions['paseo-de-santiago'],
    'paseo-de-santiago-iligan': guidePositions['paseo-de-santiago'],
    'paseo-de-santiago': guidePositions['paseo-de-santiago'],
    'paseo-santiago': guidePositions['paseo-de-santiago'],
    'paseo-santiago-iligan': guidePositions['paseo-de-santiago'],
};

const findGuideForSpot = (rawSlug: string, name: string): LocationData | undefined => {
    const directSlug = guideAliases[rawSlug] || rawSlug;
    const directGuide = guideLookup[directSlug];
    if (directGuide) {
        return directGuide;
    }

    const fuzzyMatch = transportGuides.find((guide) => {
        const guideSlug = normalizeName(guide.name);
        return guideSlug.includes(rawSlug) || rawSlug.includes(guideSlug) ||
            guide.name.toLowerCase().includes(name.toLowerCase()) ||
            name.toLowerCase().includes(guide.name.toLowerCase());
    });

    return fuzzyMatch;
};

const mergeWithTransportGuides = (spots: LocationData[]): LocationData[] => {
    return spots.map((spot) => {
        const rawSlug = normalizeName(spot.name);
        const guide = findGuideForSpot(rawSlug, spot.name);

        if (!guide) {
            return spot;
        }

        return {
            ...spot,
            id: guide.id,
            name: guide.name,
            description: guide.description || spot.description,
            image: guide.image || spot.image,
            position: coordinateOverrides[rawSlug] || coordinateOverrides[normalizeName(guide.name)] || spot.position,
            transport: guide.transport,
        };
    });
};

const OVERPASS_ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter'
];

// Helper to fetch dynamic places from OpenStreetMap (Overpass API)
const fetchDynamicPlaces = async (): Promise<LocationData[]> => {
    const query = `
        [out:json][timeout:60];
        (
          node["tourism"~"attraction|viewpoint|museum|hotel|picnic_site"](8.10,124.10,8.30,124.30);
                    node["amenity"="restaurant"](8.10,124.10,8.30,124.30);
        );
        out body;
    `;

    for (const endpoint of OVERPASS_ENDPOINTS) {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'Accept': 'application/json'
                },
                body: new URLSearchParams({ data: query })
            });

            const rawPayload = await response.text();

            try {
                const data = JSON.parse(rawPayload);
                if (!Array.isArray(data.elements)) {
                    console.warn(`Overpass responded without elements at ${endpoint}`);
                    continue;
                }

                const mapped: LocationData[] = data.elements
                    .map((element: any) => ({
                        id: `osm-${element.id}`,
                        name: element.tags?.name || 'Unnamed Spot',
                        position: [element.lat, element.lon],
                        description: element.tags?.description || `A ${element.tags?.tourism?.replace('_', ' ')} discovered on the map.`,
                        image: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=150&q=80',
                    }))
                    .filter((loc) => loc.name !== 'Unnamed Spot');

                if (mapped.length > 0) {
                    return mapped;
                }
            } catch (parseError) {
                console.error(`Failed to parse Overpass response from ${endpoint}:`, rawPayload.substring(0, 120));
            }
        } catch (networkError) {
            console.error(`Overpass request failed (${endpoint}):`, networkError);
        }
    }

    throw new Error('All Overpass endpoints failed or returned invalid data.');
};

// Inner component to access Leaflet map instance
const MapController: React.FC = () => {
    const map = useMap();
    const [isSatellite, setIsSatellite] = useState(false);

    const handleLocate = () => {
        map.locate().on("locationfound", function (e) {
            map.flyTo(e.latlng, map.getZoom());
        });
    };

    return (
        <>
            <TileLayer
                attribution='&copy; Google Maps'
                url={isSatellite 
                    ? "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" 
                    : "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                }
                maxZoom={20}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 z-[400] flex flex-col gap-3">
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden flex flex-col">
                    <button 
                        onClick={(e) => { e.stopPropagation(); map.zoomIn(); }} 
                        className="p-3 hover:bg-gray-50 border-b border-gray-100 text-slate-700 focus:bg-gray-100"
                        aria-label="Zoom in"
                    >
                        <Plus size={20} />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); map.zoomOut(); }} 
                        className="p-3 hover:bg-gray-50 text-slate-700 focus:bg-gray-100"
                        aria-label="Zoom out"
                    >
                        <Minus size={20} />
                    </button>
                </div>

                <button 
                    onClick={(e) => { e.stopPropagation(); setIsSatellite(!isSatellite); }}
                    className={`p-3 rounded-xl shadow-lg border border-gray-100 focus:bg-gray-100 transition-colors ${isSatellite ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-slate-700 hover:bg-gray-50'}`}
                    aria-label="Toggle Map Layer"
                >
                    <Layers size={20} />
                </button>

                <button 
                    onClick={(e) => { e.stopPropagation(); handleLocate(); }}
                    className="bg-white p-3 rounded-xl shadow-lg border border-gray-100 hover:bg-gray-50 text-sky-600 focus:bg-gray-100"
                    aria-label="My Location"
                >
                    <Navigation size={20} />
                </button>
            </div>
        </>
    );
};

// Component to track map center and find nearest location
interface MapEventHandlerProps {
    locations: LocationData[];
    onNearestLocationChange: (locationId: string) => void;
}

const MapEventHandler: React.FC<MapEventHandlerProps> = ({ locations, onNearestLocationChange }) => {
    const map = useMapEvents({
        moveend: () => {
            const center = map.getCenter();
            const nearestLocation = findNearestLocation(center.lat, center.lng);
            onNearestLocationChange(nearestLocation);
        },
    });

    const findNearestLocation = (lat: number, lng: number): string => {
        let nearestId = 'city-proper';
        let minDistance = Infinity;

        locations.forEach((loc) => {
            const distance = Math.sqrt(
                Math.pow(loc.position[0] - lat, 2) + Math.pow(loc.position[1] - lng, 2)
            );
            if (distance < minDistance) {
                minDistance = distance;
                nearestId = loc.id;
            }
        });

        return nearestId;
    };

    return null;
};

// MSME Ad Banner Component
interface MsmeAdBannerProps {
    nearestLocationId: string;
    onDismiss: () => void;
    onAdClick: (attractionId: string) => void;
}

const MsmeAdBanner: React.FC<MsmeAdBannerProps> = ({ nearestLocationId, onDismiss, onAdClick }) => {
    const [currentAdIndex, setCurrentAdIndex] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);

    // Filter ads relevant to the current location
    const relevantAds = msmeAds.filter(ad => ad.nearLocationIds.includes(nearestLocationId));
    
    // Fallback to all ads if no relevant ads found
    const displayAds = relevantAds.length > 0 ? relevantAds : msmeAds;

    // Safety check: Ensure index is within bounds immediately during render
    // This prevents the crash when switching from a long list to a short list
    const safeIndex = currentAdIndex < displayAds.length ? currentAdIndex : 0;
    const currentAd = displayAds[safeIndex];

    // Auto-rotate carousel every 5 seconds
    useEffect(() => {
        if (displayAds.length <= 1) return;

        const interval = setInterval(() => {
            setIsTransitioning(true);
            setTimeout(() => {
                setCurrentAdIndex((prev) => (prev + 1) % displayAds.length);
                setIsTransitioning(false);
            }, 300);
        }, 5000);

        return () => clearInterval(interval);
    }, [displayAds.length]);

    // Reset index when ads change
    useEffect(() => {
        setCurrentAdIndex(0);
    }, [nearestLocationId]);

    if (!currentAd) return null;

    const handleAdClick = () => {
        onAdClick(currentAd.attractionId);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            handleAdClick();
        }
    };

    return (
        <div className="w-full px-4 pb-2 z-[450] md:fixed md:bottom-24 md:right-4 md:w-96 md:p-0 animate-sheet-rise">
            <div className="bg-white rounded-xl shadow-lg p-3 relative border border-gray-100">
                {/* Close Button */}
                <button 
                    onClick={(e) => { e.stopPropagation(); onDismiss(); }}
                    className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-10"
                    aria-label="Dismiss ad banner"
                >
                    <X size={16} />
                </button>

                {/* Ad Content */}
                <div 
                    onClick={handleAdClick}
                    onKeyDown={handleKeyDown}
                    role="button"
                    tabIndex={0}
                    aria-label={`Visit ${currentAd.name}`}
                    className={`flex gap-3 cursor-pointer transition-all ${isTransitioning ? 'opacity-0 translate-x-2' : 'opacity-100 translate-x-0'}`}
                >
                    {/* Image */}
                    <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                        <img 
                            src={currentAd.image} 
                            alt={currentAd.name}
                            className="w-full h-full object-cover"
                            crossOrigin="anonymous"
                            referrerPolicy="no-referrer"
                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://picsum.photos/100/100?shop' }}
                        />
                    </div>

                    {/* Text Content */}
                    <div className="flex flex-col justify-center flex-1 min-w-0 pr-6">
                        <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wide mb-0.5">MSME Spotlight</span>
                        <h4 className="font-bold text-slate-900 text-sm truncate leading-tight mb-0.5">{currentAd.name}</h4>
                        <p className="text-xs text-slate-500 truncate mb-1.5">{currentAd.tagline}</p>
                        
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                                <Star size={12} className="text-yellow-400 fill-yellow-400" />
                                <span className="text-xs font-bold text-slate-700">{currentAd.rating}</span>
                            </div>
                            <span className="text-xs font-bold text-sky-600 hover:underline">View Shop</span>
                        </div>
                    </div>
                </div>
                
                {/* Carousel Indicators (Optional, kept subtle) */}
                {displayAds.length > 1 && (
                    <div className="absolute bottom-2 right-3 flex gap-1">
                        {displayAds.map((_, idx) => (
                            <div 
                                key={idx} 
                                className={`w-1 h-1 rounded-full transition-colors ${idx === currentAdIndex ? 'bg-sky-500' : 'bg-gray-300'}`}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// Location Detail Sheet Component
interface LocationDetailSheetProps {
    location: LocationData;
    onClose: () => void;
    onNavigate: () => void;
}

const LocationDetailSheet: React.FC<LocationDetailSheetProps> = ({ location, onClose, onNavigate }) => {
    const [activeTab, setActiveTab] = useState<'transport' | 'details' | 'reviews'>('transport');

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-[500] animate-sheet-rise max-h-[85vh] overflow-y-auto pb-24 md:pb-6 md:w-96 md:left-auto md:right-4 md:bottom-4 md:rounded-2xl">
            {/* Drag Handle (Mobile Visual Cue) */}
            <div className="w-full flex justify-center pt-3 pb-1 md:hidden">
                <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
            </div>

            {/* Header */}
            <div className="px-6 pt-4 pb-2 flex justify-between items-start">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">{location.name}</h2>
                    <div className="flex items-center gap-1 text-slate-500 text-sm mt-1">
                        <MapPin size={14} />
                        <span>{location.description.substring(0, 30)}...</span>
                    </div>
                </div>
                <button 
                    onClick={onClose}
                    className="p-2 bg-gray-100 rounded-full text-slate-500 hover:bg-gray-200 transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 px-6 mt-2">
                <button 
                    onClick={() => setActiveTab('transport')}
                    className={`pb-3 px-2 text-sm font-bold transition-colors relative ${activeTab === 'transport' ? 'text-sky-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Transport
                    {activeTab === 'transport' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-600 rounded-t-full" />}
                </button>
                <button 
                    onClick={() => setActiveTab('details')}
                    className={`pb-3 px-2 text-sm font-bold transition-colors relative ${activeTab === 'details' ? 'text-sky-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Details
                    {activeTab === 'details' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-600 rounded-t-full" />}
                </button>
                <button 
                    onClick={() => setActiveTab('reviews')}
                    className={`pb-3 px-2 text-sm font-bold transition-colors relative ${activeTab === 'reviews' ? 'text-sky-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Reviews
                    {activeTab === 'reviews' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-600 rounded-t-full" />}
                </button>
            </div>

            {/* Content */}
            <div className="p-6">
                {activeTab === 'transport' && (
                    <div className="space-y-5">
                        {location.transport ? (
                            <>
                                {/* Visual Path Segments */}
                                {location.transport.segments && (
                                    <div className="flex items-center justify-center gap-2 py-2">
                                        {location.transport.segments.map((segment, index) => (
                                            <React.Fragment key={index}>
                                                <div className="flex flex-col items-center gap-1.5">
                                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-md ${
                                                        segment === 'Walk' ? 'bg-emerald-500' : 
                                                        segment === 'Habal-habal' ? 'bg-orange-500' : 
                                                        segment === 'Tricycle' ? 'bg-yellow-500' : 'bg-sky-600'
                                                    }`}>
                                                        {segment === 'Walk' ? <Footprints size={20} /> : 
                                                         segment === 'Habal-habal' ? <Bike size={20} /> :
                                                         segment === 'Tricycle' ? <Bike size={20} /> : <Bus size={20} />}
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">{segment}</span>
                                                </div>
                                                {index < location.transport.segments!.length - 1 && (
                                                    <div className="h-0.5 w-6 bg-gray-200 rounded-full mb-5"></div>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                )}

                                {/* Transport Details Card */}
                                <div className="bg-sky-50 rounded-xl p-4 border border-sky-100">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Bus size={16} className="text-sky-700" />
                                        <p className="text-xs font-bold text-sky-800 uppercase tracking-wide">Transport Details</p>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        {/* Fare Breakdown */}
                                        <div className="bg-white p-3 rounded-lg border border-sky-100 shadow-sm">
                                            <div className="flex items-center gap-2 text-slate-400 mb-2 pb-2 border-b border-gray-50">
                                                <Banknote size={14} />
                                                <span className="text-[10px] font-bold uppercase">Estimated Fare</span>
                                            </div>
                                            <div className="space-y-2">
                                                {location.transport.fareRegular && (
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs text-slate-500 font-medium">Regular</span>
                                                        <span className="font-bold text-slate-900 text-sm">{location.transport.fareRegular}</span>
                                                    </div>
                                                )}
                                                {location.transport.fareDiscounted && (
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs text-slate-500 font-medium">Student / PWD / Senior</span>
                                                        <span className="font-bold text-emerald-600 text-sm">{location.transport.fareDiscounted}</span>
                                                    </div>
                                                )}
                                                {location.transport.fareHabal && (
                                                    <div className="flex justify-between items-center pt-2 mt-1 border-t border-dashed border-gray-100">
                                                        <span className="text-xs text-slate-500 font-medium">Habal-habal</span>
                                                        <span className="font-bold text-orange-600 text-xs text-right">{location.transport.fareHabal}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Duration */}
                                        <div className="bg-white p-3 rounded-lg border border-sky-100 shadow-sm flex justify-between items-center">
                                            <div className="flex items-center gap-2 text-slate-400">
                                                <Clock size={14} />
                                                <span className="text-[10px] font-bold uppercase">Travel Time</span>
                                            </div>
                                            <p className="font-bold text-slate-900 text-sm">{location.transport.duration || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Route Steps */}
                                <div>
                                    <h3 className="font-bold text-slate-900 mb-3 text-sm">Step-by-Step Guide</h3>
                                    <div className="relative pl-4 border-l-2 border-gray-100 space-y-6">
                                        <div className="relative">
                                            <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-sky-600 border-2 border-white shadow-sm"></div>
                                            <p className="text-sm text-slate-900 font-medium">Start from City Proper</p>
                                            <p className="text-xs text-slate-500 mt-0.5">Find a jeepney with code <span className="font-bold text-slate-700">{location.transport.route}</span></p>
                                        </div>
                                        <div className="relative">
                                            <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-gray-300 border-2 border-white shadow-sm"></div>
                                            <p className="text-sm text-slate-900 font-medium">Follow the route</p>
                                            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{location.transport.note}</p>
                                        </div>
                                        <div className="relative">
                                            <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow-sm"></div>
                                            <p className="text-sm text-slate-900 font-medium">Arrive at Destination</p>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
                                    <Bus size={20} />
                                </div>
                                <h3 className="font-bold text-slate-900 mb-1">No Transport Guide</h3>
                                <p className="text-sm text-slate-500 px-6">We don't have specific commute details for this location yet.</p>
                            </div>
                        )}

                        <button 
                            onClick={onNavigate}
                            className="w-full bg-sky-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-sky-200 active:scale-95 transition-transform flex items-center justify-center gap-2"
                        >
                            <Navigation size={18} />
                            Start Navigation
                        </button>
                    </div>
                )}

                {activeTab === 'details' && (
                    <div className="space-y-4">
                        <p className="text-slate-600 leading-relaxed text-sm">{location.description}</p>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <h4 className="font-bold text-slate-900 text-sm mb-2">About this place</h4>
                            <ul className="space-y-2">
                                <li className="flex items-center gap-2 text-sm text-slate-600">
                                    <div className="w-1.5 h-1.5 rounded-full bg-sky-500"></div>
                                    Family Friendly
                                </li>
                                <li className="flex items-center gap-2 text-sm text-slate-600">
                                    <div className="w-1.5 h-1.5 rounded-full bg-sky-500"></div>
                                    Parking Available
                                </li>
                                <li className="flex items-center gap-2 text-sm text-slate-600">
                                    <div className="w-1.5 h-1.5 rounded-full bg-sky-500"></div>
                                    Food Stalls Nearby
                                </li>
                            </ul>
                        </div>
                    </div>
                )}

                {activeTab === 'reviews' && (
                    <div className="text-center py-8">
                        <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Star size={24} className="text-gray-300" />
                        </div>
                        <p className="text-slate-500 font-medium">No reviews yet</p>
                        <button className="text-sky-600 text-sm font-bold mt-2 hover:underline">Be the first to review</button>
                    </div>
                )}
            </div>
        </div>
    );
};

const MapPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [nearestLocationId, setNearestLocationId] = useState('city-proper');
  const [isAdBannerDismissed, setIsAdBannerDismissed] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [osmError, setOsmError] = useState<string | null>(null);
  const [isOsmErrorDismissed, setIsOsmErrorDismissed] = useState(false);

  useEffect(() => {
      let isMounted = true;

      const loadLocations = async () => {
          // First, try to fetch from our backend API
          try {
              const apiResponse = await attractionsApi.getMapLocations();
              
              if (apiResponse.data?.locations && apiResponse.data.locations.length > 0) {
                  // Transform API response to LocationData format
                  const apiLocations: LocationData[] = apiResponse.data.locations.map((loc: MapLocation) => ({
                      id: loc.id,
                      name: loc.name,
                      position: [loc.lat, loc.lng] as [number, number],
                      description: loc.description || `A ${loc.category.toLowerCase()} in Iligan.`,
                      image: getMedia(loc.id as any) || 'https://picsum.photos/400/300?travel',
                      transport: loc.transport && loc.transport.length > 0 ? {
                          vehicle: loc.transport[0].mode,
                          route: loc.transport[0].description,
                          note: loc.transport[0].tips || '',
                          fareRegular: loc.transport[0].fare,
                          duration: loc.transport[0].travelTime,
                          segments: loc.transport.map(t => t.mode as 'Jeepney' | 'Tricycle' | 'Habal-habal' | 'Walk' | 'Bus'),
                      } : undefined,
                  }));

                  // Merge with static transport guides for enhanced info
                  const merged = mergeWithTransportGuides(apiLocations);
                  if (isMounted) {
                      setLocations(merged.length > 0 ? merged : apiLocations);
                      setOsmError(null);
                  }
                  return;
              }
          } catch (apiError) {
              console.log('Backend API unavailable, trying OSM...');
          }

          // Fallback to OpenStreetMap
          try {
              const dynamicSpots = await fetchDynamicPlaces();
              if (!isMounted) return;
              const merged = mergeWithTransportGuides(dynamicSpots);
              if (merged.length === 0) {
                  setLocations(mergeWithTransportGuides(transportGuides));
                  setOsmError('Live map data is unavailable at the moment. Showing curated guides instead.');
              } else {
                  setLocations(merged);
                  setOsmError(null);
              }
          } catch (error) {
              console.error('Failed to load dynamic locations:', error);
              if (isMounted) {
                  setLocations(mergeWithTransportGuides(transportGuides));
                  setOsmError('Live map data is unavailable at the moment. Showing curated guides instead.');
              }
          } finally {
              if (isMounted) {
                  setIsLoading(false);
              }
          }
      };

      loadLocations();

      return () => {
          isMounted = false;
      };
  }, []);

    useEffect(() => {
        if (osmError) {
            setIsOsmErrorDismissed(false);
        }
    }, [osmError]);

  const handleNearestLocationChange = useCallback((locationId: string) => {
    setNearestLocationId(locationId);
  }, []);

  const handleAdDismiss = useCallback(() => {
    setIsAdBannerDismissed(true);
  }, []);

    const handleDismissOsmError = useCallback(() => {
        setIsOsmErrorDismissed(true);
    }, []);

    const handleAdClick = useCallback((attractionId: string) => {
    // Find the location data for this attraction if it exists in our map locations
    const location = locations.find(loc => loc.id === attractionId);
    if (location) {
        setSelectedLocation(location);
    } else {
        // Fallback to navigation if it's not on the map (e.g. just a detail page)
        navigate(`/attraction/${attractionId}`);
    }
    }, [navigate, locations]);

  const handleCloseDetail = useCallback(() => {
    setSelectedLocation(null);
  }, []);

  const handleNavigate = useCallback(() => {
    if (selectedLocation) {
        // Open external maps
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedLocation.position[0]},${selectedLocation.position[1]}`, '_blank');
    }
  }, [selectedLocation]);

  return (
    <div className="h-screen w-full relative bg-gray-100 flex flex-col">
       {/* CSS to ensure popup visibility and correct control positioning */}
             <style>{`
                 .leaflet-popup { z-index: 1000 !important; }
                 .leaflet-container { font-family: inherit; }
                 .custom-popup .leaflet-popup-content-wrapper { border-radius: 12px; }
             `}</style>

             {isLoading && (
                 <div className="absolute inset-0 z-[550] flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm">
                     <div className="w-20 h-20 rounded-full bg-sky-50 border border-sky-100 flex items-center justify-center shadow-lg animate-float-pulse">
                                 <Navigation size={28} className="text-sky-600" />
                         </div>
                         <p className="mt-4 text-slate-600 font-semibold tracking-tight">Fetching Iligan spots…</p>
                         <p className="text-xs text-slate-400">Powered by OpenStreetMap</p>
                 </div>
             )}

       {/* Floating Search & Header Controls */}
       {!isSearchOpen ? (
         <>
            {/* Back Button */}
                        <div className="absolute top-6 left-4 z-[400] animate-fade-slide-up">
                                 <button 
                                     onClick={() => navigate(-1)} 
                                     className="bg-white p-3 rounded-full shadow-md text-slate-700 hover:bg-gray-50 border border-gray-100 transition-transform active:scale-95"
                                 >
                                         <ArrowLeft size={20} />
                                 </button>
            </div>
            {/* Search Toggle Button */}
                        <div className="absolute top-6 right-4 z-[400] animate-fade-slide-up motion-delay-100">
                                 <button 
                                     onClick={() => setIsSearchOpen(true)} 
                                     className="bg-white p-3 rounded-full shadow-md text-sky-600 hover:bg-gray-50 border border-gray-100 transition-transform active:scale-95"
                                 >
                                         <Search size={20} />
                                 </button>
            </div>
         </>
       ) : (
         /* Expanded Search Bar */
                 <div className="absolute top-6 left-4 right-4 z-[400] animate-fade-slide-up">
                     <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-2 flex items-center gap-3">
              <button 
                onClick={() => setIsSearchOpen(false)} 
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-slate-500"
              >
                 <ArrowLeft size={20} />
              </button>
              <Search size={20} className="text-gray-400" />
              <input 
                  type="text" 
                  autoFocus
                  placeholder="Search destination..." 
                  className="flex-1 outline-none text-sm text-slate-800 placeholder:text-slate-400 h-10 bg-transparent"
              />
              <button 
                onClick={() => alert("Filters coming soon!")}
                className="p-2 bg-gray-50 rounded-lg text-slate-600 hover:bg-gray-100"
              >
                  <SlidersHorizontal size={18} />
              </button>
           </div>
         </div>
       )}

            {osmError && !isOsmErrorDismissed && (
                <div className="absolute top-24 left-4 right-4 z-[420] animate-fade-slide-up">
                     <div className="bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 shadow-lg flex items-start gap-3">
                         <div className="bg-white/70 w-8 h-8 rounded-full flex items-center justify-center text-orange-600">
                             <AlertTriangle size={18} />
                         </div>
                         <div className="flex-1 text-sm text-orange-800">
                             <p className="font-semibold">Offline transport guide</p>
                             <p className="text-xs leading-relaxed mt-1">{osmError}</p>
                         </div>
                         <button
                             onClick={handleDismissOsmError}
                             aria-label="Dismiss offline notice"
                             className="text-[10px] font-bold uppercase tracking-wide text-orange-700 hover:text-orange-900"
                         >
                             Dismiss
                         </button>
                     </div>
                 </div>
            )}

       <div className="flex-1 relative z-0">
          <MapContainer 
            center={[CENTER_LAT, CENTER_LNG]} 
            zoom={13} 
            zoomControl={false} 
            style={{ height: '100%', width: '100%' }}
                        minZoom={12}
                        maxBounds={ILIGAN_BOUNDS}
                        maxBoundsViscosity={1}
                        whenCreated={(mapInstance) => mapInstance.fitBounds(ILIGAN_BOUNDS)}
            preferCanvas={true} 
            wheelDebounceTime={150} 
          >
            
            {locations.map((loc) => {
                const initial = loc.name.charAt(0).toUpperCase() || 'B';
                const iconHtml = `
                    <div class="w-12 h-12 rounded-full border-2 border-white shadow-lg bg-gradient-to-br from-sky-500 via-sky-600 to-sky-700 flex items-center justify-center animate-marker-pop">
                        <span class="text-white font-bold text-lg">${initial}</span>
                    </div>
                `;

                return (
                    <Marker 
                        key={loc.id} 
                        position={loc.position}
                        icon={L.divIcon({
                            className: 'custom-marker',
                            html: iconHtml,
                            iconSize: [48, 48],
                            iconAnchor: [24, 24]
                        })}
                        eventHandlers={{
                            click: () => setSelectedLocation(loc)
                        }}
                    />
                );
            })}

            <MapEventHandler locations={locations} onNearestLocationChange={handleNearestLocationChange} />
            <MapController />

          </MapContainer>
       </div>

       {/* Location Detail Sheet - Replaces Ad Banner when active */}
       {selectedLocation && (
           <LocationDetailSheet 
               location={selectedLocation} 
               onClose={handleCloseDetail}
               onNavigate={handleNavigate}
           />
       )}

       {/* MSME Ad Banner - Only show if no location is selected */}
       {!isAdBannerDismissed && !selectedLocation && (
           <MsmeAdBanner 
               nearestLocationId={nearestLocationId}
               onDismiss={handleAdDismiss}
               onAdClick={handleAdClick}
           />
       )}

       <BottomNav className="relative w-full" />
    </div>
  );
};

export default MapPage;
