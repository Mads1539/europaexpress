import { CITIES as airportCities } from './airlines/cities.js';
import { CITIES as dkCities } from './dk/cities.js';
import { CITIES as seCities } from './se/cities.js';

// Samler alle byer i ét objekt, som transitlines kan kigge i
export const ALL_CITIES = {
    ...airportCities,
    ...dkCities,
    ...seCities
};
