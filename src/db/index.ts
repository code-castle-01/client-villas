import { openDB } from 'idb';

// Crear la base de datos y las stores (tablas) necesarias
export async function initDB() {
  return openDB('visitas-db', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('visitas')) {
        db.createObjectStore('visitas', { keyPath: 'id', autoIncrement: true });
      }
    },
  });
}

export async function addVisita(visita: any) {
  const db = await initDB();
  return db.add('visitas', visita);
}

export async function getVisitas() {
  const db = await initDB();
  return db.getAll('visitas');
}
