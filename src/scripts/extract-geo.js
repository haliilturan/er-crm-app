// One-time script: extracts geo data from combined JSON into separate files.
// Run: node src/scripts/extract-geo.js
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '../lib/data');
const citiesDir = join(dataDir, 'cities');

mkdirSync(citiesDir, { recursive: true });

console.log('Reading combined JSON...');
const combined = JSON.parse(readFileSync(join(dataDir, '_combined.json'), 'utf-8'));

const countries = [];
const states = [];

for (const country of combined) {
	countries.push({
		id:         country.id,
		name:       country.name,
		iso2:       country.iso2,
		iso3:       country.iso3,
		phone_code: country.phonecode,
		emoji:      country.emoji ?? ''
	});

	const countryStates = country.states ?? [];

	for (const state of countryStates) {
		states.push({
			id:           state.id,
			name:         state.name,
			country_id:   country.id,
			country_code: country.iso2,
			state_code:   state.iso2 ?? ''
		});
	}
}

// Write countries.json and states.json
writeFileSync(join(dataDir, 'countries.json'), JSON.stringify(countries));
writeFileSync(join(dataDir, 'states.json'),   JSON.stringify(states));
console.log(`countries.json: ${countries.length} entries`);
console.log(`states.json: ${states.length} entries`);

// Write per-country cities files
let totalCities = 0;
for (const country of combined) {
	const citiesForCountry = [];
	for (const state of (country.states ?? [])) {
		for (const city of (state.cities ?? [])) {
			citiesForCountry.push({
				id:         city.id,
				name:       city.name,
				state_id:   state.id,
				state_code: state.iso2 ?? ''
			});
		}
	}
	if (citiesForCountry.length > 0) {
		writeFileSync(join(citiesDir, `${country.iso2}.json`), JSON.stringify(citiesForCountry));
		totalCities += citiesForCountry.length;
	}
}
console.log(`cities/: ${totalCities} total cities across all countries`);
console.log('Done. You can delete _combined.json now.');
