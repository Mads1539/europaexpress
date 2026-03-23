import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore, doc, setDoc, onSnapshot, updateDoc, getDoc
} from 'firebase/firestore';
import {
  getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged
} from 'firebase/auth';
import {
  Plane, Train, Bus, MapPin, Clock, Globe, Navigation,
  LogOut, Sun, Moon, Settings, FastForward, Play, Pause, RotateCcw, Users, ChevronRight,
  User, CheckCircle2, Ticket, AlertTriangle, XCircle, Info, Trophy, Flag, Activity
} from 'lucide-react';
import { COUNTRY_DATA } from './data/countries.js'; // Use relative path


// =========================================================================
// 1. DATA-PROCESSERING (Klargøring af lande, byer og linjer)
// =========================================================================

// Henter alle lande fra data-fil
const allCountries = Object.values(COUNTRY_DATA);

// Samler alle byer i ét stort opslagsværk (CITIES)
const CITIES = Object.values(COUNTRY_DATA).reduce((acc, country) => {
  return { ...acc, ...country.cities };
}, {});

// Samler alle transportlinjer (togskinner, busruter osv.) i én liste
const TRANSIT_LINES = Object.values(COUNTRY_DATA).reduce((acc, country) => {
  return [...acc, ...country.lines];
}, []);

// --- NY: Samler alle styles ---
const CATEGORY_STYLE = Object.values(COUNTRY_DATA).reduce((acc, country) => {
  return { ...acc, ...country.styles };
}, {});


// =========================================================================
// 2. FIREBASE SETUP (Forbindelsen til din database)
// =========================================================================


const firebaseConfig = {
  apiKey: "AIzaSyDFWsF1feRKK13KLWSzSTmftu5v8VXSrRk",
  authDomain: "europa-express-9eedf.firebaseapp.com",
  projectId: "europa-express-9eedf",
  storageBucket: "europa-express-9eedf.firebasestorage.app",
  messagingSenderId: "349243075315",
  appId: "1:349243075315:web:3c0a6155b4875ffcfd2586",
  measurementId: "G-Y44TZV7BVQ"
};

// Tænder for forbindelsen til Google Firebase
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const appId = 'europa-express-9eedf';




// =========================================================================
// 3. KONSTANTER & STYLING (Priser, ikoner og udseende)
// =========================================================================


// Her styrer du hvad det koster at rejse og hvor lang tid det tager per stop
const TRAVEL_TYPES = {
  "bus": { speed: 70, baseCost: 20, costPerKm: 0.5, icon: Bus, label: "Bus", prefix: "FLX" },
  "train": { speed: 150, baseCost: 100, costPerKm: 1.2, icon: Train, label: "Tog", prefix: "IC" },
  "flight": { speed: 800, baseCost: 500, costPerKm: 0.2, icon: Plane, label: "Fly", prefix: "SK" },
  "ferry": { speed: 30, baseCost: 150, costPerKm: 1.5, icon: Globe, label: "Færge", prefix: "LINE" }
};


// Liste over Hændelser
const INCIDENT_TYPES = [
{ type: 'train', label: 'Væltet træ på skinnerne', icon: Train },
{ type: 'train', label: 'Signalfejl', icon: Train },
{ type: 'bus', label: 'Vejspærring på motorvejen', icon: Bus },
{ type: 'bus', label: 'Mangel på chauffører', icon: Bus },
{ type: 'flight', label: 'Strejke i lufthavnen', icon: Plane },
{ type: 'flight', label: 'Sikkerhedsbrud', icon: Plane },
{ type: 'ferry', label: 'Høj søgang / Storm', icon: Globe },
{ type: 'ferry', label: 'Tekniske problemer med rampen', icon: Globe },
];

// De avatars det er muligt at vælge
const AVATARS = ["👨🏼‍💼", "👩🏼‍💼", "👨🏼‍✈️", "👩🏼‍✈️", "👨🏼‍🚀", "👩🏼‍🚀"];

// Hvor mange minutter man holder stille i en by
const STOP_DURATION = 2;


// =========================================================================
// 4. HJÆLPE-ALGORITMER (Afstand og Rutesøgning)
// =========================================================================

const calculateDistance = (p1, p2) => {
  if (!p1 || !p2) return 0;
  const R = 6371;
  const dLat = (p2[0] - p1[0]) * Math.PI / 180;
  const dLon = (p2[1] - p1[1]) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
  Math.cos(p1[0] * Math.PI / 180) * Math.cos(p2[0] * Math.PI / 180) *
  Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};


const fetchOSRMRoute = async (startPos, endPos, mode = 'driving') => {
  const profile = mode === 'walking' ? 'foot' : 'driving';
  const url = `https://router.project-osrm.org/route/v1/${profile}/${startPos[1]},${startPos[0]};${endPos[1]},${endPos[0]}?overview=full&geometries=polyline`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    return data.code === 'Ok' ? {
      path: data.routes[0].geometry,
      distance: data.routes[0].distance / 1000,
      duration: data.routes[0].duration / 60
    } : null;
  } catch (err) {
    return null;
  }
};


const getNearbyStations = (cityName) => {
  const city = CITIES[cityName];
  if (!city) return [];
  return Object.entries(CITIES)
  .map(([name, data]) => ({ name, ...data, dist: calculateDistance(city.pos, data.pos) }))
  .filter(s => s.name !== cityName && s.dist <= 50)
  .sort((a, b) => a.dist - b.dist);
};


// Beregner luftlinje-afstanden mellem to byer
const getDist = (pos1, pos2) => {
  if (!pos1 || !pos2) return 999999;
  const lat1 = pos1[0];
  const lon1 = pos1[1];
  const lat2 = pos2[0];
  const lon2 = pos2[1];

  // En simpel tilnærmelse til afstand i kilometer
  const R = 6371; // Jordens radius i km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
  Math.sin(dLat/2) * Math.sin(dLat/2) +
  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};


const calculateStopInfo = (dep, targetStop, startCity) => {
  const line = TRANSIT_LINES.find(l => l.name === dep.lineName);
  if (!line) return { price: 0, duration: 0, route: [] };

  const startIndex = line.cities.indexOf(startCity);
  const stopIndex = line.cities.indexOf(targetStop);

  // Find ud af om vi skal læse by-listen forfra eller bagfra
  const isForward = stopIndex > startIndex;
  const route = isForward
  ? line.cities.slice(startIndex, stopIndex + 1)
  : line.cities.slice(stopIndex, startIndex + 1).reverse();

  let dist = 0;
  for (let i = 0; i < route.length - 1; i++) {
    const p1 = CITIES[route[i]]?.pos;
    const p2 = CITIES[route[i+1]]?.pos;
    if (p1 && p2) dist += getDist(p1, p2);
  }

  const config = TRAVEL_TYPES[dep.type] || TRAVEL_TYPES.bus;
  const duration = (dist / config.speed) * 60;
  const price = Math.round(config.baseCost + (dist * config.costPerKm));

  return { price, duration, route };
};


// "Hjernen" der finder den korteste vej fra by til by via togskinner/veje
const findPath = (startCity, endCity, transportMode) => {
  const adjacency = {};

  // 1. FILTRERING: Kig kun på de linjer, der matcher transportmidlet
  const validLines = TRANSIT_LINES.filter(line => line.type === transportMode);

  // 2. BYG NETVÆRKET: Lav forbindelserne mellem byerne
  validLines.forEach(line => {
    if (line.cities && line.cities.length > 1) {
      for (let i = 0; i < line.cities.length - 1; i++) {
        const u = line.cities[i];
        const v = line.cities[i+1];
        if (u && v) {
          if (!adjacency[u]) adjacency[u] = new Set();
          if (!adjacency[v]) adjacency[v] = new Set();
          adjacency[u].add(v);
          adjacency[v].add(u);
        }
      }
    }
  });

  // 3. SØG EFTER VEJ (BFS)
  const queue = [startCity];
  const visited = { [startCity]: null };

  while (queue.length > 0) {
    const curr = queue.shift();

    if (curr === endCity) {
      const path = [];
      let temp = endCity;
      while (temp !== null) {
        path.unshift(temp);
        temp = visited[temp];
      }
      return path;
    }

    if (adjacency[curr]) {
      for (const neighbor of adjacency[curr]) {
        if (!(neighbor in visited)) {
          visited[neighbor] = curr;
          queue.push(neighbor);
        }
      }
    }
  }

  return null;
};
const StaticMiniMap = ({ currentCityPos, destinations, color }) => {
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
        zoomSnap: 0.1
      });
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(mapInstance.current);
    }

    const map = mapInstance.current;
    map.eachLayer(layer => {
      if (layer instanceof L.CircleMarker) map.removeLayer(layer);
    });

      L.circleMarker(currentCityPos, {
        radius: 5,
        fillColor: '#ffffff',
        color: '#000',
        weight: 2,
        fillOpacity: 1
      }).addTo(map);

      const markers = [];
      destinations.forEach(d => {
        L.circleMarker(d.pos, {
          radius: 4,
          fillColor: color,
          color: '#ffffff',
          weight: 1,
          fillOpacity: 0.8
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
  return <div ref={mapRef} className="w-full h-full min-h-[200px] rounded-2xl border border-white/10 z-0 pointer-events-none shadow-inner" />;
};

// =========================================================================
// 5. HOVEDKOMPONENTEN (App)
// =========================================================================


export default function App() {
  // --- States (Appens hukommelse) ---
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [playerColor, setPlayerColor] = useState('#3b82f6');
  const [playerAvatar, setPlayerAvatar] = useState(AVATARS[0]);
  const [roomCode, setRoomCode] = useState('');
  const [view, setView] = useState('menu');
  const [leafletReady, setLeafletReady] = useState(false);
  const [interpolatedTime, setInterpolatedTime] = useState(0);
  const [debugOpen, setDebugOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('train');
  const [playerTab, setPlayerTab] = useState('departures');
  const [selectedDeparture, setSelectedDeparture] = useState(null);
  const [localTransportMode, setLocalTransportMode] = useState(null); // 'walking', 'taxi' eller null
  const ticketScrollRef = useRef(null);
  const currentStopRef = useRef(null);
  const requestRef = useRef();
  const [departedBuffer, setDepartedBuffer] = useState([]);

  // --- Refs (Hukommelse der ikke genstarter skærmen ved ændring) ---
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const dayLayerRef = useRef(null);
  const nightLayerRef = useRef(null);
  const markersRef = useRef({});
  const incidentMarkersRef = useRef({});
  const goalMarkerRef = useRef(null);
  const gameStateRef = useRef(null);
  const lastUpdateRef = useRef({ serverTime: 0, localTime: Date.now() });




  // =========================================================================
  // 6. EFFECTS (Ting der sker automatisk i baggrunden)
  // =========================================================================


  const currentPlayer = gameState?.players?.find(p => p.id === user.uid);

  // --- A. TIDSSYNKRONISERING ---
  // Denne blok sørger for, at uret tikker jævnt mellem server-opdateringer

  useEffect(() => {
    if (gameState?.gameTime !== gameStateRef.current?.gameTime) {
      lastUpdateRef.current = { serverTime: gameState?.gameTime || 0, localTime: Date.now() };
    }
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    // Sætter browserens top-bar farve til sort/slate-950
    const meta = document.createElement('meta');
    meta.name = "theme-color";
    meta.content = "#020617"; // Matcher din bg-slate-950
    document.getElementsByTagName('head')[0].appendChild(meta);

    // Bonus: Forhindrer "pull-to-refresh" som ofte laver hvide glimt
    document.body.style.overscrollBehavior = 'none';
  }, []);


  // --- Effekt: Centrer det aktuelle stop i billetten ---
  useEffect(() => {
    if (currentPlayer?.isTraveling && ticketScrollRef.current && currentStopRef.current) {
      const container = ticketScrollRef.current;
      const stopElement = currentStopRef.current;

      // Beregn centerpositionen
      const containerWidth = container.offsetWidth;
      const stopOffsetLeft = stopElement.offsetLeft;
      const stopWidth = stopElement.offsetWidth;

      // Scroll containeren så stopElement er i midten
      container.scrollTo({
        left: stopOffsetLeft - containerWidth / 2 + stopWidth / 2,
        behavior: 'smooth' // Gør bevægelsen flydende
      });
    }
  }, [interpolatedTime, currentPlayer?.isTraveling, currentPlayer?.segments]);


  useEffect(() => {
    const updateInterpolation = () => {
      if (gameState?.status === 'playing' && gameState?.timeSpeed > 0) {
        // Vi tager server-tiden og lægger den tid til, der er gået siden sidst (lokalt)
        const now = Date.now();
        const lastUpdate = lastUpdateRef.current.localTime;
        const elapsedSeconds = (now - lastUpdate) / 1000;

        // timeSpeed er minutter pr. sekund (f.eks. 0.5)
        const additionalMinutes = elapsedSeconds * gameState.timeSpeed;
        setInterpolatedTime((gameState.gameTime + additionalMinutes) % 1440);
      } else if (gameState) {
        setInterpolatedTime(gameState.gameTime || 420);
      }
      requestRef.current = requestAnimationFrame(updateInterpolation);
    };

    requestRef.current = requestAnimationFrame(updateInterpolation);
    return () => cancelAnimationFrame(requestRef.current);
  }, [gameState]);

  const handleLocalTravel = async (targetCityName, mode) => {
    console.log("Tryk registreret:", targetCityName, mode); // Tjek om denne dukker op i F12

    if (!user || !gameState) return;
    const me = gameState.players.find(p => p.id === user.uid);
    if (!me || me.isTraveling) return;

    const startPos = CITIES[me.currentCity].pos;
    const endPos = CITIES[targetCityName].pos;
    const profile = mode === 'walking' ? 'foot' : 'driving';

    try {
      const res = await fetch(`https://router.project-osrm.org/route/v1/${profile}/${startPos[1]},${startPos[0]};${endPos[1]},${endPos[0]}?overview=full&geometries=polyline`);
      const data = await res.json();

      if (data.code !== 'Ok') return alert("Kunne ikke finde vej!");

      const route = data.routes[0];
      const dist = route.distance / 1000;
      const duration = route.duration / 60;
      const cost = mode === 'taxi' ? Math.round(50 + dist * 15) : 0;

      if (me.money < cost) return alert("Ikke nok penge!");

      // DYNAMISK STI: Vi bruger gameState.code hvis den findes, ellers 'GLOBAL'
      const docId = gameState.code || 'GLOBAL';
      const sessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', docId);

      console.log("Opdaterer Firebase på sti:", docId);

      await setDoc(sessionRef, {
        players: gameState.players.map(p => p.id === user.uid ? {
          ...p,
          isTraveling: true,
          destinationCity: targetCityName,
          travelType: mode,
          money: p.money - cost,
          segments: [{
            from: me.currentCity,
            to: targetCityName,
            departure: gameState.gameTime,
            arrival: gameState.gameTime + Math.ceil(duration),
                                       path: route.geometry
          }]
        } : p)
      }, { merge: true });

    } catch (err) {
      console.error("FEJL I REJSE:", err);
    }
  };


  // --- B. LOGIN & INDLÆSNING AF KORT-BIBLIOTEK ---
  // Sørger for at du er logget ind og at "Leaflet" (kortet) er klar til brug

  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);

    if (!window.L) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => setLeafletReady(true);
      document.head.appendChild(script);
    } else {
      setLeafletReady(true);
    }
    return () => unsubscribe();
  }, []);




  // --- C. KORT-OPBYGNING ---
  useEffect(() => {
    if (!leafletReady || !mapRef.current || (gameState?.status !== 'playing' && gameState?.status !== 'finished')) return;
    const L = window.L;
    if (!L) return;

    if (!mapInstance.current) {
      // 1. Skab kortet
      mapInstance.current = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([56.0, 11.0], 7);

      const handleZoom = () => {
        const currentZoom = mapInstance.current.getZoom();
        const container = mapRef.current;
        if (!container) return;

        // Vi bruger kun 3 tilstande nu: Skjult -> Navn -> Udfoldet
        container.classList.remove('hide-route-labels', 'state-name', 'state-expanded');

        if (currentZoom < 7) {
          container.classList.add('hide-route-labels');
        } else if (currentZoom >= 7 && currentZoom < 11) {
          container.classList.add('state-name');
        } else {
          container.classList.add('state-expanded');
        }
      };
      mapInstance.current.on('zoomend', handleZoom);
      // Kør den med det samme for at sætte start-tilstanden
      setTimeout(handleZoom, 100);

      // 2. Lag
      nightLayerRef.current = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { zIndex: 1 }).addTo(mapInstance.current);
      dayLayerRef.current = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png', { zIndex: 2, opacity: 1 }).addTo(mapInstance.current);

      // 3. Opsaml data
      const segmentUsage = {};
      const terminusData = {};

      // --- 1. TEGN ALLE BYER SOM SMÅ HVIDE PRIKKER ---
      Object.entries(CITIES).forEach(([cityName, cityData]) => {
        if (!cityData.pos) return;
        window.L.circleMarker(cityData.pos, {
          radius: 1.5,
          fillColor: "#ffffff",
          color: "#000",
          weight: 0.5,
          fillOpacity: 0.8,
          interactive: true
        })
        .addTo(mapInstance.current)
        .bindTooltip(cityName, {
          direction: 'top',
          className: 'small-station-tooltip',
          offset: [0, -2]
        });
      });

      // --- 2. TEGN MÅLFLAG (🏁) ---
      if (currentPlayer?.destination && CITIES[currentPlayer.destination]) {
        const destPos = CITIES[currentPlayer.destination].pos;

        // Rød aura
        window.L.circleMarker(destPos, {
          radius: 12,
          color: '#ef4444',
          weight: 2,
          fillOpacity: 0.2,
          className: 'animate-pulse'
        }).addTo(mapInstance.current);

        // Emoji Flag
        window.L.marker(destPos, {
          icon: window.L.divIcon({
            html: `<div style="font-size: 22px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">🏁</div>`,
                                 className: 'destination-marker',
                                 iconSize: [24, 24],
                                 iconAnchor: [12, 12]
          }),
          zIndexOffset: 1000
        })
        .addTo(mapInstance.current)
        .bindTooltip(`DIT MÅL: ${currentPlayer.destination}`, {
          permanent: true,
          direction: 'right',
          offset: [12, 0]
        });
      }

      TRANSIT_LINES.forEach(line => {
        if (line.type === 'bus' || line.type === 'flight') return;

        const points = line.path || line.cities.filter(c => CITIES[c]).map(c => CITIES[c].pos);
        if (points.length < 2) return;

        // Tegn selve ruten
        const routeKey = [...line.cities].sort().join('-');
        segmentUsage[routeKey] = (segmentUsage[routeKey] || 0) + 1;
        L.polyline(points, {
          color: line.color,
          weight: 5,
          opacity: 0.6,
          lineJoin: 'round'
        }).addTo(mapInstance.current);

        // Registrer byer og tegn små stationer
        line.cities.forEach((cityName, index) => {
          const cityData = CITIES[cityName];
          if (!cityData) return;

          const isStartOrEnd = index === 0 || index === line.cities.length - 1;
          const isMajor = isStartOrEnd || cityData.hub || cityData.airport || cityData.ferry || gameState.goalCity === cityName;

          // --- NYT: Tegn de små stationer som prikker i rutens farve ---
          if (!isMajor) {
            L.circleMarker(cityData.pos, {
              radius: 3,
              fillColor: line.color,
              color: "#000",
              weight: 1,
              fillOpacity: 0.8,
              interactive: true
            })
            .addTo(mapInstance.current)
            .bindTooltip(cityName, {
              direction: 'top',
              className: 'small-station-tooltip',
              offset: [0, -5]
            });
          }

          // --- Registrer data til de store labels (Terminus/Hubs) ---
          if (isMajor) {
            if (!terminusData[cityName]) {
              terminusData[cityName] = { pos: cityData.pos, routes: [], city: cityData };
            }

            const addRouteDirection = (toCity) => {
              if (!toCity) return;
              const directionKey = `${line.name}-${toCity}`;
              if (!terminusData[cityName].routes.find(r => r.key === directionKey)) {
                terminusData[cityName].routes.push({
                  key: directionKey,
                  name: line.name,
                  color: line.color,
                  to: toCity
                });
              }
            };

            if (index === 0) {
              addRouteDirection(line.cities[line.cities.length - 1]);
            } else if (index === line.cities.length - 1) {
              addRouteDirection(line.cities[0]);
            } else {
              addRouteDirection(line.cities[0]);
              addRouteDirection(line.cities[line.cities.length - 1]);
            }
          }
        });
      });

      // 4. Tegn de store interaktive labels (Terminus/Hubs)
      // 4. Tegn interaktive labels OG PULSERENDE AURA
      Object.entries(terminusData).forEach(([cityName, data]) => {
        const marker = L.circleMarker(data.pos, {
          radius: 6,
          fillColor: "#ffffff",
          color: "#0f172a",
          weight: 2,
          fillOpacity: 1,
          className: 'station-marker-pulse' // Her tilføjes animationen
        }).addTo(mapInstance.current);

        // Vi kan også farve selve kanten af prikken med rutens farve for mere effekt
        if (data.routes.length > 0) {
          marker.setStyle({ color: data.routes[0].color });
        }

        marker.on('click', () => {
          setSelectedCity({
            name: cityName,
            routes: data.routes,
            city: data.city
          });
        });
      });
    }
  }, [leafletReady, role, gameState?.status, gameState?.goalCity, setSelectedCity]);




  // =========================================================================
  // 6.2 KORT-OPDATERINGER (Hændelser, Dag/Nat og Bevægelse)
  // =========================================================================


  // --- A. VEJARBEJDE & HÆNDELSER (🚧) ---
  // Holder styr på at tegne og fjerne gule skilte på kortet

  useEffect(() => {
    if (!mapInstance.current || !gameState?.incidents) return;
    const L = window.L;


    // Fjern gamle ikoner der ikke længere er i databasen

    Object.keys(incidentMarkersRef.current).forEach(id => {
      if (!gameState.incidents.find(inc => inc.id === id)) {
        mapInstance.current.removeLayer(incidentMarkersRef.current[id]);
        delete incidentMarkersRef.current[id];
      }
    });


    // Tegn nye ikoner for hændelser

    gameState.incidents.forEach(inc => {
      if (!incidentMarkersRef.current[inc.id] && CITIES[inc.city]) {
        const markerHtml = `
        <div style="width:16px; height:16px; display:flex; align-items:center; justify-content:center; color:#ef4444; font-weight:900; font-size:14px; text-shadow:0 0 4px #fff">
        🚧
        </div>
        `;
        const icon = L.divIcon({ className: 'incident-marker', html: markerHtml, iconSize: [16, 16] });
        incidentMarkersRef.current[inc.id] = L.marker(CITIES[inc.city].pos, { icon, zIndexOffset: 2000 })
        .addTo(mapInstance.current)
        .bindTooltip(`${inc.label} i ${inc.city}`, { direction: 'bottom' });
      }
    });
  }, [gameState?.incidents]);



  // --- B. DAG/NAT EFFEKT ---
  // Gør kortet mørkere eller lysere baseret på spillets klokkeslæt


  useEffect(() => {
    if (!dayLayerRef.current) return;
    const hour = interpolatedTime / 60;


    // En lille formel der regner ud om det er lyst eller mørkt
    // Lyst mellem 07-20, overgang (solopgang/nedgang) i timerne omkring

    let opacity = (hour >= 7 && hour < 20) ? 1 : (hour >= 6 && hour < 7) ? hour - 6 : (hour >= 20 && hour < 21) ? 1 - (hour - 20) : 0;
    dayLayerRef.current.setOpacity(opacity);
  }, [interpolatedTime]);


  // --- C. SPILLER-BEVÆGELSE (Opdateret med JSON-support og flere stop) ---
  useEffect(() => {
    if (!mapInstance.current || !gameState?.players) return;

    gameState.players.forEach(p => {
      let pos = CITIES[p.currentCity]?.pos || [50, 10];

      // Tjek om spilleren rejser og har rutesegmenter
      if (p.isTraveling && p.segments && p.segments?.length > 0) {

        // 1. Find det aktuelle segment baseret på interpolatedTime
        let currentSeg = p.segments?.find(s =>
        interpolatedTime >= s.departure && interpolatedTime <= s.arrival
        );

        // 2. Fallback: Hvis vi er ved et stop (mellem to segmenter), find det sidste afsluttede segment
        if (!currentSeg) {
          const lastFinished = [...p.segments].reverse().find(s => interpolatedTime > s.arrival);
          if (lastFinished) {
            pos = CITIES[lastFinished.to]?.pos;
          } else {
            pos = CITIES[p.segments?.[0]?.from]?.pos; // Tilføj punktum efter spørgsmålstegnet
          }
        } else {
          // 3. Beregn positionen i det aktuelle segment
          const prog = Math.max(0, Math.min(1, (interpolatedTime - currentSeg.departure) / (currentSeg.arrival - currentSeg.departure)));

          let finalPath = null;

          // --- NY LOGIK: Håndtering af pathData (JSON-streng) eller path (Array) ---
          if (currentSeg.pathData) {
            try {
              finalPath = JSON.parse(currentSeg.pathData);
            } catch (e) {
              console.error("Kunne ikke parse pathData", e);
            }
          } else if (currentSeg.path) {
            // Hvis det er gemt som råt array (f.eks. ved lokale test eller gamle data)
            const rawPath = currentSeg.path;
            if (typeof rawPath === 'string') {
              // Google Polyline decoding fallback
              const decodePolyline = (str) => {
                let index = 0, lat = 0, lng = 0, coordinates = [], shift = 0, result = 0, byte = null, lat_change, lng_change;
                while (index < str.length) {
                  byte = null; shift = 0; result = 0;
                  do { byte = str.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
                  lat_change = ((result & 1) ? ~(result >> 1) : (result >> 1)); lat += lat_change;
                  byte = null; shift = 0; result = 0;
                  do { byte = str.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
                  lng_change = ((result & 1) ? ~(result >> 1) : (result >> 1)); lng += lng_change;
                  coordinates.push([lat / 1e5, lng / 1e5]);
                }
                return coordinates;
              };
              finalPath = decodePolyline(rawPath);
            } else {
              finalPath = rawPath;
            }
          }

          // Interpolation langs stien
          if (finalPath && finalPath.length > 1) {
            const numSegments = finalPath.length - 1;
            const subProg = prog * numSegments;
            const idx = Math.floor(subProg);
            const segmentProg = subProg - idx;
            const p1 = finalPath[idx];
            const p2 = finalPath[idx + 1] || p1;
            pos = [p1[0] + (p2[0] - p1[0]) * segmentProg, p1[1] + (p2[1] - p1[1]) * segmentProg];
          } else {
            // Lineær interpolation hvis ingen sti findes
            const s = CITIES[currentSeg.from]?.pos || pos;
            const e = CITIES[currentSeg.to]?.pos || pos;
            pos = [s[0] + (e[0] - s[0]) * prog, s[1] + (e[1] - s[1]) * prog];
          }
        }
      }

      // Tegn eller opdater markøren på kortet
      const avatarDisplay = p.avatar || (p.name ? p.name[0].toUpperCase() : '?');
      const playerColor = p.color || '#3b82f6';

    const iconHtml = `
    <div style="background: ${playerColor}; width: 30px; height: 30px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 15px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; font-size: 18px; line-height: 1; transition: background 0.3s ease;">
    ${avatarDisplay}
    </div>
    `;

    if (markersRef.current[p.id]) {
      markersRef.current[p.id].setLatLng(pos);
      markersRef.current[p.id].setIcon(window.L.divIcon({ html: iconHtml, className: '', iconSize: [30, 30], iconAnchor: [15, 15] }));
    } else {
      markersRef.current[p.id] = window.L.marker(pos, {
        icon: window.L.divIcon({ html: iconHtml, className: '', iconSize: [30, 30], iconAnchor: [15, 15] })
      }).addTo(mapInstance.current);
    }
    });
  }, [interpolatedTime, gameState?.players]);


  // SIKRER AT SPILLEREN ANKOMMER SELVOM HOST ER LAGGY ELLER OFFLINE
  useEffect(() => {
    // Tilføj et tjek for om gameState overhovedet er klar
    if (role === 'player' && currentPlayer?.isTraveling && currentPlayer?.segments?.length > 0 && gameState?.status === 'playing') {
      const finalArrival = currentPlayer.segments[currentPlayer.segments.length - 1].arrival;

      // Øg bufferen til 5 minutter, så den ikke trigger ved små lag,
      // og tjek at interpolatedTime faktisk er et validt tal
      if (typeof interpolatedTime === 'number' && interpolatedTime > finalArrival + 5) {
        console.log("Host reagerer ikke - afslutter rejse lokalt");
        const sessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', gameState.code);

        updateDoc(sessionRef, {
          players: gameState.players.map(p =>
          p.id === user.uid ? {
            ...p,
            isTraveling: false,
            currentCity: p.destinationCity,
            segments: null,
            travelType: null
          } : p
          )
        });
      }
    }
  }, [interpolatedTime, currentPlayer?.isTraveling, role, gameState?.status]);

  // =========================================================================
  // 6.3 HOST-LOOPET (Spillets "Hjerte" - kører kun for værten)
  // =========================================================================


  useEffect(() => {
    let tick;

    // Vi starter kun uret, hvis man er host, og spillet er i gang

    if (role === 'host' && gameState?.status === 'playing' && (gameState?.timeSpeed || 0) > 0) {

      tick = setInterval(async () => {
        const cur = gameStateRef.current;
        if (!cur) return;


        // --- 1. TIDEN GÅR ---
        // Vi lægger tidshastigheden til den nuværende tid (f.eks. 1.2 minutter per sekund)
        // % 1440 sørger for, at uret starter forfra ved midnat

        const nextTime = (cur.gameTime + (cur.timeSpeed * 5)) % 1440;


        let newIncidents = [...(cur.incidents || [])];
        let newLogs = [...(cur.logs || [])];
        let winnerFound = null;

        // --- 2. HVER TIME (Tjek for hændelser) ---
        const oldHour = Math.floor(cur.gameTime / 60);
        const newHour = Math.floor(nextTime / 60);

        if (oldHour !== newHour) {
          // Fjern hændelser der er udløbet
          newIncidents = newIncidents.filter(inc => inc.clearTime > Date.now());
          // 25% chance for at der sker noget nyt hver time (væltet træ, strejke osv.)
          if (Math.random() < 0.25) {
            const cityNames = Object.keys(CITIES);
            const randomCity = cityNames[Math.floor(Math.random() * cityNames.length)];
            const randomType = INCIDENT_TYPES[Math.floor(Math.random() * INCIDENT_TYPES.length)];

            // Hvor længe varer det? (mellem 0.5 og 3 dage)
            const durationDays = 0.5 + Math.random() * 2.5;
            const newIncident = {
              id: Math.random().toString(36).substr(2, 9),
                         city: randomCity,
                         label: randomType.label,
                         type: randomType.type,
                         startTime: Date.now(),
                         clearTime: Date.now() + (durationDays * 24 * 60 * 60 * 1000)
            };

            // Tilføj besked til loggen
            newIncidents.push(newIncident);
            newLogs.unshift({ time: nextTime, message: `BREAKING: ${newIncident.label} rapporteret i ${newIncident.city}!`, type: 'incident' });
          }
        }


        // --- 3. ANKOMST-TJEK (Find dette i dit host-loop) ---
        const players = cur.players.map(p => {
          if (p.isTraveling && p.segments && p.segments?.length > 0) {
            const finalArrival = p.segments?.[p.segments?.length - 1]?.arrival;

            // FIX: Vi tjekker om spiltiden er nået ELLER passeret ankomst
            // Vi bruger en buffer på 0.1 for at undgå afrundingsfejl
            if (nextTime >= (finalArrival - 0.1)) {
              if (p.destinationCity === cur.goalCity) winnerFound = p;
              return {
                ...p,
                isTraveling: false,
                currentCity: p.destinationCity,
                segments: null,
                travelType: null
              };
            }
          }
          return p;
        });


        // --- 4. OPDATER DATABASEN (Send de nye data op) ---
        // Gem kun de 50 nyeste beskeder
        const updatePayload = {
          gameTime: nextTime,
          players,
          incidents: newIncidents,
          logs: newLogs.slice(0, 50),
                         lastUpdateWallTime: Date.now() // Fortæller de andre spillere, hvornår uret sidst blev sat
        };

        // Hvis der er en vinder, stopper vi spillet her
        if (winnerFound) {
          updatePayload.status = 'finished';
          updatePayload.winner = winnerFound;
        }

        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', cur.code), updatePayload);

      },  5000); // Vi opdaterer kun serveren hvert 5. sekund for at spare kvote
    }
    return () => clearInterval(tick); // Stop uret hvis komponenten lukker

  }, [role, gameState?.status, gameState?.timeSpeed]);




  // =========================================================================
  // 7. SPIL-LOGIK (Start, Join, Rejs)
  // =========================================================================


  const startHost = async () => {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', code), {
      code, status: 'lobby', players: [], gameTime: 420, timeSpeed: 0.5, hostId: user.uid, incidents: [], logs: []
    });
    setRoomCode(code); setRole('host'); listen(code);
  };

  const startJoin = async () => {
    // Vi har fjernet useState herfra, da den skal ligge øverst i komponenten

    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', roomCode);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const players = snap.data().players || [];

      // Tjek om spilleren allerede er med
      if (!players.find(p => p.id === user.uid)) {
        players.push({
          id: user.uid,
          name: playerName || "Rejsende",
          avatar: playerAvatar,
          color: playerColor,
          currentCity: "København", // Eller din startby
          money: 5000,
          isTraveling: false,
          history: [], // <--- TILFØJ DENNE LINJE
          lastUpdate: Date.now()
        });

        await updateDoc(ref, { players });
      }

      setRole('player');
      listen(roomCode);
    } else {
      alert("Koden findes ikke!");
    }
  };

  const initGame = async () => {
    if (!gameState) return;

    const cities = Object.keys(CITIES);
    const startCity = cities[Math.floor(Math.random() * cities.length)];
    let goalCity = cities[Math.floor(Math.random() * cities.length)];
    while (goalCity === startCity) goalCity = cities[Math.floor(Math.random() * cities.length)];

    // Her sørger vi for at bevare alle spiller-egenskaber (inkl. farve og avatar)
    const players = gameState.players.map(p => ({
      ...p,
      currentCity: startCity
    }));

    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', gameState.code), {
      status: 'playing',
      players,
      startCity,
      goalCity,
      logs: [{
        time: gameState.gameTime || 420,
        message: `Løbet starter! Find vej til ${goalCity}.`,
        type: 'info'
      }]
    });
  };

  const listen = (code) => {
    // Hvis der allerede er en lytter, så stop den først
    if (window.unsubscribeGame) window.unsubscribeGame();

    const unsub = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', code), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setGameState(data);
      }
    }, (error) => {
      if (error.code === 'resource-exhausted') {
        console.error("Firebase kvote er brugt op!");
      }
    });

    window.unsubscribeGame = unsub;
    return unsub;
  };

  const travel = async (dep) => {
    const me = gameState.players.find(p => p.id === user.uid);
    if (!me || me.isTraveling || me.money < dep.cost) return;

    const segments = [];
    let startTime = dep.time;

    // 1. FIND DEN RIGTIGE LINJE (Selvom mange hedder "RE")
    // Vi prioriterer: 1. Navn + Byer, 2. Kun Navn, 3. Fallback objekt
    const lineData = TRANSIT_LINES.find(l =>
    l.name === dep.lineName &&
    l.cities?.includes(dep.route[0]) &&
    l.cities?.includes(dep.route[dep.route.length - 1])
    ) || TRANSIT_LINES.find(l => l.name === dep.lineName) || {
      id: dep.lineName || "RE",
      path: [],
      color: '#64748b'
    };

    // 2. BEREGN SEGMENTER
    for (let i = 0; i < dep.route.length - 1; i++) {
      const fromCity = dep.route[i];
      const toCity = dep.route[i + 1];
      const pos1 = CITIES[fromCity]?.pos;
      const pos2 = CITIES[toCity]?.pos;

      if (!pos1 || !pos2) continue;

      let segmentPath = [pos1, pos2];

      // Find path i den valgte linje (med tolerance for koordinater)
      if (lineData.path && lineData.path.length > 0) {
        const idx1 = lineData.path.findIndex(p => p && Math.abs(p[0] - pos1[0]) < 0.001 && Math.abs(p[1] - pos1[1]) < 0.001);
        const idx2 = lineData.path.findIndex(p => p && Math.abs(p[0] - pos2[0]) < 0.001 && Math.abs(p[1] - pos2[1]) < 0.001);

        if (idx1 !== -1 && idx2 !== -1) {
          segmentPath = idx1 < idx2
          ? lineData.path.slice(idx1, idx2 + 1)
          : lineData.path.slice(idx2, idx1 + 1).reverse();
        }
      }

      const dist = getDist(pos1, pos2);
      const config = TRAVEL_TYPES[dep.type] || TRAVEL_TYPES.train || { speed: 80 };
      const duration = (dist / config.speed) * 60;

      segments.push({
        from: fromCity,
        to: toCity,
        departure: Number(startTime),
                    arrival: Number(startTime + duration),
                    pathData: JSON.stringify(segmentPath),
                    // Vi sikrer os at lineId er en streng og aldrig undefined
                    lineId: String(lineData.id || lineData.name || dep.lineName || "RE")
      });

      startTime += duration + STOP_DURATION;
    }

    // 3. OPDATER FIREBASE (Atomic Update)
    try {
      const sessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', gameState.code);

      const newHistoryItem = {
        type: dep.type || 'train',
        from: me.currentCity,
        to: dep.destination,
        line: dep.lineName || 'RE',
        time: Number(gameState.gameTime)
      };

      const updatedPlayers = gameState.players.map(p =>
      p.id === user.uid ? {
        ...p,
        isTraveling: true,
        destinationCity: dep.destination,
        segments: segments,
        money: Number(p.money - dep.cost),
                                                   lastTicketPrice: Number(dep.cost),
                                                   travelType: dep.type,
                                                   history: [...(p.history || []), newHistoryItem]
      } : p
      );

      await updateDoc(sessionRef, { players: updatedPlayers });

    } catch (error) {
      console.error("KRITISK FEJL i travel:", error);
    }
  };
  const handleStepOffNextStation = async () => {
    if (!currentPlayer || !currentPlayer.segments) return;
    // Find det nuværende eller næste segment
    const currentSegIdx = currentPlayer.segments?.findIndex(s => interpolatedTime <= s.arrival);
    if (currentSegIdx === -1) return;

    // Afkort rejsen til at slutte ved næste stop
    const newSegments = currentPlayer.segments?.slice(0, currentSegIdx + 1);
    const nextCity = newSegments[currentSegIdx].to;

    const sessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', gameState.code);
    await updateDoc(sessionRef, {
      players: gameState.players.map(p => p.id === user.uid ? {
        ...p,
        destinationCity: nextCity,
        segments: newSegments
      } : p)
    });
  };

  const formatTime = (t) => {
    const hours = Math.floor(t / 60) % 24;
    const minutes = Math.round(t % 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  // Hjælpefunktion: Haversine-formel til at beregne km mellem to koordinater
  const getDist = (pos1, pos2) => {
    if (!pos1 || !pos2) return 0;
    const R = 6371; // Jordens radius i km
    const dLat = (pos2[0] - pos1[0]) * Math.PI / 180;
    const dLon = (pos2[1] - pos1[1]) * Math.PI / 180;
    const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(pos1[0] * Math.PI / 180) * Math.cos(pos2[0] * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };
  const departures = React.useMemo(() => {
    const me = gameState?.players?.find(p => p.id === user.uid);
    if (!me || me.isTraveling) return [];

    const list = [];
    const now = gameState.gameTime;

    TRANSIT_LINES.forEach(line => {
      if (line.type !== activeTab) return;
      const myIndex = line.cities.indexOf(me.currentCity);
      if (myIndex === -1) return;

      const directions = [
        { destinations: line.cities.slice(myIndex + 1), label: "mod " + line.cities[line.cities.length - 1] },
                          { destinations: line.cities.slice(0, myIndex).reverse(), label: "mod " + line.cities[0] }
      ];

      const currentStyle = CATEGORY_STYLE[line.category] ||
      CATEGORY_STYLE[line.name] ||
      { label: line.name.slice(0, 2), color: line.color || "#64748b" };

      directions.forEach((dir, dirIndex) => {
        if (dir.destinations.length === 0) return;

        const finalGoal = dir.destinations[dir.destinations.length - 1];
        const gap = 1440 / (line.frequency || 1);
        const directionOffset = dirIndex === 1 ? gap / 2 : 0;
        let nextDep = (line.firstDeparture || 0) + directionOffset;

        while (nextDep <= now) nextDep += gap;

        // GÅ ET SKRIDT TILBAGE for at fange den afgang, der LIGE er kørt
        nextDep -= gap;

        for (let i = 0; i < 9; i++) { // Vi tager 9 med for at have plads til den afgåede
          const baseTime = nextDep + (i * gap);

          // ÆNDRET: Vi tillader tog der er op til 1 minut gamle (så vi kan se dem som "AFGÅET")
          if (baseTime < now - 1) continue;
          if (baseTime >= 1440) break;

          const seedStr = line.name + baseTime + finalGoal;
          let hash = 0;
          for (let j = 0; j < seedStr.length; j++) {
            hash = ((hash << 5) - hash) + seedStr.charCodeAt(j);
            hash |= 0;
          }
          const r = Math.abs(hash);

          const isCancelled = (r % 100) < (line.cancelRisk || 3);
          let delay = 0;
          if ((r % 100) < (line.delayRisk || 15)) {
            delay = (r % 40) + 5;
          }

          const actualTime = baseTime + delay;

          list.push({
            id: `${line.name}-${baseTime}-${dirIndex}`,
            lineName: line.name,
            category: line.category,
            destination: finalGoal,
            directionLabel: dir.label,
            allStops: dir.destinations,
            time: baseTime,
            actualTime: actualTime,
            delay: delay,
            isCancelled: isCancelled,
            type: line.type,
            style: currentStyle,
            isDeparted: actualTime < now // Markér hvis det ER kørt
          });
        }
      });
    });

    // SORTERING
    const sorted = list.sort((a, b) => a.actualTime - b.actualTime);

    // BUNDLING LOGIK:
    // Find de tog der er afgået
    const departedNow = sorted.filter(d => d.isDeparted);

    if (departedNow.length > 0) {
      // Her kan du lave en useEffect eller trigger til at tælle op til 10
      // Men for at holde din liste stabil NU, så returnerer vi kun de IKKE-afgåede
      // og gemmer de afgåede i din "departedBuffer" state.
    }

    // Returnér kun fremtidige tog til hovedlisten
    return sorted.filter(d => !d.isDeparted);
  }, [gameState, activeTab, user?.uid]);


  // =========================================================================
  // 8. BRUGERFLADE (JSX - Det du ser på skærmen)
  // =========================================================================



  // --- A. LOADING SKÆRM ---

  if (!user) return <div className="h-screen bg-black flex items-center justify-center text-blue-500 font-mono text-xl uppercase tracking-widest animate-pulse">Loading...</div>;


  // --- B. VINDER SKÆRM ---


  if (gameState?.status === 'finished') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center py-12 px-6 overflow-y-auto">
      <div className="max-w-md w-full space-y-8">
      {/* TOP SEKTION: TROFÆ OG NAVN */}
      <div className="text-center space-y-4">
      <Trophy size={100} className="text-amber-400 mx-auto animate-bounce" />
      <h1 className="text-6xl font-black italic tracking-tighter">VINDER FUNDET!</h1>

      <div className="bg-white/10 p-8 rounded-[40px] border border-white/20 shadow-2xl">
      <div className="text-8xl mb-4">{gameState.winner?.avatar}</div>
      <div className="text-3xl font-black uppercase text-blue-400 leading-none">
      {gameState.winner?.name}
      </div>
      <p className="text-slate-400 uppercase tracking-widest mt-2 text-sm">
      Nåede først til {gameState.goalCity}
      </p>
      </div>
      </div>

      {/* REJSE GENNEMGANG (DEN NYE DEL) */}
      <div className="bg-white/5 border border-white/10 rounded-[32px] p-6 space-y-6">
      <h3 className="text-center text-xs font-black uppercase tracking-[0.2em] text-slate-500 border-b border-white/5 pb-4">
      Vinderens Rejsejournal
      </h3>

      <div className="space-y-0">
      {gameState.winner?.history?.map((step, i) => {
        const TransportIcon = TRAVEL_TYPES[step.type]?.icon || Bus;
        return (
          <div key={i} className="flex gap-4 group">
          {/* Tidslinje-streg og ikon */}
          <div className="flex flex-col items-center">
          <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-white/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
          <TransportIcon size={20} />
          </div>
          <div className="w-0.5 h-10 bg-gradient-to-b from-white/20 to-transparent" />
          </div>

          {/* Detaljer om ruten */}
          <div className="flex-1 pt-1">
          <div className="flex justify-between items-baseline">
          <div className="font-bold text-lg">{step.from} → {step.to}</div>
          <div className="text-[10px] font-mono bg-white/10 px-2 py-0.5 rounded text-slate-400">
          {Math.floor(step.time / 60).toString().padStart(2, '0')}:{(step.time % 60).toString().padStart(2, '0')}
          </div>
          </div>
          <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">
          {TRAVEL_TYPES[step.type]?.label} • {step.line}
          </div>
          </div>
          </div>
        );
      })}

      {/* Slutdestination */}
      <div className="flex gap-4">
      <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.4)]">
      <Flag size={20} className="text-white" />
      </div>
      <div className="flex-1 pt-2">
      <div className="font-black text-green-400 uppercase italic">I mål: {gameState.goalCity}</div>
      </div>
      </div>
      </div>
      </div>

      {/* RESTART KNAP */}
      <button
      onClick={() => window.location.reload()}
      className="w-full bg-blue-600 py-6 rounded-3xl font-black uppercase text-xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-blue-600/20"
      >
      Spil Igen
      </button>
      </div>
      </div>
    );
  }

  // --- C. HOVEDMENU (Start skærm) ---

  if (view === 'menu' && !gameState) {
    return (
      <div className="h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-8 space-y-12 overflow-hidden relative">
      <div className="absolute inset-0 opacity-20 pointer-events-none"><div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full blur-[160px]" /><div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-500 rounded-full blur-[160px]" /></div>
      <div className="text-center space-y-4 relative"><Globe size={100} className="text-blue-500 mx-auto animate-pulse" /><h1 className="text-6xl md:text-9xl font-black italic tracking-tighter">EUROPA <span className="text-blue-500">EXPRESS</span></h1><p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-xs">The Pan-European Transit Simulator</p></div>
      <div className="w-full max-w-sm space-y-4 relative"><button onClick={() => setView('join')} className="w-full bg-white text-slate-950 py-6 rounded-2xl font-black uppercase hover:bg-blue-400 transition-all text-xl shadow-[0_0_40px_rgba(255,255,255,0.2)]">Start Rejsen</button><button onClick={startHost} className="w-full border border-white/10 py-4 rounded-xl font-bold text-[10px] uppercase opacity-40 hover:opacity-100 transition-opacity">Host Simulation</button></div>
      </div>
    );
  }


  // --- D. PAS-KONTROL (Join skærm) ---
  if (view === 'join' && !gameState) {
    return (
      <div className="h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 overflow-y-auto">
      {/* INLINE CSS TIL FOIL, TEKSTUR OG SIKKERHEDSMØNSTER */}
      <style>{`
        @keyframes foil-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .foil-gold {
          background: linear-gradient(135deg, #b8860b 0%, #e1b333 25%, #fdf5e6 50%, #e1b333 75%, #b8860b 100%);
          background-size: 400% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: foil-shimmer 6s ease-in-out infinite;
          display: inline-block;
        }
        .passport-cover {
          /* Læder-tekstur der blander sig med baggrundsfarven */
          background-image: url("https://www.transparenttextures.com/patterns/leather.png");
          background-blend-mode: multiply;
        }
        .passport-pattern {
          background-image: url("data:image/svg+xml,%3Csvg width='100' height='20' viewBox='0 0 100 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M21.184 20c.34-2.392 1.191-4.708 2.484-6.818C26.371 9.149 31.642 6 38 6c6.358 0 11.629 3.149 14.332 7.182 1.293 2.11 2.144 4.426 2.484 6.818h7.228a23.951 23.951 0 0 0-2.435-7.732C56.779 7.552 50.832 4 44 4c-6.832 0-12.779 3.552-15.609 8.268a23.951 23.951 0 0 0-2.435 7.732h7.228zm0-20c.34 2.392 1.191 4.708 2.484 6.818C26.371 10.851 31.642 14 38 14c6.358 0 11.629-3.149 14.332-7.182 1.293-2.11 2.144-4.426 2.484-6.818h7.228a23.951 23.951 0 0 1-2.435 7.732C56.779 12.448 50.832 16 44 16c-6.832 0-12.779-3.552-15.609-8.268a23.951 23.951 0 0 1-2.435-7.732h7.228z' fill='%239C92AC' fill-opacity='0.08' fill-rule='evenodd'/%3E%3C/svg%3E");
        }
        `}</style>

        <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">

        {/* PASSET / OMSLAGET - Farven styres nu dynamisk af playerColor */}
        <div
        className="passport-cover rounded-[40px] p-2 shadow-[0_30px_60px_rgba(0,0,0,0.6)] relative border-4 mb-8 transition-colors duration-500"
        style={{
          backgroundColor: playerColor,
          borderColor: 'rgba(0,0,0,0.2)' // Gør kanten mørkere end selve læderet
        }}
        >

        {/* INDERSIDEN AF PASSET */}
        <div className="bg-[#f3e5ab] passport-pattern rounded-[36px] p-6 text-slate-900 shadow-inner overflow-hidden relative border-b-4 border-black/10">

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
        <Globe size={300} />
        </div>

        {/* Header */}
        <div className="flex justify-between items-start mb-8 relative z-10">
        <div className="space-y-0.5">
        <h2 className="text-3xl font-black uppercase tracking-tighter italic leading-none foil-gold">Passport</h2>
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">European Transit Union</p>
        </div>
        <div
        className="px-3 py-1 rounded font-mono text-[10px] font-black border-2 transition-colors duration-500 foil-gold"
        style={{ borderColor: `${playerColor}44` }}
        >
        ID-{Math.random().toString(36).substring(7).toUpperCase()}
        </div>
        </div>

        <div className="flex gap-6 relative z-10">
        {/* Profilbillede / Biometrisk sektion */}
        <div className="space-y-2">
        <div
        className="w-28 h-36 border-2 border-slate-300 rounded-md flex flex-col items-center justify-center relative overflow-hidden bg-white/50 backdrop-blur-sm transition-all duration-700"
        style={{ boxShadow: `inset 0 0 20px ${playerColor}22` }}
        >
        <div className="text-5xl mb-2 filter drop-shadow-md">{playerAvatar}</div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-400/10 to-transparent h-4 w-full animate-pulse top-1/4" />
        <div className="absolute bottom-0 w-full bg-slate-800 py-1 text-[7px] font-black uppercase text-center text-white tracking-widest">
        Digital Bio-ID
        </div>
        </div>
        <div className="flex justify-center">
        <div className="w-12 h-12 border-2 rounded-full flex items-center justify-center rotate-[-15deg] opacity-60" style={{ borderColor: playerColor }}>
        <span className="text-[8px] font-black uppercase leading-none text-center foil-gold">Approved<br/>2026</span>
        </div>
        </div>
        </div>

        {/* Data-felter */}
        <div className="flex-1 space-y-5">
        <div className="relative border-b-2 border-slate-300 pb-1 group">
        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest foil-gold">Surname / Name</label>
        <input
        placeholder="ENTER NAME"
        className="w-full bg-transparent border-none p-0 text-base font-black uppercase focus:ring-0 placeholder:text-slate-300"
        value={playerName}
        onChange={e => setPlayerName(e.target.value)}
        />
        </div>

        <div className="relative border-b-2 border-slate-300 pb-1">
        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest foil-gold">Visa / Entry Code</label>
        <input
        placeholder="CODE"
        className="w-full bg-transparent border-none p-0 text-base font-mono font-black uppercase focus:ring-0 placeholder:text-slate-300 tracking-[0.4em]"
        value={roomCode}
        onChange={e => setRoomCode(e.target.value.toUpperCase())}
        />
        </div>
        <div className="pt-2">
        <p className="text-[7px] font-mono text-slate-400 leading-tight uppercase">
        Authority: Central Transit Hub<br/>
        Issue Date: 21.03.2026<br/>
        Expiry: Non-Expiring
        </p>
        </div>
        </div>
        </div>
        </div>

        {/* FARVE & PERSONA VÆLGER */}
        <div className="p-5 bg-black/20 rounded-b-[36px] space-y-6">
        <div>
        <div className="flex justify-center gap-2.5">
        {['#991b1b', '#1e3a8a', '#065f46', '#92400e', '#5b21b6', '#86198f', '#334155'].map(color => (
          <button
          key={color}
          onClick={() => setPlayerColor(color)}
          className={`w-7 h-7 rounded-full border-2 transition-all duration-300 ${playerColor === color ? 'border-white scale-125 shadow-lg' : 'border-transparent opacity-40 hover:opacity-100'}`}
          style={{ backgroundColor: color }}
          />
        ))}
        </div>
        </div>

        <div className="grid grid-cols-6 gap-2">
        {AVATARS.map(av => (
          <button
          key={av}
          onClick={() => setPlayerAvatar(av)}
          className={`aspect-square flex items-center justify-center text-xl rounded-xl transition-all duration-300 ${playerAvatar === av ? 'bg-white shadow-lg scale-110 border-2' : 'bg-white/10 grayscale hover:bg-white/20'}`}
          style={{ borderColor: playerAvatar === av ? playerColor : 'transparent' }}
          >
          {av}
          </button>
        ))}
        </div>
        </div>
        </div>

        {/* JOIN KNAP */}
        <button
        disabled={!playerName || !roomCode}
        onClick={startJoin}
        className="w-full text-white py-5 rounded-2xl font-black uppercase flex items-center justify-center gap-3 shadow-2xl transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
        style={{ backgroundColor: playerColor }}
        >
        Check-in & Boarding <Navigation size={20} className="fill-current" />
        </button>

        <button
        onClick={startHost}
        className="w-full mt-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] hover:text-white transition-colors"
        >
        Opret ny session (Host)
        </button>
        </div>
        </div>
    );
  }


  // --- D. Lobby ---

  if (gameState?.status === 'lobby') {
    return (
      <div className="h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-8">
      <div className="text-2xl font-black mb-2 opacity-40 uppercase">Visa Entry Code</div>
      <div className="text-8xl font-black mb-12 text-blue-500 tracking-widest">{gameState.code}</div>
      <div className="flex flex-wrap gap-6 mb-12 justify-center max-w-4xl">{gameState.players.map(p => (<div key={p.id} className="w-64 bg-white text-slate-950 flex flex-col rounded-xl overflow-hidden shadow-2xl relative animate-in fade-in zoom-in"><div className="bg-blue-600 p-2 flex justify-between items-center text-white"><Plane size={14} /><span className="text-[8px] font-black uppercase">Boarding Pass</span></div><div className="p-4 flex gap-4 items-center"><div className="text-4xl">{p.avatar}</div><div className="flex flex-col"><span className="text-[8px] font-black text-slate-400 uppercase">Passenger</span><span className="font-black italic uppercase leading-none">{p.name}</span></div></div><div className="border-t-2 border-dashed border-slate-200 p-3 flex justify-between bg-slate-50 font-mono"><div className="text-center"><div className="text-[8px] font-bold text-slate-400">GATE</div><div className="font-black">A24</div></div><div className="text-center"><div className="text-[8px] font-bold text-slate-400">SEAT</div><div className="font-black">12B</div></div><div className="text-center"><div className="text-[8px] font-bold text-slate-400">ZONE</div><div className="font-black">3</div></div></div></div>))}</div>
      {role === 'host' && (<button onClick={initGame} className="bg-white text-slate-950 px-16 py-5 rounded-full font-black uppercase shadow-2xl hover:scale-105 transition-transform flex items-center gap-3"><CheckCircle2 /> Start Simulation</button>)}
      </div>
    );
  }


  // --- E. Hovedskærm (Host-visning) ---
  if (role === 'host') {
    const activeIncident = gameState.incidents?.[gameState.incidents.length - 1];

    return (
      <div className={`h-screen flex bg-black text-white overflow-hidden font-sans relative`}>
      <style>{`
        /* 1. BY-INFO PANEL (Glider bagved manifestet) */
        .modern-sidebar {
          position: fixed;
          top: 0;
          bottom: 0;
          right: 320px; /* Præcis bredden på manifest-sidebaren */
          width: 380px;
          background: rgba(7, 10, 18, 0.98);
          backdrop-filter: blur(25px);
          border-right: 1px solid rgba(255, 255, 255, 0.1);
          z-index: 400;
          display: flex;
          flex-direction: column;
          box-shadow: -20px 0 50px rgba(0,0,0,0.8);
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          transform: translateX(100%);
          pointer-events: auto;
          overflow: hidden; /* Fjerner scrollbar */
        }

        .modern-sidebar.open {
          transform: translateX(0%);
        }

        /* 2. MANIFEST & LOG AREA (Den stationære sidebar helt til højre) */
        .main-sidebar-area {
          width: 320px;
          background: #0f172a;
          border-left: 1px solid rgba(255, 255, 255, 0.1);
          z-index: 500; /* Højere end by-info panelet */
          position: relative;
          display: flex;
          flex-direction: column;
          box-shadow: -10px 0 30px rgba(0,0,0,0.5);
        }

        /* 3. RUTETAVLE GRID (Fjerner behovet for scroll) */
        .route-grid-layout {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          align-content: start;
        }

        .route-card-compact {
          background: rgba(255, 255, 255, 0.03);
          padding: 10px;
          border-radius: 10px;
          border-left: 3px solid #fff;
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-height: 50px;
          transition: all 0.2s;
          border-top: 1px solid rgba(255,255,255,0.02);
        }

        .route-card-compact:hover {
          background: rgba(255, 255, 255, 0.08);
          transform: scale(1.03);
        }

        .route-id-badge {
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          margin-bottom: 2px;
        }

        .route-dest-text {
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: #fff;
        }

        /* 4. PULSERING PÅ KORTET */
        @keyframes station-glow {
          0% { filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.9)); }
          50% { filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.6)); }
          100% { filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.9)); }
        }

        .station-marker-pulse {
          animation: station-glow 2s infinite ease-in-out;
          cursor: pointer !important;
        }

        .custom-map-label {
          background: rgba(15, 23, 42, 0.9) !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          color: white !important;
          border-radius: 8px !important;
          padding: 4px 8px !important;
          box-shadow: 0 4px 15px rgba(0,0,0,0.5) !important;
          font-family: inherit;
        }
        .custom-map-label::before {
          border-top-color: rgba(15, 23, 42, 0.9) !important;
        }
        `}</style>

        {/* VENSTRE SIDE: KORT OG OVERLAYS */}
        <div className="flex-1 flex flex-col relative h-full">
        {activeIncident && (
          <div className="absolute top-0 left-0 right-0 z-[4000] bg-red-600 h-10 flex items-center overflow-hidden border-b-2 border-white/20">
          <div className="bg-white text-red-600 px-4 h-full flex items-center font-black italic text-sm z-10 shadow-xl">BREAKING NEWS</div>
          <div className="flex-1 text-white font-bold uppercase tracking-wider text-sm">
          <div className="animate-marquee">+++ {activeIncident.label.toUpperCase()} I {activeIncident.city.toUpperCase()} +++ REJSER KAN VÆRE FORSINKET +++ </div>
          </div>
          </div>
        )}

        <div className="absolute top-0 left-0 right-0 h-1 z-[3000] bg-slate-900 overflow-hidden mt-10">
        <div className="h-full transition-all" style={{ width: `${(interpolatedTime / 1440) * 100}%`, background: `#3b82f6` }} />
        </div>

        <div ref={mapRef} className="flex-1 w-full bg-slate-950" />

        {/* Top Info Overlay */}
        <div className="absolute top-14 left-6 z-[2000] flex gap-4">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-2xl flex items-center gap-4 shadow-2xl">
        <div className="flex flex-col">
        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Global Tid</span>
        <div className="text-3xl font-mono font-black tracking-tighter flex items-center gap-3">
        {(interpolatedTime/60 >= 7 && interpolatedTime/60 < 20) ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-blue-400" />}
        {formatTime(interpolatedTime)}
        </div>
        </div>
        </div>
        {gameState.goalCity && (
          <div className="bg-amber-600 text-white px-6 py-3 rounded-2xl flex flex-col shadow-2xl border border-white/20">
          <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Aktuelt Mål</span>
          <div className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-2">
          <Flag size={20} /> {gameState.goalCity}
          </div>
          </div>
        )}
        </div>

        {/* Debug Control */}
        <div className="absolute bottom-6 left-6 z-[2000]">
        <button onClick={() => setDebugOpen(!debugOpen)} className="bg-slate-900 border border-white/10 p-4 rounded-full shadow-2xl text-blue-400">
        <Settings size={24} className={debugOpen ? 'rotate-90' : ''} />
        </button>
        {debugOpen && (
          <div className="absolute bottom-16 left-0 bg-slate-900 border border-white/10 p-6 rounded-3xl w-64 space-y-4 shadow-2xl">
          <div className="grid grid-cols-4 gap-2">
          {[0, 1.2, 5, 20].map(s => (
            <button key={s} onClick={() => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', gameState.code), { timeSpeed: s })} className={`py-2 rounded-lg text-[10px] font-black ${gameState.timeSpeed === s ? 'bg-blue-600' : 'bg-white/5'}`}>
            {s === 0 ? <Pause size={12} className="mx-auto" /> : `x${s}`}
            </button>
          ))}
          </div>
          </div>
        )}
        </div>
        </div>

        {/* MIDTEN: MODERNE BY-INFO (Glider bagved manifest) */}
        <div className={`modern-sidebar ${selectedCity ? 'open' : ''}`}>
        {selectedCity && (
          <div className="flex flex-col h-full overflow-hidden">
          <div className="p-7 border-b border-white/10 flex justify-between items-center bg-black/20">
          <div className="flex flex-col">
          <h2 className="text-3xl font-black uppercase tracking-tighter leading-none">{selectedCity.name}</h2>
          <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mt-2">Stationsterminal</span>
          </div>
          <button onClick={() => setSelectedCity(null)} className="p-2 hover:bg-red-500/20 rounded-full transition-all group">
          <XCircle size={26} className="text-slate-500 group-hover:text-red-500" />
          </button>
          </div>

          <div className="flex-1 p-7 overflow-hidden">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Afgangstavle ({selectedCity.routes.length})</div>
          <div className="route-grid-layout">
          {selectedCity.routes.map((r, i) => (
            <div key={i} className="route-card-compact" style={{ borderLeftColor: r.color }}>
            <div className="route-id-badge" style={{ color: r.color }}>{r.name}</div>
            <div className="route-dest-text">➡ {r.to}</div>
            </div>
          ))}
          </div>
          </div>

          <div className="p-6 bg-white/[0.02] border-t border-white/5 mt-auto text-center">
          <div className="flex items-center justify-center gap-2 text-[8px] text-slate-600 font-bold uppercase tracking-widest">
          <div className="w-1 h-1 rounded-full bg-blue-500 animate-ping" /> Live Terminal Data
          </div>
          </div>
          </div>
        )}
        </div>

        {/* HØJRE SIDEBAR: MANIFEST OG LOG */}
        <div className="main-sidebar-area flex flex-col h-full bg-slate-950 border-l border-white/10 overflow-hidden">

        {/* Manifest sektion */}
        <div className="flex-initial flex flex-col min-h-0 max-h-[60%] border-b border-white/10">
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-950 shrink-0">
        <div className="flex items-center gap-2">
        <Users size={18} className="text-blue-500" />
        <h2 className="font-black italic text-sm uppercase tracking-wider text-white">Manifest</h2>
        </div>
        <div className="text-[9px] font-black text-slate-600 uppercase italic">
        {gameState.players?.length || 0} Aktive
        </div>
        </div>

        <div className="overflow-y-auto p-3 space-y-3 bg-slate-900/50 custom-scrollbar">
        {gameState.players?.map((p) => {
          const currentSegment = p.segments?.[p.segments?.length - 1];
          const arrivalTime = currentSegment?.arrival || 0;
          const startTime = currentSegment?.departureTime || (arrivalTime - 10);
          const timeLeft = Math.max(0, Math.round(arrivalTime - interpolatedTime));

          const totalDuration = arrivalTime - startTime;
          const elapsed = interpolatedTime - startTime;
          const progress = totalDuration > 0 ? Math.min(100, Math.max(0, (elapsed / totalDuration) * 100)) : 0;
          const destination = currentSegment?.directionLabel || p.destinationCity || "Ukendt";

          return (
            <div key={p.id} className="rounded-xl border bg-slate-900/60 border-white/5 overflow-hidden transition-all hover:border-white/20 shrink-0">
            <div className="h-1 w-full bg-slate-800/50 overflow-hidden">
            <div
            className={`h-full transition-all duration-1000 ease-linear ${
              p.isTraveling ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)]' : 'bg-slate-700/30'
            }`}
            style={{ width: p.isTraveling ? `${progress}%` : '0%' }}
            />
            </div>

            <div className="p-3">
            <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
            <span className="text-2xl">{p.avatar}</span>
            <div className="min-w-0">
            <span className="text-[11px] font-black uppercase italic text-white block truncate">{p.name}</span>
            <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500 uppercase truncate">
            <MapPin size={10} />
            <span>{p.currentCity}</span>
            </div>
            </div>
            </div>
            <div className="text-[10px] font-black text-white shrink-0 bg-white/5 px-2 py-1 rounded border border-white/5 font-mono">
            {p.money?.toLocaleString()}€
            </div>
            </div>

            {p.isTraveling && (
              <div className="mt-2 bg-black/40 rounded-lg p-2 border border-white/5">
              <div className="flex items-baseline gap-1.5 mb-2 overflow-hidden">
              <span className="text-[10px] text-slate-500 font-bold lowercase italic shrink-0">rejser mod</span>
              <span className="text-[11px] text-white font-black uppercase truncate tracking-tight">
              {destination}
              </span>
              </div>
              <div className="flex justify-between items-center bg-black/20 p-1.5 rounded border border-white/5">
              <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest italic">Transit</span>
              </div>
              <div className="flex items-center gap-1 text-white font-mono text-[10px]">
              <Clock size={10} className="text-amber-500" />
              <span>{timeLeft}m</span>
              </div>
              </div>
              </div>
            )}
            </div>
            </div>
          );
        })}
        </div>
        </div>

        {/* Log sektion */}
        <div className="flex-1 min-h-[250px] bg-black/40 flex flex-col overflow-hidden">
        <div className="p-3 border-b border-white/5 flex items-center justify-between bg-slate-950/80 shrink-0">
        <div className="flex items-center gap-2 text-blue-500">
        <Activity size={16} />
        <span className="text-[10px] font-black uppercase tracking-tighter text-white">System Log</span>
        </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-950/50 custom-scrollbar font-sans">
        {(gameState.logs || []).slice().reverse().map((log, i) => {
          const msg = (log.message || "").toLowerCase();

          // Standardværdier
          let icon = "🔔";
          let textColor = "text-slate-300";
          let bgColor = "hover:bg-white/5";

          // 1. HÆNDELSER & FORSINKELSER (RØD)
          if (msg.includes("hændelse") || msg.includes("forsinkelse") || msg.includes("aflyst") || msg.includes("spærret") || msg.includes("nedbrud")) {
            icon = "🚧";
            textColor = "text-red-500";
            bgColor = "hover:bg-red-500/5";
          }
          // 2. ARBEJDE FULDFØRT (GRØN)
          else if (msg.includes("fuldført") || msg.includes("tjent") || msg.includes("modtaget") || msg.includes("gevinst")) {
            icon = "💰";
            textColor = "text-green-500";
            bgColor = "hover:bg-green-500/5";
          }
          // 3. ARBEJDE MISLYKKEDES / TAB (RØD)
          else if (msg.includes("mislykkedes") || msg.includes("mistet") || msg.includes("stjålet") || msg.includes("bøde")) {
            icon = "💸";
            textColor = "text-red-400";
            bgColor = "hover:bg-red-900/10";
          }
          // 4. TRANSPORT TYPER
          else if (msg.includes("tog") || msg.includes("re-tog") || msg.includes("s-tog")) icon = "🚆";
          else if (msg.includes("bus")) icon = "🚍";
          else if (msg.includes("færge")) icon = "🚢";
          else if (msg.includes("fly") || msg.includes("lufthavn")) icon = "🛫";
          else if (msg.includes("taxi") || msg.includes("flex-tur")) icon = "🚖";
          else if (msg.includes("gåben") || msg.includes("går til") || msg.includes("ankommet til fods")) icon = "🚶";

          return (
            <div key={i} className={`flex gap-3 items-start border-l-2 border-white/5 pl-3 py-2 ${bgColor} transition-colors group rounded-r-lg`}>
            <span className="text-sm shrink-0 mt-0.5">{icon}</span>
            <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
            <span className="text-[8px] font-mono text-slate-600 uppercase tracking-widest shrink-0 italic">
            {typeof formatTime === 'function' ? formatTime(log.time) : log.time}
            </span>
            </div>
            <p className={`text-[10px] font-black uppercase leading-tight tracking-tight ${textColor} group-hover:brightness-125 transition-all`}>
            {log.message}
            </p>
            </div>
            </div>
          );
        })}

        </div>
        </div>
        </div>
        </div>
    );
  }



  // --- F. Spillerskærm ---

  if (!currentPlayer) return null;

  const currentCityData = CITIES[currentPlayer.currentCity];

  if (currentPlayer.isTraveling && (!currentPlayer.segments || currentPlayer.segments?.length === 0)) {
    return (
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
      <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
      <p className="font-black uppercase tracking-widest text-[10px] animate-pulse">Forbereder rejse-data...</p>
      </div>
    );
  }
  // >>> SLUT PÅ BLOK <<<


  return (
    <div className="h-screen bg-black flex flex-col text-white font-mono select-none overflow-hidden">

    {/* TOP BAR: Profil & Økonomi */}
    <div className="p-4 bg-slate-900 border-b border-white/10 flex items-center justify-between">
    <div className="flex items-center gap-3">
    <div className="text-3xl bg-white/5 p-2 rounded-xl">{currentPlayer.avatar}</div>
    <div>
    <div className="text-[10px] font-black uppercase text-blue-400 leading-none">{currentPlayer.name}</div>
    <div className="text-lg font-black italic tracking-tighter uppercase">
    {currentPlayer.isTraveling ? "I Transit" : currentPlayer.currentCity}
    </div>
    </div>
    </div>
    <div className="text-right">
    <div className="text-[8px] font-black uppercase text-slate-500">Saldo</div>
    <div className="text-xl font-black text-green-500">{currentPlayer.money}€</div>
    </div>
    </div>

    {/* HOVEDINDHOLD */}
    <div className="flex-1 overflow-y-auto relative">
    {currentPlayer.isTraveling ? (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in zoom-in duration-500 overflow-y-auto font-sans select-none">
      {(() => {
        // 1. Find aktiv rute (Sikkerhed mod undefined)
        const activeRoute = TRANSIT_LINES.find(line =>
        line.id === currentPlayer?.segments?.[0]?.lineId
        ) || { color: '#2563eb', name: 'Europa Express', label: 'EX' };

        // 2. Hent ankomsttid for fejlfinding
        const finalArrival = currentPlayer.segments?.[currentPlayer.segments?.length - 1]?.arrival;
        const isActuallyArrived = interpolatedTime > finalArrival;

        return (
          <>
          {/* DEN RIFLEDE BILLET */}
          <div className="w-full max-w-sm bg-white text-slate-900 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden relative border-t-[12px]"
          style={{ borderTopColor: activeRoute.color }}>

          {/* Riflet kant top */}
          <div className="absolute -top-1 left-0 right-0 flex justify-around px-2 pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="w-5 h-5 bg-slate-950 rounded-full -mt-3 shadow-inner" />
          ))}
          </div>

          <div className="p-6 pt-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-7 pb-4 border-b border-slate-100">
          <div>
          <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Boarding Pass</p>
          <h2 className="text-2xl font-black italic text-slate-900 leading-tight uppercase tracking-tighter">
          {activeRoute.name}
          </h2>
          </div>
          <div className="px-5 py-2 rounded-2xl border font-black text-xl text-white tracking-tighter shadow-md"
          style={{ backgroundColor: activeRoute.color, borderColor: `${activeRoute.color}cc` }}>
          {activeRoute.label}
          </div>
          </div>

          {/* Rute Info */}
          <div className="flex justify-between items-center mb-10 px-1">
          <div className="text-left">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Origin</p>
          <p className="text-xl font-black">{currentPlayer.segments?.[0]?.from || '...'}</p>
          </div>
          <div className="flex-1 px-4 flex flex-col items-center">
          <div className="w-full border-t-2 border-dashed border-slate-200 relative">
          <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-white px-2">
          <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: activeRoute.color }}>
          <ChevronRight size={14} className="text-white" />
          </div>
          </div>
          </div>
          </div>
          <div className="text-right">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Destination</p>
          <p className="text-xl font-black">{currentPlayer.destinationCity}</p>
          </div>
          </div>

          {/* HORISONTAL PROGRESS BAR */}
          <div className="mb-10 bg-slate-50 p-4 rounded-xl border border-slate-100 relative shadow-inner">
          <div ref={ticketScrollRef} className="overflow-x-auto no-scrollbar pb-8 pt-6 px-10">
          <div className="flex items-center min-w-max">
          {currentPlayer.segments?.map((seg, idx) => {
            const isPast = interpolatedTime > seg.arrival;
            const isCurrentSegment = interpolatedTime >= seg.departure && interpolatedTime <= seg.arrival;

            return (
              <React.Fragment key={idx}>
              <div ref={isCurrentSegment ? currentStopRef : null} className="flex flex-col items-center relative">
              <div className={`w-6 h-6 rounded-full border-4 transition-all duration-500 z-20 ${
                isPast ? 'border-transparent' :
                isCurrentSegment ? 'bg-white scale-125 shadow-xl animate-pulse' : 'bg-white border-slate-200'
              }`}
              style={{
                backgroundColor: isPast ? activeRoute.color : 'white',
                borderColor: isCurrentSegment ? activeRoute.color : (isPast ? 'transparent' : '#e2e8f0')
              }} />
              <span className={`text-[10px] font-black mt-2 absolute -bottom-6 whitespace-nowrap uppercase tracking-tight ${isCurrentSegment ? 'text-slate-900' : 'text-slate-400'}`}>
              {seg.from}
              </span>
              </div>

              <div className="relative w-20 h-[4px] bg-slate-200 -mx-1 z-10 rounded-full overflow-hidden">
              <div className="absolute left-0 top-0 h-full transition-all duration-1000"
              style={{ width: isPast ? '100%' : isCurrentSegment ? '50%' : '0%', backgroundColor: activeRoute.color }} />
              </div>

              {idx === currentPlayer.segments.length - 1 && (
                <div className="flex flex-col items-center relative">
                <div className="w-6 h-6 rounded-full border-4 border-slate-200 bg-white z-20" />
                <span className="text-[10px] font-black mt-2 absolute -bottom-6 whitespace-nowrap uppercase tracking-tight text-slate-400">{seg.to}</span>
                </div>
              )}
              </React.Fragment>
            );
          })}
          </div>
          </div>
          </div>

          {/* STREGKODE */}
          <div className="border-t-2 border-slate-100 pt-6 flex flex-col items-center">
          <div className="flex gap-[2px] h-10 mb-2 overflow-hidden w-full justify-center opacity-30">
          {[...Array(40)].map((_, i) => (
            <div key={i} className={`bg-slate-900 ${Math.random() > 0.4 ? 'w-[1px]' : 'w-[3px]'}`} />
          ))}
          </div>
          <p className="text-[8px] font-mono text-slate-400 tracking-[0.4em] uppercase">
          {activeRoute.label}-{user.uid.slice(0,12).toUpperCase()}
          </p>
          </div>
          </div>

          <div className="absolute -bottom-1 left-0 right-0 flex justify-around px-2 pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="w-5 h-5 bg-slate-950 rounded-full -mb-3 shadow-inner" />
          ))}
          </div>
          </div>

          {/* DEBUG KONTROLPANEL - SÅ VI KAN FINDE FEJLEN */}
          <div className="mt-8 w-full max-w-sm p-4 bg-black/40 border border-white/10 rounded-xl font-mono text-[10px]">
          <div className="flex justify-between items-center mb-2">
          <span className="text-blue-400 font-bold uppercase">System Status</span>
          <span className={isActuallyArrived ? "text-red-400 animate-pulse" : "text-green-400"}>
          {isActuallyArrived ? "ANKOMMET (VENTER PÅ SYNC)" : "REJSER..."}
          </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-slate-400">
          <p>Spil-tid: <span className="text-white">{Math.floor(interpolatedTime)}</span></p>
          <p>Ankomst: <span className="text-white">{finalArrival || 'N/A'}</span></p>
          <p>Segments: <span className="text-white">{currentPlayer.segments?.length || 0}</span></p>
          <p>Buffer: <span className="text-white">{(interpolatedTime - finalArrival).toFixed(1)}</span></p>
          </div>

          {isActuallyArrived && (
            <button
            onClick={async () => {
              const sessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', gameState.code);
              await updateDoc(sessionRef, {
                players: gameState.players.map(p => p.id === user.uid ? { ...p, isTraveling: false, segments: null } : p)
              });
            }}
            className="mt-4 w-full py-2 bg-red-500/20 border border-red-500/50 text-red-400 rounded uppercase font-black"
            >
            Tving ankomst (Nulstil)
            </button>
          )}
          </div>
          </>
        );
      })()}
      </div>
    ) : (
      /* ================== BY-VISNING (STATIONARY VIEW) ================== */
      <>
      {/* TAB: INFO OM BYEN */}
      {playerTab === 'info' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">

        {/* 1. BY-OVERSKRIFT & STATS */}
        <div className="bg-slate-800/80 p-6 rounded-[32px] border border-white/10 shadow-xl">
        <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
        <div className="bg-blue-500/20 p-3 rounded-2xl">
        <MapPin className="text-blue-400" size={24} />
        </div>
        <div>
        <h2 className="text-2xl font-black uppercase italic leading-none">{currentPlayer.currentCity}</h2>
        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-1">
        {CITIES[currentPlayer.currentCity]?.country} • Nuværende lokation
        </p>
        </div>
        </div>
        {/* Lille vejr/tids-indikator hvis du har det, ellers bare et ikon */}
        <div className="bg-white/5 px-3 py-1 rounded-full border border-white/5">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter italic">By-Info</span>
        </div>
        </div>

        {/* BY BESKRIVELSE & DATA */}
        <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-black/20 p-3 rounded-2xl border border-white/5">
        <p className="text-[8px] text-slate-500 uppercase font-bold mb-1">Indbyggere</p>
        <p className="font-mono text-sm text-blue-300">
        {CITIES[currentPlayer.currentCity]?.population?.toLocaleString() || 'Ukendt'}
        </p>
        </div>
        <div className="bg-black/20 p-3 rounded-2xl border border-white/5">
        <p className="text-[8px] text-slate-500 uppercase font-bold mb-1">Type</p>
        <p className="font-mono text-sm text-blue-300 uppercase tracking-tight">
        {CITIES[currentPlayer.currentCity]?.type || 'Storby'}
        </p>
        </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed italic opacity-80 px-1">
        {CITIES[currentPlayer.currentCity]?.description || `Velkommen til ${currentPlayer.currentCity}. Udforsk byen til fods eller tag en taxa til de omkringliggende områder.`}
        </p>
        </div>

        {/* 2. LOKAL TRANSPORT PANEL (DASHBOARD) */}
        <div className="bg-slate-900/80 backdrop-blur-md p-5 rounded-[32px] border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-black uppercase italic flex items-center gap-2">
        <Navigation size={16} className="text-blue-400" />
        Rejs lokalt fra {currentPlayer.currentCity}
        </h3>
        </div>

        {/* TRANSPORTSKIFTER */}
        <div className="grid grid-cols-2 gap-3 mb-6">
        <button
        onClick={() => setLocalTransportMode('walking')}
        className={`flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all active:scale-95 ${localTransportMode === 'walking' ? 'border-blue-500 bg-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.2)]' : 'border-white/5 bg-white/5 opacity-60'}`}
        >
        <Navigation size={18} className={localTransportMode === 'walking' ? 'text-blue-400' : 'text-slate-400'} />
        <span className="font-bold uppercase text-[10px] tracking-wider text-white">Gåben (0-10km)</span>
        </button>
        <button
        onClick={() => setLocalTransportMode('taxi')}
        className={`flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all active:scale-95 ${localTransportMode === 'taxi' ? 'border-yellow-500 bg-yellow-500/20 shadow-[0_0_20px_rgba(245,158,11,0.2)]' : 'border-white/5 bg-white/5 opacity-60'}`}
        >
        <MapPin size={18} className={localTransportMode === 'taxi' ? 'text-yellow-400' : 'text-slate-400'} />
        <span className="font-bold uppercase text-[10px] tracking-wider text-white">Taxi (5-50km)</span>
        </button>
        </div>

        {/* TO-KOLONNE VISNING */}
        {localTransportMode ? (
          <div className="flex flex-col lg:flex-row gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">

          {/* VENSTRE: KORTET */}
          <div className="w-full lg:w-1/2 min-h-[220px]">
          <StaticMiniMap
          currentCityPos={CITIES[currentPlayer.currentCity].pos}
          color={localTransportMode === 'walking' ? '#3b82f6' : '#f59e0b'}
          destinations={getNearbyStations(currentPlayer.currentCity).filter(s => {
            if (localTransportMode === 'walking') return s.dist <= 10;
            if (localTransportMode === 'taxi') return s.dist >= 5 && s.dist <= 50;
            return false;
          })}
          />
          </div>

          {/* HØJRE: LISTEN */}
          <div className="w-full lg:w-1/2 space-y-2 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
          {getNearbyStations(currentPlayer.currentCity)
            .filter(s => {
              if (localTransportMode === 'walking') return s.dist <= 10;
              if (localTransportMode === 'taxi') return s.dist >= 5 && s.dist <= 50;
              return false;
            })
            .map(s => {
              const taxiCost = Math.round(50 + s.dist * 15);
              return (
                <button
                key={s.name}
                onClick={() => {
                  handleLocalTravel(s.name, localTransportMode);
                  setLocalTransportMode(null);
                }}
                className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 active:bg-blue-500/20 rounded-xl border border-white/5 transition-all"
                >
                <div className="text-left">
                <div className="font-bold text-[13px]">{s.name}</div>
                <div className="text-[9px] text-slate-500 uppercase">{s.dist.toFixed(1)} km væk</div>
                </div>
                <div className="text-right">
                <div className={`font-black text-[12px] ${localTransportMode === 'taxi' ? 'text-yellow-500' : 'text-green-500'}`}>
                {localTransportMode === 'taxi' ? `${taxiCost} kr.` : 'GRATIS'}
                </div>
                <div className="text-[9px] text-slate-400 uppercase font-bold">
                {Math.round(s.dist * (localTransportMode === 'walking' ? 12 : 2))} min
                </div>
                </div>
                </button>
              );
            })}
            </div>
            </div>
        ) : (
          <div className="py-12 text-center border border-dashed border-white/5 rounded-2xl bg-black/20">
          <p className="text-slate-600 text-[10px] uppercase font-black tracking-[0.2em] italic">Vælg transportform for at se rejsemål</p>
          </div>
        )}
        </div>
        </div>
      )}
      {/* TAB: AFGANGSTAVLE */}
      {playerTab === 'departures' && (
        <div className="flex flex-col h-full animate-in fade-in relative bg-slate-950 font-sans select-none">

        {/* STATION-STYLE CSS & LED FONT */}
        <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=VT323&display=swap');

          @keyframes station-scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }

          .station-marquee-container {
            display: flex;
            white-space: nowrap;
            animation: station-scroll 25s linear infinite;
            width: max-content;
          }

          .marquee-mask {
            overflow: hidden;
            position: relative;
            width: 100%;
            -webkit-mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
            mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
          }

          .led-font {
            font-family: 'VT323', monospace;
            font-size: 1.1em;
            text-shadow: 0 0 2px currentColor;
            letter-spacing: 0.05em;
          }
          `}
          </style>

          {/* TRANSPORT TYPER TABS */}
          <div className="flex border-b border-white/10 bg-slate-900 sticky top-0 z-10 font-sans">
          {['train', 'bus', 'flight', 'ferry'].map(type => (
            <button
            key={type}
            onClick={() => { setActiveTab(type); setSelectedDeparture(null); }}
            className={`flex-1 py-4 flex flex-col items-center gap-1 transition-all ${activeTab === type ? 'bg-blue-600/20 border-b-2 border-blue-500' : 'opacity-40'}`}
            >
            {React.createElement(TRAVEL_TYPES[type].icon, { size: 16 })}
            <span className="text-[8px] font-black uppercase tracking-widest">{TRAVEL_TYPES[type].label}</span>
            </button>
          ))}
          </div>

          {/* SELVE TAVLEN */}
          {!selectedDeparture ? (
            <div className="divide-y divide-white/5">
            {(() => {
              const allDepartures = departures;
              const now = interpolatedTime;

              return allDepartures.map(dep => {
                const style = dep.style;
                const hasDeparted = (dep.time + dep.delay) <= now;
                if (hasDeparted && now - (dep.time + dep.delay) > 15) return null;

                const viaStops = dep.allStops ? dep.allStops.slice(0, -1) : [];
                const viaText = viaStops.length > 0 ? viaStops.join(' > ') + ' > ' : '';

                return (
                  <button
                  key={dep.id}
                  disabled={dep.isCancelled || hasDeparted}
                  onClick={() => setSelectedDeparture(dep)}
                  className={`w-full px-4 py-4 flex items-center justify-between transition-colors group ${
                    dep.isCancelled ? 'bg-red-950/10 cursor-not-allowed' :
                    hasDeparted ? 'bg-black/30 cursor-not-allowed' : 'hover:bg-white/5'
                  }`}
                  >
                  <div className="flex items-center gap-4 text-left flex-1 min-w-0">
                  {/* TIDSPUNKT */}
                  <div className="flex flex-col w-14 items-start shrink-0 led-font">
                  <span className={`text-2xl tabular-nums leading-none ${
                    dep.isCancelled ? 'text-slate-600 line-through' :
                    hasDeparted ? 'text-slate-700' :
                    dep.delay > 0 ? 'text-red-500' : 'text-yellow-400'
                  }`}>
                  {formatTime(dep.time)}
                  </span>
                  {dep.delay > 0 && !dep.isCancelled && (
                    <span className={`text-[12px] font-bold -mt-0.5 ${hasDeparted ? 'text-slate-700' : 'text-red-400'}`}>
                    +{dep.delay} min
                    </span>
                  )}
                  </div>

                  {/* LINJE LABEL (Tavle-visning) */}
                  <div
                  className={`h-6 px-3 min-w-[40px] led-font rounded-sm flex items-center justify-center shrink-0 text-sm uppercase shadow-md shadow-black/50 transition-all ${
                    dep.isCancelled || hasDeparted
                    ? 'bg-slate-800 text-slate-600 grayscale opacity-50'
                : `${style.bg || ''} ${style.text || 'text-white'}`
                  }`}
                  style={(!dep.isCancelled && !hasDeparted && style.color && !style.bg?.startsWith('bg-')) ? { backgroundColor: style.color } : {}}
                  >
                  {style.label}
                  </div>

                  {/* DESTINATION */}
                  <div className="flex flex-col flex-1 min-w-0 pr-4">
                  <div className={`font-black font-sans uppercase text-sm truncate tracking-tight ${
                    dep.isCancelled ? 'text-slate-600 line-through' :
                    hasDeparted ? 'text-slate-700' : 'text-white'
                  }`}>
                  {dep.directionLabel}
                  </div>

                  {/* STATUS / VIA */}
                  {dep.isCancelled ? (
                    <div className="text-[10px] text-red-500 font-black uppercase tracking-widest flex items-center gap-1 animate-pulse font-sans">
                    <AlertTriangle size={10} /> Aflyst
                    </div>
                  ) : hasDeparted ? (
                    <div className="text-[10px] text-slate-700 font-bold uppercase tracking-widest font-sans">
                    Afgået
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-0.5 w-full led-font">
                    {viaText && (
                      <>
                      <span className="text-[10px] text-slate-500 uppercase shrink-0 tracking-widest font-sans">Via</span>
                      <div className="marquee-mask">
                      <div className="station-marquee-container">
                      <span className="text-[13px] text-blue-400/80 uppercase tracking-wide pr-6">{viaText}</span>
                      <span className="text-[13px] text-blue-400/80 uppercase tracking-wide pr-6">{viaText}</span>
                      </div>
                      </div>
                      </>
                    )}
                    </div>
                  )}
                  </div>
                  </div>
                  {!hasDeparted && !dep.isCancelled && (
                    <ChevronRight size={14} className="text-slate-600 group-hover:text-blue-500 shrink-0 transition-colors" />
                  )}
                  </button>
                );
              });
            })()}
            </div>
          ) : (
            /* ================== STOP-VÆLGER OVERLAY ================== */
            <div className="absolute inset-0 z-50 bg-slate-950 flex flex-col animate-in slide-in-from-right duration-300 font-sans">
            <div className="p-6 bg-slate-900 border-b border-white/10 flex justify-between items-start">
            <div>
            <button
            onClick={() => setSelectedDeparture(null)}
            className="flex items-center gap-2 text-blue-400 font-black uppercase text-[10px] tracking-widest mb-4 hover:text-blue-300"
            >
            <RotateCcw size={12} /> Tilbage til tavlen
            </button>

            <div className="flex items-center gap-3">
            {/* Farvet Label Boks med Tailwind & Hex Support */}
            <div
            className={`px-3 py-1 rounded-sm text-white text-sm font-black uppercase flex items-center gap-2 shadow-lg led-font ${
              selectedDeparture.style?.bg?.startsWith('bg-') ? selectedDeparture.style.bg : ''
            }`}
            style={{
              backgroundColor: (!selectedDeparture.style?.bg?.startsWith('bg-'))
              ? (selectedDeparture.style?.color || '#334155')
              : undefined
            }}
            >
            {selectedDeparture.style?.label}
            </div>

            <div className="flex items-baseline gap-2">
            <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest italic"></span>
            <div className="text-2xl font-black italic uppercase tracking-tighter text-white leading-none">
            {selectedDeparture.directionLabel}
            </div>
            </div>
            </div>
            </div>

            <div className="text-right">
            <div className={`font-black text-xl tabular-nums ${selectedDeparture.delay > 0 ? 'text-red-500' : 'text-blue-500'}`}>
            kl. {formatTime(selectedDeparture.time + selectedDeparture.delay)}
            </div>
            <div className="text-[8px] font-black text-slate-500 uppercase">Forventet afgang</div>
            </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
            <div className="relative border-l-2 border-blue-500/20 ml-3 pl-8 space-y-6">
            {selectedDeparture.allStops.map((stopCity) => {
              const info = calculateStopInfo(selectedDeparture, stopCity, currentPlayer.currentCity);
              const hasMoney = currentPlayer.money >= info.price;

              return (
                <button
                key={stopCity}
                disabled={!hasMoney}
                onClick={() => {
                  travel({ ...selectedDeparture, destination: stopCity, cost: info.price, route: info.route });
                  setSelectedDeparture(null);
                }}
                className="relative w-full text-left group"
                >
                <div className="absolute -left-[35px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-slate-950 border-2 border-blue-500 group-hover:scale-150 transition-transform z-10" />

                <div className={`p-4 rounded-2xl border transition-all ${
                  hasMoney
                  ? 'bg-white/5 border-white/10 hover:bg-blue-600/10 hover:border-blue-500/50'
                  : 'opacity-30 border-transparent cursor-not-allowed'
                }`}>
                <div className="flex justify-between items-center">
                <div>
                <div className="font-black uppercase text-lg leading-none flex items-center gap-2 text-white">
                {stopCity}
                {stopCity === gameState.goalCity && <Flag size={14} className="text-amber-500" />}
                </div>
                <div className="text-[10px] font-bold text-slate-500 mt-1 uppercase">
                Ankomst ca. {formatTime(selectedDeparture.time + selectedDeparture.delay + info.duration)}
                </div>
                </div>
                <div className="text-right font-black text-lg">
                <span className={hasMoney ? 'text-green-500' : 'text-red-500'}>{info.price}€</span>
                </div>
                </div>
                </div>
                </button>
              );
            })}
            </div>
            </div>
            </div>
          )}

          {departures.length === 0 && !selectedDeparture && (
            <div className="p-12 text-center opacity-30 italic uppercase font-black text-xs tracking-widest font-sans">
            Ingen flere afgange i denne kategori
            </div>
          )}
          </div>
      )}
      {/* TAB: ARBEJDE */}
      {playerTab === 'work' && (
        <div className="h-full flex flex-col items-center justify-center p-8 opacity-40 grayscale">
        <div className="bg-slate-800 p-8 rounded-full mb-4">
        <Users size={48} />
        </div>
        <h3 className="text-xl font-black uppercase">Jobcenter</h3>
        <p className="text-[10px] text-center mt-2 uppercase">Arbejde er midlertidigt utilgængeligt i denne by.</p>
        </div>
      )}
      </>
    )}
    </div>

    {/* BOTTOM TAB BAR */}
    {!currentPlayer.isTraveling && (
      <div className="bg-slate-900 border-t border-white/10 flex items-center justify-around pb-6 pt-2 px-2">
      <button onClick={() => setPlayerTab('info')} className={`flex flex-col items-center gap-1 flex-1 py-2 rounded-xl transition-all ${playerTab === 'info' ? 'text-blue-500 scale-110' : 'text-slate-500'}`}>
      <Info size={20} />
      <span className="text-[8px] font-black uppercase">Info</span>
      </button>
      <button onClick={() => setPlayerTab('departures')} className={`flex flex-col items-center gap-1 flex-1 py-2 rounded-xl transition-all ${playerTab === 'departures' ? 'text-blue-500 scale-110' : 'text-slate-500'}`}>
      <Ticket size={20} />
      <span className="text-[8px] font-black uppercase">Afgange</span>
      </button>
      <button onClick={() => setPlayerTab('work')} className={`flex flex-col items-center gap-1 flex-1 py-2 rounded-xl transition-all ${playerTab === 'work' ? 'text-blue-500 scale-110' : 'text-slate-500 opacity-50'}`}>
      <Users size={20} />
      <span className="text-[8px] font-black uppercase">Arbejde</span>
      </button>
      </div>
    )}
    <style>{`@keyframes move { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }`}</style>
    </div>
  );
}
