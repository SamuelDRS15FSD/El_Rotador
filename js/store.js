/**
 * store.js - Módulo de datos/estado para El Rotador
 * Gestiona LocalStorage y toda la lógica de negocio
 */

// Clave de almacenamiento en LocalStorage
const STORAGE_KEY = 'elRotador';

// ============================================================
// Helpers internos
// ============================================================

/**
 * Lee el estado completo desde LocalStorage
 * @returns {{ products: Array, priceRequests: Array, settings: Object }}
 */
function _loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error leyendo LocalStorage:', e);
  }
  // Estado inicial por defecto
  return {
    products: [],
    priceRequests: [],
    settings: { mondayHoliday: false }
  };
}

/**
 * Persiste el estado completo en LocalStorage
 * @param {Object} state
 */
function _saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Error guardando en LocalStorage:', e);
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
 * @param {Object} product - Datos del producto (sin id ni createdAt)
 * @returns {Object} Producto creado con id y createdAt
 */
export function addProduct(product) {
  const state = _loadState();
  const newProduct = {
    id: _generateId(),
    name: product.name || '',
    plu: product.plu || '',
    expiryDate: product.expiryDate || '',
    section: product.section || 'autoservicio',
    measureType: product.measureType || 'unidades',
    notes: product.notes || '',
    createdAt: new Date().toISOString()
  };
  state.products.push(newProduct);
  _saveState(state);
  return newProduct;
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

  // Mezclar datos existentes con los nuevos
  state.products[index] = { ...state.products[index], ...data };
  _saveState(state);
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
// Vencimientos - Cálculos y alertas
// ============================================================

/**
 * Calcula los días restantes hasta el vencimiento
 * @param {string} expiryDate - Fecha de vencimiento en formato ISO (YYYY-MM-DD)
 * @returns {number} Días restantes (negativo si ya venció)
 */
export function getDaysUntilExpiry(expiryDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate + 'T00:00:00');
  const diffMs = expiry - today;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Determina el nivel de alerta según los días restantes
 * @param {number} daysRemaining - Días hasta el vencimiento
 * @returns {'ok'|'warning'|'urgent'|'critical'} Nivel de alerta
 */
export function getAlertLevel(daysRemaining) {
  if (daysRemaining <= 1) return 'critical';   // ≤1 día o vencido → rojo
  if (daysRemaining <= 3) return 'urgent';     // ≤3 días → naranja
  if (daysRemaining <= 6) return 'warning';    // ≤6 días → amarillo
  return 'ok';                                  // >6 días → verde
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
    quantity: request.quantity || 0,
    unit: request.unit || 'unidades',
    priceRequested: request.priceRequested || false,
    priceGiven: request.priceGiven || false
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
 * Obtiene productos que necesitan solicitar precio (próximos a vencer)
 * Filtra productos con ≤6 días de vencimiento en la sección indicada
 * @param {string} [section] - Sección opcional para filtrar
 * @returns {Array} Productos que necesitan precio
 */
export function getProductsNeedingPrices(section) {
  let products = section ? getProductsBySection(section) : getAllProducts();
  return products.filter(p => {
    const days = getDaysUntilExpiry(p.expiryDate);
    return days <= 6; // Productos en warning, urgent o critical
  });
}

/**
 * Determina si la fecha dada es un día de pedir precios
 * Días de pedir: Lunes (1) y Jueves (4)
 * Si lunes es festivo, se traslada al martes (2)
 * @param {Date} date - Fecha a evaluar
 * @param {boolean} mondayHoliday - Si el lunes es festivo
 * @returns {boolean}
 */
export function isPriceRequestDay(date, mondayHoliday) {
  const day = date.getDay(); // 0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb

  // Jueves siempre es día de pedir
  if (day === 4) return true;

  // Si lunes NO es festivo, lunes es día de pedir
  if (!mondayHoliday && day === 1) return true;

  // Si lunes ES festivo, martes es día de pedir en su lugar
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
  // Avanzar hasta encontrar un día de pedir (máximo 7 iteraciones)
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

    // Validar estructura mínima
    if (!data || typeof data !== 'object') {
      throw new Error('Formato de datos inválido');
    }

    // Asegurar que las propiedades principales existen
    const state = {
      products: Array.isArray(data.products) ? data.products : [],
      priceRequests: Array.isArray(data.priceRequests) ? data.priceRequests : [],
      settings: data.settings || { mondayHoliday: false }
    };

    _saveState(state);
    return true;
  } catch (e) {
    console.error('Error importando datos:', e);
    throw new Error('No se pudieron importar los datos: ' + e.message);
  }
}
