export const NAT = {
  ES: ['Spain', '#e8c03a'],
  EN: ['England', '#d9473a'],
  FR: ['France', '#5b8cf0'],
  NL: ['Dutch', '#f08a30'],
  PI: ['Pirates', '#111']
};

export const REGIONS = [
  { id: 'caribbean', name: 'The Caribbean', x: 5200, y: 4000, r: 1600, unlocked: true, difficulty: 1 },
  { id: 'europe', name: 'European Coast', x: 9600, y: 2500, r: 1200, unlocked: false, difficulty: 2, unlockCost: 5000 },
  { id: 'africa', name: 'West Africa', x: 9900, y: 4700, r: 1200, unlocked: false, difficulty: 3, unlockCost: 15000 },
  { id: 'indies', name: 'East Indies', x: 14800, y: 5300, r: 1500, unlocked: false, difficulty: 5, unlockCost: 35000 }
];

export const PORTS = [
  // --- PLAYER MAPPED PORTS ---
  // Spanish Main & Islands
  { name: 'Havana', region: 'caribbean', n: 'ES', x: 4915, y: 3722, m: [.9, 1.2, 1.1], w0: 850, g0: 55, yard: [0, 2, 4], ships: [4, 3] },
  { name: 'Santiago', region: 'caribbean', n: 'ES', x: 5256, y: 3900, m: [1, 1.1, 1], w0: 600, g0: 40, yard: [1, 2], ships: [2, 1] },
  { name: 'Santo Domingo', region: 'caribbean', n: 'ES', x: 5564, y: 3985, m: [1.1, .9, 1], w0: 700, g0: 48, yard: [2, 3, 4], ships: [4, 2] },
  { name: 'San Juan', region: 'caribbean', n: 'ES', x: 5788, y: 3980, m: [.9, 1, 1.2], w0: 650, g0: 45, yard: [2, 3], ships: [3, 0] },
  { name: 'Veracruz', region: 'caribbean', n: 'ES', x: 4065, y: 3858, m: [1.1, .8, 1.1], w0: 750, g0: 50, yard: [1, 2], ships: [4, 2] },
  { name: 'Campeche', region: 'caribbean', n: 'ES', x: 4436, y: 3890, m: [1, 1, 1.2], w0: 550, g0: 35, yard: [0], ships: [1, 2] },
  { name: 'Villa Hermosa', region: 'caribbean', n: 'ES', x: 4261, y: 3982, m: [.9, 1.1, 1], w0: 500, g0: 30, yard: [3], ships: [0, 1] },
  { name: 'Portobelo', region: 'caribbean', n: 'ES', x: 5035, y: 4472, m: [1, 1, 1.4], w0: 900, g0: 60, yard: [0, 3, 4], ships: [3, 1] },
  { name: 'Nombre de Dios', region: 'caribbean', n: 'ES', x: 5096, y: 4482, m: [1.1, .9, 1], w0: 450, g0: 25, yard: [1], ships: [0, 2] },
  { name: 'Cartagena', region: 'caribbean', n: 'ES', x: 5256, y: 4473, m: [1, .8, 1.2], w0: 800, g0: 55, yard: [1, 2], ships: [4, 1] },
  { name: 'Santa Marta', region: 'caribbean', n: 'ES', x: 5332, y: 4394, m: [.9, 1, 1.1], w0: 500, g0: 30, yard: [2], ships: [1] },
  { name: 'Rio de la Hacha', region: 'caribbean', n: 'ES', x: 5444, y: 4342, m: [1, 1.2, .9], w0: 400, g0: 20, yard: [0], ships: [0] },
  { name: 'Maracaibo', region: 'caribbean', n: 'ES', x: 5474, y: 4384, m: [1, .9, 1.3], w0: 600, g0: 46, yard: [0, 1], ships: [1, 2] },
  { name: 'Caracas', region: 'caribbean', n: 'ES', x: 5742, y: 4410, m: [1.1, 1, 1.1], w0: 700, g0: 45, yard: [2, 3], ships: [3] },
  { name: 'Puerto Cabello', region: 'caribbean', n: 'ES', x: 5672, y: 4418, m: [.9, 1.1, 1], w0: 450, g0: 25, yard: [1], ships: [1, 0] },
  { name: 'Cumana', region: 'caribbean', n: 'ES', x: 5883, y: 4427, m: [1, 1, 1.2], w0: 550, g0: 30, yard: [0, 4], ships: [2] },
  { name: 'Margarita', region: 'caribbean', n: 'ES', x: 5912, y: 4388, m: [1.2, .8, 1], w0: 400, g0: 20, yard: [], ships: [0] },
  { name: 'Trinidad', region: 'caribbean', n: 'ES', x: 6050, y: 4446, m: [.9, 1.2, 1.1], w0: 600, g0: 35, yard: [1, 2], ships: [2, 3] },
  { name: 'St. Augustine', region: 'caribbean', n: 'ES', x: 4978, y: 3408, m: [1, 1, 1], w0: 500, g0: 40, yard: [0, 2], ships: [1, 2] },

  // English Colonies
  { name: 'Port Royal', region: 'caribbean', n: 'EN', x: 5196, y: 4005, m: [.8, 1.1, 1.3], w0: 800, g0: 50, yard: [0, 3, 4], ships: [0, 2, 3] },
  { name: 'Barbados', region: 'caribbean', n: 'EN', x: 6145, y: 4272, m: [.9, 1.2, 1.1], w0: 650, g0: 40, yard: [1, 2, 4], ships: [2, 3] },
  { name: 'Antigua', region: 'caribbean', n: 'EN', x: 6026, y: 4026, m: [1, 1.1, 1], w0: 550, g0: 35, yard: [0, 2], ships: [1, 2] },
  { name: 'St. Kitts', region: 'caribbean', n: 'EN', x: 5967, y: 4014, m: [1.1, .9, 1.2], w0: 500, g0: 30, yard: [1], ships: [1, 0] },
  { name: 'Nevis', region: 'caribbean', n: 'EN', x: 5982, y: 4058, m: [.9, 1, 1.1], w0: 450, g0: 25, yard: [3], ships: [0] },
  { name: 'Montserrat', region: 'caribbean', n: 'EN', x: 6003, y: 4078, m: [1, 1.2, .9], w0: 400, g0: 20, yard: [], ships: [0] },
  { name: 'Grand Bahama', region: 'caribbean', n: 'EN', x: 5091, y: 3526, m: [1, 1, 1], w0: 300, g0: 10, yard: [], ships: [0] },
  { name: 'Nassau', region: 'caribbean', n: 'EN', x: 5159, y: 3617, m: [.8, 1.3, 1], w0: 450, g0: 15, yard: [0, 1], ships: [0, 1] },
  { name: 'Eleuthera', region: 'caribbean', n: 'EN', x: 5227, y: 3608, m: [1.1, 1, .9], w0: 350, g0: 15, yard: [3], ships: [0] },
  { name: 'Florida Keys', region: 'caribbean', n: 'PI', x: 4939, y: 3634, m: [1.2, 1.2, 1.2], w0: 200, g0: 5, yard: [0], ships: [0] },

  // French Colonies
  { name: 'Tortuga', region: 'caribbean', n: 'FR', x: 5380, y: 3844, m: [1, 1.2, 1], w0: 550, g0: 34, yard: [0, 2, 4], ships: [0, 2] },
  { name: 'Port-de-Paix', region: 'caribbean', n: 'FR', x: 5417, y: 3896, m: [.9, 1, 1.1], w0: 400, g0: 20, yard: [1], ships: [1] },
  { name: 'Leogane', region: 'caribbean', n: 'FR', x: 5415, y: 3981, m: [1.1, .9, 1], w0: 450, g0: 25, yard: [2], ships: [0, 1] },
  { name: 'Petit Goave', region: 'caribbean', n: 'FR', x: 5392, y: 3994, m: [1, 1.1, .9], w0: 450, g0: 25, yard: [3], ships: [0, 1] },
  { name: 'Martinique', region: 'caribbean', n: 'FR', x: 6062, y: 4192, m: [.9, 1.3, .9], w0: 600, g0: 36, yard: [0, 1, 4], ships: [0, 3] },
  { name: 'Guadeloupe', region: 'caribbean', n: 'FR', x: 6032, y: 4107, m: [1, 1, 1.2], w0: 550, g0: 30, yard: [2], ships: [1, 2] },
  { name: 'St. Martin', region: 'caribbean', n: 'FR', x: 5951, y: 3989, m: [.9, 1.1, 1], w0: 450, g0: 20, yard: [1], ships: [0] },

  // Dutch Colonies
  { name: 'Curacao', region: 'caribbean', n: 'NL', x: 5630, y: 4329, m: [1.2, .9, .8], w0: 750, g0: 45, yard: [1, 3], ships: [1, 2] },
  { name: 'St. Eustatius', region: 'caribbean', n: 'NL', x: 5955, y: 4003, m: [1, 1, .9], w0: 500, g0: 25, yard: [0, 2], ships: [1] },
  
  // Missing Manual Injections
  { name: 'Santa Catalina', region: 'caribbean', n: 'ES', x: 4860, y: 4310, m: [1, 1, 1], w0: 300, g0: 15, yard: [0], ships: [0] },

  // Global Expansion Ports
  { name: 'Lisbon', region: 'europe', n: 'ES', x: 9500, y: 2880, m: [1.1, 1, .9], w0: 1500, g0: 120, yard: [0, 1, 2, 3, 4], ships: [3, 4] },
  { name: 'Plymouth', region: 'europe', n: 'EN', x: 9770, y: 2220, m: [.9, .9, 1.3], w0: 1600, g0: 110, yard: [0, 1, 2, 3, 4], ships: [3, 4] },
  { name: 'Cape Coast', region: 'africa', n: 'EN', x: 9940, y: 4720, m: [1.3, .8, 1.5], w0: 900, g0: 60, yard: [1, 2], ships: [1, 2] },
  { name: 'Batavia', region: 'indies', n: 'NL', x: 15880, y: 5330, m: [.7, 1.5, 1.5], w0: 2500, g0: 150, yard: [0, 1, 2, 3, 4], ships: [1, 4] }
];

export const SHIPS = [
  { name: 'Sloop', price: 250, hull: 80, guns: 3, cargo: 50, spd: 1.15, crew: 40, L: 26, W: 9, m: [-4, 5], fa: 1, c: '#8a5a2b', loot: .8 },
  { name: 'Fluyt', price: 500, hull: 90, guns: 2, cargo: 140, spd: .85, crew: 40, L: 32, W: 15, m: [-8, 0, 8], fa: 0, c: '#b08540', loot: 1.6 },
  { name: 'Brigantine', price: 700, hull: 110, guns: 4, cargo: 80, spd: 1.05, crew: 60, L: 34, W: 11, m: [-6, 6], fa: 1, c: '#7a4a22', loot: 1 },
  { name: 'Frigate', price: 1200, hull: 130, guns: 6, cargo: 60, spd: 1.1, crew: 80, L: 40, W: 12, m: [-10, 0, 10], fa: 0, c: '#5e3a1c', loot: 1.2 },
  { name: 'Galleon', price: 1800, hull: 200, guns: 8, cargo: 110, spd: .78, crew: 100, L: 48, W: 18, m: [-12, -2, 9], fa: 0, c: '#4b2d14', loot: 2 }
];

export const CAPS = [
  { name: 'Calico Jack', region: 'caribbean', ship: 'Curlew', t: 0, hp: 1.2, crew: 1.2, g: 3, rate: 1.1, spd: 1.15, loot: 2 },
  { name: 'Anne Bonny', region: 'caribbean', ship: 'William', t: 2, hp: 1.4, crew: 1.3, g: 2, rate: 1.2, spd: 1.1, loot: 2.5 },
  { name: 'Charles Vane', region: 'caribbean', ship: 'Ranger', t: 2, hp: 1.6, crew: 1.5, g: 2, rate: 1.25, spd: 1.1, loot: 3 },
  { name: 'Blackbeard', region: 'caribbean', ship: 'Queen Anne’s Revenge', t: 3, hp: 2.2, crew: 2.0, g: 4, rate: 1.4, spd: 1.05, loot: 6 },
  { name: 'Samuel Bellamy', region: 'caribbean', ship: 'Whydah', t: 4, hp: 2.0, crew: 1.8, g: 3, rate: 1.3, spd: 1.0, loot: 8 },
  { name: 'Edward Low', region: 'europe', ship: 'Fortune', t: 3, hp: 1.8, crew: 1.6, g: 3, rate: 1.3, spd: 1.05, loot: 4 },
  { name: 'Black Bart', region: 'africa', ship: 'Royal Fortune', t: 3, hp: 2.4, crew: 2.2, g: 4, rate: 1.4, spd: 1.12, loot: 7 },
  { name: 'Henry Every', region: 'indies', ship: 'Fancy', t: 4, hp: 2.8, crew: 2.5, g: 5, rate: 1.5, spd: 1.1, loot: 10 },
  { name: 'Ching Shih', region: 'indies', ship: 'Red Flag', t: 4, hp: 3.5, crew: 3.0, g: 6, rate: 1.6, spd: 1.2, loot: 15 }
];