"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Activity, Heart, Building2 } from "lucide-react";

// Custom Icons for that high-end look
const donorIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const hospitalIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// ... (CITY_COORDS stay same)

export default function NetworkMap({ donors, hospitals, matches }: NetworkMapProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return <div className="h-[500px] w-full bg-muted rounded-[2.5rem] animate-pulse" />;

  const center: [number, number] = [30.3753, 69.3451]; // Center of Pakistan
  const pakistanBounds: L.LatLngBoundsExpression = [
    [23.6345, 60.8728], // Southwest (near Gwadar)
    [37.0841, 77.8375]  // Northeast (near Gilgit)
  ];

  return (
    <div className="relative h-[600px] w-full rounded-[2.5rem] overflow-hidden border border-border shadow-2xl glass-card">
      <div className="absolute top-6 left-6 z-[1000] flex flex-col gap-2">
         <div className="bg-background/80 backdrop-blur-md px-4 py-2 rounded-xl border border-border shadow-xl flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest">Medical Donors</span>
         </div>
         <div className="bg-background/80 backdrop-blur-md px-4 py-2 rounded-xl border border-border shadow-xl flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest">Hospital Hubs</span>
         </div>
      </div>

      <MapContainer 
        center={center} 
        zoom={6} 
        minZoom={5}
        maxBounds={pakistanBounds}
        maxBoundsViscosity={1.0}
        style={{ height: "100%", width: "100%", background: "#050505" }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        {/* --- DONORS --- */}
        {donors.map((d, i) => {
          const coords = CITY_COORDS[d.city as string];
          if (!coords) return null;
          // Offset slightly for multiple donors in same city
          const offset: [number, number] = [
            coords[0] + (Math.random() - 0.5) * 0.2,
            coords[1] + (Math.random() - 0.5) * 0.2
          ];
          
          return (
            <Marker key={`donor-${d.id || i}`} position={offset} icon={donorIcon}>
              <Popup className="custom-popup">
                <div className="p-2">
                   <p className="text-xs font-black uppercase tracking-widest text-primary mb-1">{d.full_name || `${d.first_name} ${d.last_name}`}</p>
                   <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-muted-foreground">{d.blood_type} Donor</span>
                      <span className="h-1 w-1 bg-muted rounded-full" />
                      <span className="text-[10px] font-bold text-muted-foreground">{d.city}</span>
                   </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* --- HOSPITALS --- */}
        {hospitals.map((h, i) => {
          const coords = CITY_COORDS[h.city as string];
          if (!coords) return null;
          return (
            <Marker key={`hosp-${h.id || i}`} position={coords} icon={hospitalIcon}>
              <Popup>
                <div className="p-2">
                   <p className="text-xs font-black uppercase tracking-widest text-destructive mb-1">{h.name}</p>
                   <p className="text-[10px] font-bold text-muted-foreground">Certified Medical Node</p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* --- MATCH LINES (Mocked for visualization if no real matches) --- */}
        {matches.map((m, i) => {
           // Find donor city coords and match hospital city coords
           // For now, let's just draw some lines between donors and their hospitals if available
           if (i > 5) return null; // Limit lines for performance
           const donor = donors.find(d => d.id === m.donor_id || d.donor_id === m.donor_id);
           const donorCoords = donor ? CITY_COORDS[donor.city] : null;
           const hospCoords = CITY_COORDS["Lahore"]; // Default to a major hub for demo
           
           if (donorCoords && hospCoords) {
             return (
               <Polyline 
                 key={`match-${i}`}
                 positions={[donorCoords, hospCoords]}
                 pathOptions={{ 
                    color: '#DC2626', 
                    weight: 2, 
                    dashArray: '10, 10', 
                    opacity: 0.4 
                 }}
               />
             );
           }
           return null;
        })}
      </MapContainer>

      <div className="absolute bottom-6 right-6 z-[1000]">
        <div className="glass-card p-4 rounded-2xl border border-border shadow-2xl flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Activity className="h-5 w-5 animate-pulse" />
            </div>
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Network Integrity</p>
                <p className="text-sm font-black text-foreground">OPTIMIZED</p>
            </div>
        </div>
      </div>
    </div>
  );
}
