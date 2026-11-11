/**
 * store.js - Módulo de datos/estado para Rotador PWA
 * Gestiona IndexedDB, LocalStorage, Catálogo Maestro y lógica de negocio
 */

import * as db from './db.js';

// Clave de almacenamiento en LocalStorage (compatibilidad y fallback)
const STORAGE_KEY = 'rotadorData';
const LEGACY_STORAGE_KEY = 'elRotador';

// Catálogo Maestro inicial predeterminado con productos de carnicería / supermercado
const DEFAULT_MASTER_CATALOG = [
  { name: 'Bife de Chorizo Premium', code: '7791234567890', provider: 'Frigorífico Central', measureType: 'kilogramos', section: 'autoservicio' },
  { name: 'Pechuga de Pollo Fresca', code: '7792345678901', provider: 'Avícola San Marcos', measureType: 'kilogramos', section: 'autoservicio' },
  { name: 'Hamburguesas Caseras x4', code: '7793456789012', provider: 'Elaboración Propia', measureType: 'unidades', section: 'autoservicio' },
  { name: 'Colita de Cuadril Envasada', code: '7794567890123', provider: 'Frigorífico Pampeano', measureType: 'kilogramos', section: 'autoservicio' },
  { name: 'Milanesas de Carne Preparadas', code: '4011', provider: 'Elaboración Mostrador', measureType: 'kilogramos', section: 'atendida' },
  { name: 'Chorizo Bombón Especial', code: '4022', provider: 'Embutidos Artesanales', measureType: 'kilogramos', section: 'atendida' },
  { name: 'Matambre de Cerdo', code: '4033', provider: 'Cabaña Porcina', measureType: 'kilogramos', section: 'atendida' },
  { name: 'Asado de Tira Especial', code: '4044', provider: 'Frigorífico Central', measureType: 'kilogramos', section: 'atendida' },
  { name: 'Lomo Fino Vacuno', code: '4055', provider: 'Frigorífico Pampeano', measureType: 'kilogramos', section: 'atendida' },
  { name: 'Bondiola de Cerdo', code: '4066', provider: 'Cabaña Porcina', measureType: 'kilogramos', section: 'atendida' },
  { name: 'Pollo Entero Grado A', code: '7795678901234', provider: 'Avícola San Marcos', measureType: 'unidades', section: 'autoservicio' },
  { name: 'Piqueo Parrillero x10', code: '7796789012345', provider: 'Elaboración Propia', measureType: 'unidades', section: 'autoservicio' }
];

// Estado en memoria
let currentState = null;

// ============================================================
// Helpers internos y Persistencia Local Dual (IndexedDB + LocalStorage)
// ============================================================

/**
 * Lee el estado completo desde LocalStorage o memoria
 * @returns {{ products: Array, priceRequests: Array, masterCatalog: Array, settings: Object }}
 */
function _loadState() {
  if (currentState) return currentState;

  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    // Migración transparente si existía bajo la clave previa
    if (!raw) {
      raw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw) {
        localStorage.setItem(STORAGE_KEY, raw);
      }
    }

    if (raw) {
      const parsed = JSON.parse(raw);
      if (!parsed.masterCatalog || !Array.isArray(parsed.masterCatalog) || parsed.masterCatalog.length === 0) {
        parsed.masterCatalog = [...DEFAULT_MASTER_CATALOG];
      }
      currentState = parsed;
      return currentState;
    }
  } catch (e) {
    console.error('Error leyendo LocalStorage:', e);
  }

  // Estado inicial por defecto
  currentState = {
    products: [],
    priceRequests: [],
    masterCatalog: [...DEFAULT_MASTER_CATALOG],
    settings: { mondayHoliday: false }
  };
  return currentState;
}

/**
 * Persiste el estado completo en LocalStorage e IndexedDB
 * @param {Object} state
 */
function _saveState(state) {
  currentState = state;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Error guardando en LocalStorage:', e);
  }

  // Sincronizar de forma asíncrona con IndexedDB
  try {
    db.dbSaveProducts(state.products || []);
    db.dbSavePriceRequests(state.priceRequests || []);
    db.dbSaveMasterCatalog(state.masterCatalog || []);
  } catch (e) {
    console.warn('Error sincronizando con IndexedDB:', e);
  }
}

/**
 * Inicializa la persistencia IndexedDB y recupera datos almacenados
 * @returns {Promise<void>}
 */
export async function initStore() {
  try {
    await db.initDB();
    const idbProducts = await db.dbLoadProducts();
    const idbRequests = await db.dbLoadPriceRequests();
    const idbCatalog = await db.dbLoadMasterCatalog();

    const state = _loadState();

    // Si IndexedDB tiene más datos que LocalStorage, sincronizar
    if (idbProducts && idbProducts.length > state.products.length) {
      state.products = idbProducts;
    }
    if (idbRequests && idbRequests.length > state.priceRequests.length) {
      state.priceRequests = idbRequests;
    }
    if (idbCatalog && idbCatalog.length > state.masterCatalog.length) {
      state.masterCatalog = idbCatalog;
    }

    _saveState(state);
  } catch (err) {
    console.warn('Persistencia inicial usando LocalStorage:', err);
  }
}

/**
 * Genera un ID único basado en timestamp + aleatorio
 * @returns {string}
 */
function _generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

// ============================================================
// Diferenciación Inteligente de Códigos (PLU vs EAN)
// ============================================================

/**
 * Evalúa el código numérico:
 * - 1 a 6 dígitos: PLU (Product Look-Up)
 * - 7 o más dígitos: EAN (código de barras comercial)
 * @param {string|number} code - Código a evaluar
 * @returns {{ type: 'PLU'|'EAN'|null, label: string, code: string }}
 */
export function formatCodeInfo(code) {
  if (!code) return { type: null, label: 'Sin código', code: '' };
  const str = String(code).trim();
  const digits = str.replace(/\D/g, '');

  if (!digits) {
    return { type: null, label: 'Sin código', code: '' };
  }

  if (digits.length >= 1 && digits.length <= 6) {
    return { type: 'PLU', label: `PLU: ${digits}`, code: digits };
  }

  return { type: 'EAN', label: `EAN: ${digits}`, code: digits };
}

// ============================================================
// Catálogo Maestro de Productos
// ============================================================

/**
 * Obtiene la lista completa del catálogo maestro
 * @returns {Array} Catálogo maestro
 */
export function getMasterCatalog() {
  const state = _loadState();
  return state.masterCatalog || [];
}

/**
 * Agrega o actualiza un ítem en el Catálogo Maestro
 * @param {{ name: string, code?: string, provider?: string, measureType?: string, section?: string }} item
 */
export function addToMasterCatalog(item) {
  if (!item || !item.name) return;
  const state = _loadState();
  if (!state.masterCatalog) state.masterCatalog = [];

  const cleanName = item.name.trim();
  const cleanCode = (item.code || item.plu || '').trim();

  let idx = -1;
  if (cleanCode) {
    idx = state.masterCatalog.findIndex(entry => entry.code && entry.code.toLowerCase() === cleanCode.toLowerCase());
  }
  if (idx === -1) {
    idx = state.masterCatalog.findIndex(entry => entry.name.toLowerCase() === cleanName.toLowerCase());
  }

  const catalogEntry = {
    name: cleanName,
    code: cleanCode || (idx !== -1 ? state.masterCatalog[idx].code : ''),
    provider: (item.provider || item.proveedor || (idx !== -1 ? state.masterCatalog[idx].provider : '')).trim(),
    measureType: item.measureType || (idx !== -1 ? state.masterCatalog[idx].measureType : 'unidades'),
    section: item.section || (idx !== -1 ? state.masterCatalog[idx].section : 'autoservicio')
  };

  if (idx !== -1) {
    state.masterCatalog[idx] = { ...state.masterCatalog[idx], ...catalogEntry };
  } else {
    state.masterCatalog.push(catalogEntry);
  }

  _saveState(state);
  return catalogEntry;
}

/**
 * Busca un producto en el catálogo maestro por su código exacto
 * @param {string} code - Código PLU o EAN
 * @returns {Object|null}
 */
export function findMasterCatalogByCode(code) {
  if (!code) return null;
  const clean = String(code).trim().toLowerCase();
  const catalog = getMasterCatalog();
  return catalog.find(item => item.code && item.code.toLowerCase() === clean) || null;
}

/**
 * Busca un producto en el catálogo maestro por coincidencia de nombre
 * @param {string} name - Nombre o término
 * @returns {Object|null}
 */
export function findMasterCatalogByName(name) {
  if (!name) return null;
  const clean = String(name).trim().toLowerCase();
  const catalog = getMasterCatalog();
  return catalog.find(item => item.name.toLowerCase() === clean) || null;
}

// ============================================================
// Productos - CRUD
// ============================================================

/**
 * Obtiene todos los productos
 * @returns {Array} Lista de productos
 */
export function getAllProducts() {
  const state = _loadState();
  return state.products;
}

/**
 * Obtiene productos filtrados por sección
 * @param {'autoservicio'|'atendida'} section - Sección del supermercado
 * @returns {Array} Productos de la sección indicada
 */
export function getProductsBySection(section) {
  const products = getAllProducts();
  return products.filter(p => p.section === section);
}

/**
 * Agrega un nuevo producto
 * @param {Object} product - Datos del producto
 * @returns {Object} Producto creado
 */
export function addProduct(product) {
  const state = _loadState();
  const rawQuantity = product.cantidad !== undefined ? product.cantidad : (product.quantity !== undefined ? product.quantity : 0);
  const parsedQuantity = Number(rawQuantity) || 0;
  const provider = (product.provider || product.proveedor || '').trim();

  const newProduct = {
    id: _generateId(),
    name: (product.name || '').trim(),
    plu: (product.plu || product.code || '').trim(),
    expiryDate: product.expiryDate || '',
    section: product.section || 'autoservicio',
    measureType: product.measureType || 'unidades',
    cantidad: parsedQuantity,
    quantity: parsedQuantity,
    provider: provider,
    proveedor: provider,
    notes: (product.notes || '').trim(),
    createdAt: new Date().toISOString()
  };

  state.products.push(newProduct);
  _saveState(state);

  // Auto-alimentar el Catálogo Maestro
  if (newProduct.name) {
    addToMasterCatalog({
      name: newProduct.name,
      code: newProduct.plu,
      provider: provider,
      measureType: newProduct.measureType,
      section: newProduct.section
    });
  }

  return newProduct;
}

/**
 * Agrega múltiples productos en lote (ej. importación desde PDF)
 * @param {Array<Object>} productsList
 * @returns {number} Cantidad de productos importados
 */
export function addBatchProducts(productsList) {
  if (!Array.isArray(productsList) || productsList.length === 0) return 0;
  let count = 0;
  for (const item of productsList) {
    if (item.name && item.name.trim()) {
      addProduct(item);
      count++;
    }
  }
  return count;
}

/**
 * Actualiza un producto existente
 * @param {string} id - ID del producto
 * @param {Object} data - Campos a actualizar
 * @returns {Object|null} Producto actualizado o null si no existe
 */
export function updateProduct(id, data) {
  const state = _loadState();
  const index = state.products.findIndex(p => p.id === id);
  if (index === -1) return null;

  const updatedData = { ...data };
  if (updatedData.cantidad !== undefined || updatedData.quantity !== undefined) {
    const qty = Number(updatedData.cantidad !== undefined ? updatedData.cantidad : updatedData.quantity) || 0;
    updatedData.cantidad = qty;
    updatedData.quantity = qty;
  }
  if (updatedData.provider !== undefined || updatedData.proveedor !== undefined) {
    const prov = (updatedData.provider || updatedData.proveedor || '').trim();
    updatedData.provider = prov;
    updatedData.proveedor = prov;
  }

  state.products[index] = { ...state.products[index], ...updatedData };
  _saveState(state);

  if (state.products[index].name) {
    addToMasterCatalog({
      name: state.products[index].name,
      code: state.products[index].plu,
      provider: state.products[index].provider,
      measureType: state.products[index].measureType,
      section: state.products[index].section
    });
  }

  return state.products[index];
}

/**
 * Elimina un producto por ID
 * @param {string} id - ID del producto a eliminar
 * @returns {boolean} true si se eliminó, false si no existía
 */
export function deleteProduct(id) {
  const state = _loadState();
  const initialLength = state.products.length;
  state.products = state.products.filter(p => p.id !== id);
  if (state.products.length < initialLength) {
    _saveState(state);
    return true;
  }
  return false;
}

/**
 * Obtiene un producto por su ID
 * @param {string} id
 * @returns {Object|null} Producto encontrado o null
 */
export function getProduct(id) {
  const products = getAllProducts();
  return products.find(p => p.id === id) || null;
}

// ============================================================
// Vencimientos - Cálculos, Alertas por Colores y Prioridades
// ============================================================

/**
 * Calcula los días restantes hasta el vencimiento
 * @param {string} expiryDate - Fecha de vencimiento en formato ISO (YYYY-MM-DD)
 * @returns {number} Días restantes (negativo si ya venció)
 */
export function getDaysUntilExpiry(expiryDate) {
  if (!expiryDate) return 999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate + 'T00:00:00');
  const diffMs = expiry - today;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Determina el nivel de alerta cromática según los días restantes:
 * - > 6 días: 'ok' (Verde - Óptimo)
 * - 4 a 6 días: 'warning' (Amarillo - Precaución)
 * - 2 a 3 días: 'urgent' (Naranja - Urgente)
 * - ≤ 1 día o vencido: 'critical' (Rojo - Crítico)
 * @param {number} daysRemaining - Días hasta el vencimiento
 * @returns {'ok'|'warning'|'urgent'|'critical'} Nivel de alerta
 */
export function getAlertLevel(daysRemaining) {
  if (daysRemaining <= 1) return 'critical';
  if (daysRemaining <= 3) return 'urgent';
  if (daysRemaining <= 6) return 'warning';
  return 'ok';
}

/**
 * Obtiene los productos prioritarios que requieren mayor atención urgente (≤ 3 días o vencidos)
 * @returns {Array<Object>} Lista de productos críticos y urgentes ordenados por fecha
 */
export function getPriorityProducts() {
  const products = getAllProducts();
  const urgentItems = products.filter(p => {
    const days = getDaysUntilExpiry(p.expiryDate);
    return days <= 3; // Críticos (≤1 día/vencidos) y urgentes (2-3 días)
  });

  urgentItems.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
  return urgentItems;
}

// ============================================================
// Pedir Precios
// ============================================================

/**
 * Obtiene las solicitudes de precios de una fecha específica
 * @param {string} date - Fecha en formato YYYY-MM-DD
 * @returns {Array} Solicitudes de precio para esa fecha
 */
export function getPriceRequests(date) {
  const state = _loadState();
  return state.priceRequests.filter(pr => pr.date === date);
}

/**
 * Guarda una nueva solicitud de precio
 * @param {Object} request - Datos de la solicitud
 * @returns {Object} Solicitud creada con ID
 */
export function savePriceRequest(request) {
  const state = _loadState();
  const newRequest = {
    id: _generateId(),
    productId: request.productId || '',
    date: request.date || new Date().toISOString().split('T')[0],
    quantity: Number(request.quantity) || 0,
    unit: request.unit || 'unidades',
    priceRequested: !!request.priceRequested,
    priceGiven: !!request.priceGiven
  };
  state.priceRequests.push(newRequest);
  _saveState(state);
  return newRequest;
}

/**
 * Actualiza una solicitud de precio existente
 * @param {string} id - ID de la solicitud
 * @param {Object} data - Campos a actualizar
 * @returns {Object|null} Solicitud actualizada o null
 */
export function updatePriceRequest(id, data) {
  const state = _loadState();
  const index = state.priceRequests.findIndex(pr => pr.id === id);
  if (index === -1) return null;

  state.priceRequests[index] = { ...state.priceRequests[index], ...data };
  _saveState(state);
  return state.priceRequests[index];
}

/**
 * Obtiene productos que necesitan solicitar precio (≤6 días de vencimiento)
 * @param {string} [section] - Sección opcional para filtrar
 * @returns {Array} Productos que necesitan precio
 */
export function getProductsNeedingPrices(section) {
  let products = section ? getProductsBySection(section) : getAllProducts();
  return products.filter(p => {
    const days = getDaysUntilExpiry(p.expiryDate);
    return days <= 6;
  });
}

/**
 * Determina si la fecha dada es un día de pedir precios
 * Regla de negocio:
 * - Días habituales: Lunes (1) y Jueves (4)
 * - Si lunes es festivo: el lunes se traslada al martes (2) y se mantiene el jueves (4)
 * @param {Date} date - Fecha a evaluar
 * @param {boolean} mondayHoliday - Si el lunes es festivo
 * @returns {boolean}
 */
export function isPriceRequestDay(date, mondayHoliday) {
  const day = date.getDay();

  if (day === 4) return true;
  if (!mondayHoliday && day === 1) return true;
  if (mondayHoliday && day === 2) return true;

  return false;
}

/**
 * Calcula el próximo día de pedir precios a partir de una fecha
 * @param {Date} date - Fecha de referencia
 * @param {boolean} mondayHoliday - Si el lunes es festivo
 * @returns {Date} Próximo día de pedir
 */
export function getNextPriceRequestDay(date, mondayHoliday) {
  const next = new Date(date);
  for (let i = 0; i < 7; i++) {
    next.setDate(next.getDate() + 1);
    if (isPriceRequestDay(next, mondayHoliday)) {
      return next;
    }
  }
  return next;
}

// ============================================================
// Configuración
// ============================================================

/**
 * Obtiene la configuración actual
 * @returns {Object} Configuración
 */
export function getSettings() {
  const state = _loadState();
  return state.settings || { mondayHoliday: false };
}

/**
 * Guarda la configuración
 * @param {Object} settings - Nueva configuración
 */
export function saveSettings(settings) {
  const state = _loadState();
  state.settings = { ...state.settings, ...settings };
  _saveState(state);
}

// ============================================================
// Exportar / Importar datos
// ============================================================

/**
 * Exporta todos los datos como string JSON
 * @returns {string} JSON con todos los datos
 */
export function exportData() {
  const state = _loadState();
  return JSON.stringify(state, null, 2);
}

/**
 * Importa datos desde un string JSON
 * Reemplaza completamente el estado actual
 * @param {string} jsonString - Datos en formato JSON
 * @returns {boolean} true si la importación fue exitosa
 * @throws {Error} Si el JSON es inválido o la estructura no es correcta
 */
export function importData(jsonString) {
  try {
    const data = JSON.parse(jsonString);

    if (!data || typeof data !== 'object') {
      throw new Error('Formato de datos inválido');
    }

    const state = {
      products: Array.isArray(data.products) ? data.products : [],
      priceRequests: Array.isArray(data.priceRequests) ? data.priceRequests : [],
      masterCatalog: Array.isArray(data.masterCatalog) && data.masterCatalog.length > 0 ? data.masterCatalog : [...DEFAULT_MASTER_CATALOG],
      settings: data.settings || { mondayHoliday: false }
    };

    _saveState(state);
    return true;
  } catch (e) {
    console.error('Error importando datos:', e);
    throw new Error('No se pudieron importar los datos: ' + e.message);
  }
}
