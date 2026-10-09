// Clean light map style: hide standard Google POIs/transit
export const LIGHT_MAP_STYLE = [
  { featureType: 'poi', elementType: 'all', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

// Premium dark map style matching Telegram Dark theme
export const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#18222D' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8E9AA8' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#131B24' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#D1D5DB' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#22303F' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#17222D' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9CA3AF' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2E3F52' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1C2733' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0F1720' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#51657D' }] },
];
