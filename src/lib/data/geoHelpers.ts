import type { Country, State, City } from './geoTypes';
import countriesRaw from './countries.json';
import statesRaw from './states.json';

export const allCountries = countriesRaw as Country[];
export const allStates = statesRaw as State[];

export function getStatesByCountry(iso2: string): State[] {
	return allStates.filter((s) => s.country_code === iso2);
}

export async function getCitiesByState(iso2: string, stateId: number): Promise<City[]> {
	try {
		const mod = await import(`./cities/${iso2}.json`);
		return (mod.default as City[]).filter((c) => c.state_id === stateId);
	} catch {
		return [];
	}
}
