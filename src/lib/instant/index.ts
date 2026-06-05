// Tek import noktası — tüm uygulama buradan kullanır
// import { db, id, tx, type AppSchema } from '$lib/instant';

export { db, id, tx, type Db } from './client';
export { default as schema, type AppSchema } from './schema';
export { default as permissions } from './permissions';
