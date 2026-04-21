import { CITIES } from './cities.js';

export const TRANSIT_LINES = [
    {
        name: "8839201142",
        number: "92",
        type: "train",
        color: "#1e3765",
        category: "gocollective",
        frequency: 16,
        delayRisk: 12,
        cancelRisk: 3,
        firstDeparture: 340,
        cities: ["Esbjerg", "Bramming", "Sejstrup", "Gredstedbro", "Ribe Nørremark", "Ribe", "Hviding", "Rejsby", "Brøns", "Skærbæk", "Døstrup Sønderjylland", "Bredebro", "Visby", "Tønder Nord", "Tønder", "Süderlügum", "Uphusum", "Niebüll"],
},

{
    name: "0180304259",
    number: "neg",
    type: "train",
    color: "#005b8c", // neg's blå farve
    category: "db_regional_bahn", 
    frequency: 14,
    delayRisk: 5,
    cancelRisk: 2,
    firstDeparture: 360,
    cities: [
        "Niebüll", "Deezbüll", "Maasbüll", "Dagebüll Kirche", "Dagebüll Mole"],
},

{
        name: "0236339893",
        number: "RE6",
        type: "train",
        color: "#ff0000",
        category: "db_regional_bahn",
        frequency: 18,
        delayRisk: 25,
        cancelRisk: 5,
        cities: [
            "Hamburg Hbf", "Hamburg-Altona", "Elmshorn", "Glückstadt", "Itzehoe", "Heide (Holst)", "Husum", "Bredstedt", "Niebüll", "Klanxbüll", "Morsum", "Keitum", "Westerland (Sylt)"],
},

];
