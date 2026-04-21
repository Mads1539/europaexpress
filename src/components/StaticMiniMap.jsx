// src/components/StaticMiniMap.jsx
import React, { useEffect, useRef } from 'react';

export const StaticMiniMap = ({ currentCityPos, destinations, color }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    if (!window.L || !mapRef.current) return;
    const L = window.L;

    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        touchZoom: false,
        doubleClickZoom: false,
        zoomSnap: 0.1,
      });
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      ).addTo(mapInstance.current);
    }

    const map = mapInstance.current;
    map.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker) map.removeLayer(layer);
    });

    L.circleMarker(currentCityPos, {
      radius: 5,
      fillColor: "#ffffff",
      color: "#000",
      weight: 2,
      fillOpacity: 1,
    }).addTo(map);

    const markers = [];
    destinations.forEach((d) => {
      L.circleMarker(d.pos, {
        radius: 4,
        fillColor: color,
        color: "#ffffff",
        weight: 1,
        fillOpacity: 0.8,
      }).addTo(map);
      markers.push(L.latLng(d.pos));
    });

    if (markers.length > 0) {
      const bounds = L.latLngBounds([currentCityPos, ...markers]);
      map.fitBounds(bounds, { padding: [15, 15], animate: false });
    } else {
      map.setView(currentCityPos, 11);
    }
  }, [currentCityPos, destinations, color]);

  // H-full gør at kortet strækker sig i hele kolonnens højde
  return (
    <div
      ref={mapRef}
      className="w-full h-full min-h-[200px] rounded-2xl border border-white/10 z-0 pointer-events-none shadow-inner"
    />
  );
};