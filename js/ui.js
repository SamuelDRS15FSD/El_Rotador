/**
 * ui.js - Módulo de interfaz/renderizado para El Rotador
 * Totalmente sincronizado con index.html y store.js
 */

import * as store from './store.js';
import * as scanner from './scanner.js';

// Estado de la interfaz
let currentSection = 'autoservicio';
let currentSort = 'date'; // 'date' | 'name'
let currentFilter = 'all'; // 'all' | 'expired' | 'today'
let searchQuery = '';
let editingProductId = null;
let productToDeleteId = null;

// ============================================================
// NAVEGACIÓN ENTRE VISTAS
// ============================================================

export function showView(viewId) {
  // Ocultar todas las vistas
  document.querySelectorAll('.view').forEach(view => {
    view.classList.remove('active');
  });

  // Mostrar la vista seleccionada
  const target = document.getElementById(viewId);
  if (target) {
    target.classList.add('active');
  }

  // Actualizar estado de navegación inferior
  document.querySelectorAll('.nav-btn').forEach(btn => {
    const isTarget = btn.getAttribute('data-view') === viewId;
    if (isTarget) {
      btn.classList.add('text-action');
      btn.classList.remove('text-text-secondary');
    } else {
      btn.classList.remove('text-action');
      btn.classList.add('text-text-secondary');
    }
  });

  // Acciones al cambiar de vista
  if (viewId === 'view-inventory') {
    renderProductList();
  } else if (viewId === 'view-pedir-precios') {
    renderPedirPrecios();
  } else if (viewId === 'view-settings') {
    renderSettings();
  }
}

// ============================================================
// GESTIÓN DE FECHA EN HEADER
// ============================================================

export function updateHeaderDate() {
  const headerDateEl = document.getElementById('header-date');
  if (!headerDateEl) return;
  const now = new Date();
  const options = { weekday: 'short', day: 'numeric', month: 'short' };
  headerDateEl.textContent = now.toLocaleDateString('es-ES', options);
}

// ============================================================
// LISTA DE PRODUCTOS (INVENTARIO)
// ============================================================

export function setSection(section) {
  currentSection = section;
  
  // Actualizar tabs visuales
  document.querySelectorAll('.inventory-tab').forEach(tab => {
    const isCurrent = tab.getAttribute('data-section') === section;
    if (isCurrent) {
      tab.classList.add('border-action', 'text-action');
      tab.classList.remove('border-transparent', 'text-text-secondary');
    } else {
      tab.classList.remove('border-action', 'text-action');
      tab.classList.add('border-transparent', 'text-text-secondary');
    }
  });

  renderProductList();
}

export function setSearchQuery(query) {
  searchQuery = (query || '').trim().toLowerCase();
  renderProductList();
}

export function setSort(sortType) {
  currentSort = sortType;
  document.querySelectorAll('.sort-chip').forEach(chip => {
    if (chip.getAttribute('data-sort') === sortType) {
      chip.classList.add('bg-action/20', 'text-action', 'border-action/30');
      chip.classList.remove('bg-surface-light', 'text-text-secondary', 'border-transparent');
    } else {
      chip.classList.remove('bg-action/20', 'text-action', 'border-action/30');
      chip.classList.add('bg-surface-light', 'text-text-secondary', 'border-transparent');
    }
  });
  renderProductList();
}

export function setFilter(filterType) {
  // Toggle filter
  if (currentFilter === filterType) {
    currentFilter = 'all';
  } else {
    currentFilter = filterType;
  }

  document.querySelectorAll('.filter-chip').forEach(chip => {
    if (chip.getAttribute('data-filter') === currentFilter) {
      chip.classList.add('bg-action/20', 'text-action', 'border-action/30');
      chip.classList.remove('bg-surface-light', 'text-text-secondary', 'border-transparent');
    } else {
      chip.classList.remove('bg-action/20', 'text-action', 'border-action/30');
      chip.classList.add('bg-surface-light', 'text-text-secondary', 'border-transparent');
    }
  });
  renderProductList();
}

export function renderProductList() {
  const container = document.getElementById('product-list');
  const emptyState = document.getElementById('inventory-empty');
  if (!container) return;

  let products = store.getProductsBySection(currentSection);

  // Filtro por texto de búsqueda
  if (searchQuery) {
    products = products.filter(p => {
      const name = (p.name || '').toLowerCase();
      const code = (p.plu || '').toLowerCase();
      const notes = (p.notes || '').toLowerCase();
      return name.includes(searchQuery) || code.includes(searchQuery) || notes.includes(searchQuery);
    });
  }

  // Filtro por estado de vencimiento
  if (currentFilter === 'expired') {
    products = products.filter(p => store.getDaysUntilExpiry(p.expiryDate) < 0);
  } else if (currentFilter === 'today') {
    products = products.filter(p => store.getDaysUntilExpiry(p.expiryDate) === 0);
  }

  // Ordenamiento
  if (currentSort === 'name') {
    products.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  } else {
    // Por vencimiento (más urgente primero)
    products.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
  }

  // Manejo de estado vacío
  if (products.length === 0) {
    container.innerHTML = '';
    if (emptyState) {
      emptyState.classList.remove('hidden');
      emptyState.classList.add('flex');
    }
    return;
  }

  if (emptyState) {
    emptyState.classList.add('hidden');
    emptyState.classList.remove('flex');
  }

  // Configuración de colores según nivel de alerta
  // 6 días: amarillo, 3 días: naranja, <=1 o vencido: rojo, >6 días: verde
  const alertStyles = {
    ok: {
      border: 'border-exp-green',
      badgeBg: 'bg-exp-green/20',
      badgeText: 'text-exp-green'
    },
    warning: {
      border: 'border-exp-yellow',
      badgeBg: 'bg-exp-yellow/20',
      badgeText: 'text-exp-yellow'
    },
    urgent: {
      border: 'border-exp-orange',
      badgeBg: 'bg-exp-orange/20',
      badgeText: 'text-exp-orange'
    },
    critical: {
      border: 'border-exp-red',
      badgeBg: 'bg-exp-red/20',
      badgeText: 'text-exp-red'
    }
  };

  container.innerHTML = products.map(p => {
    const days = store.getDaysUntilExpiry(p.expiryDate);
    const alertLevel = store.getAlertLevel(days);
    const style = alertStyles[alertLevel] || alertStyles.ok;

    let daysLabel = '';
    if (days < 0) {
      daysLabel = `Venció hace ${Math.abs(days)}d`;
    } else if (days === 0) {
      daysLabel = 'Vence HOY';
    } else if (days === 1) {
      daysLabel = 'Vence mañana';
    } else {
      daysLabel = `${days} días`;
    }

    const formattedDate = formatDateDisplay(p.expiryDate);
    const isKg = p.measureType === 'kilogramos' || p.measureType === 'kg';
    const measureLabel = isKg ? 'Kg' : 'Unidades';
    const unitShort = isKg ? 'kg' : 'uds';
    const stockDisplay = (p.quantity !== undefined && p.quantity !== null && p.quantity !== '')
      ? `<span class="bg-surface px-2 py-0.5 rounded text-white font-medium border border-accent/30">Stock: <strong class="text-action">${p.quantity} ${unitShort}</strong></span>`
      : `<span>${measureLabel}</span>`;

    return `
      <div class="product-card bg-surface-light rounded-xl p-4 border-l-4 ${style.border} active:scale-[0.99] transition-transform cursor-pointer shadow-md"
           data-id="${p.id}">
        <div class="flex justify-between items-start">
          <div class="flex-1 min-w-0 pr-2">
            <h3 class="font-semibold text-sm text-white truncate">${escapeHtml(p.name)}</h3>
            <div class="text-xs text-text-secondary mt-1 flex flex-wrap items-center gap-1.5">
              ${p.plu ? `<span>PLU/EAN: <strong class="text-text-primary font-mono">${escapeHtml(p.plu)}</strong></span> · ` : ''}
              ${stockDisplay}
            </div>
          </div>
          <div class="text-right flex-shrink-0">
            <span class="text-xs font-bold px-2.5 py-1 rounded-full ${style.badgeBg} ${style.badgeText}">
              ${daysLabel}
            </span>
          </div>
        </div>
        <div class="flex justify-between items-center mt-2.5 pt-2 border-t border-accent/20 text-xs text-text-secondary">
          <span>📅 Vence: <strong class="text-text-primary">${formattedDate}</strong></span>
          ${p.notes ? `<span class="italic truncate max-w-[150px] text-text-secondary/70">📝 ${escapeHtml(p.notes)}</span>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// ============================================================
// FORMULARIO AGREGAR / EDITAR PRODUCTO
// ============================================================

export function openAddProductForm(productId = null) {
  editingProductId = productId;
  const form = document.getElementById('product-form');
  const title = document.getElementById('add-product-title');
  const btnDelete = document.getElementById('btn-delete-product');

  if (!form) return;

  if (productId) {
    const product = store.getProduct(productId);
    if (!product) return;

    if (title) title.textContent = 'Editar Producto';
    if (btnDelete) btnDelete.classList.remove('hidden');

    document.getElementById('product-name').value = product.name || '';
    document.getElementById('product-code').value = product.plu || '';
    document.getElementById('product-expiry').value = product.expiryDate || '';
    document.getElementById('product-section').value = product.section || currentSection;
    document.getElementById('product-notes').value = product.notes || '';

    const qtyInput = document.getElementById('product-quantity');
    if (qtyInput) {
      qtyInput.value = (product.quantity !== undefined && product.quantity !== null && product.quantity !== '') ? product.quantity : '';
    }

    const isKg = product.measureType === 'kilogramos' || product.measureType === 'kg';
    const unitEl = document.getElementById('product-quantity-unit');
    if (unitEl) unitEl.textContent = isKg ? 'Kg' : 'Uds';

    const measureRadios = form.querySelectorAll('input[name="measure"]');
    measureRadios.forEach(radio => {
      radio.checked = isKg ? radio.value === 'kilogramos' : radio.value === 'unidades';
    });
  } else {
    form.reset();
    if (title) title.textContent = 'Agregar Producto';
    if (btnDelete) btnDelete.classList.add('hidden');

    const qtyInput = document.getElementById('product-quantity');
    if (qtyInput) qtyInput.value = '';
    const unitEl = document.getElementById('product-quantity-unit');
    if (unitEl) unitEl.textContent = 'Uds';

    // Preseleccionar sección actual
    const sectionSelect = document.getElementById('product-section');
    if (sectionSelect) sectionSelect.value = currentSection;

    // Fecha por defecto: hoy + 3 días
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 3);
    const dateInput = document.getElementById('product-expiry');
    if (dateInput) {
      dateInput.value = defaultDate.toISOString().split('T')[0];
    }
  }

  showView('view-add-product');
  setTimeout(() => {
    const nameInput = document.getElementById('product-name');
    if (nameInput) nameInput.focus();
  }, 100);
}

export function saveProductFromForm() {
  const name = document.getElementById('product-name').value.trim();
  const plu = document.getElementById('product-code').value.trim();
  const expiryDate = document.getElementById('product-expiry').value;
  const section = document.getElementById('product-section').value;
  const notes = document.getElementById('product-notes').value.trim();
  const quantityRaw = document.getElementById('product-quantity') ? document.getElementById('product-quantity').value : '';
  const quantity = quantityRaw !== '' ? Number(quantityRaw) : 0;

  const selectedMeasure = document.querySelector('input[name="measure"]:checked');
  const measureType = selectedMeasure ? selectedMeasure.value : 'unidades';

  if (!name) {
    showToast('Ingresa el nombre del producto', 'warning');
    return false;
  }

  if (!expiryDate) {
    showToast('Selecciona la fecha de vencimiento', 'warning');
    return false;
  }

  const productData = {
    name,
    plu,
    expiryDate,
    section,
    measureType,
    quantity,
    notes
  };

  if (editingProductId) {
    store.updateProduct(editingProductId, productData);
    showToast('Producto actualizado correctamente', 'success');
  } else {
    store.addProduct(productData);
    showToast('Producto agregado con éxito', 'success');
  }

  // Si se cambió de sección, asegurar que el tab coincida
  setSection(section);
  showView('view-inventory');
  return true;
}

// ============================================================
// CONFIRMACIÓN DE ELIMINACIÓN
// ============================================================

export function promptDeleteProduct(productId) {
  productToDeleteId = productId || editingProductId;
  if (!productToDeleteId) return;

  const product = store.getProduct(productToDeleteId);
  const modal = document.getElementById('modal-confirm-delete');
  const nameEl = document.getElementById('confirm-delete-name');

  if (nameEl && product) {
    nameEl.textContent = `¿Seguro que deseas eliminar "${product.name}"? Esta acción no se puede deshacer.`;
  }

  if (modal) {
    modal.classList.remove('hidden');
  }
}

export function closeDeleteConfirm() {
  productToDeleteId = null;
  const modal = document.getElementById('modal-confirm-delete');
  if (modal) {
    modal.classList.add('hidden');
  }
}

export function executeDeleteProduct() {
  if (!productToDeleteId) return;
  store.deleteProduct(productToDeleteId);
  closeDeleteConfirm();
  showToast('Producto eliminado', 'info');
  showView('view-inventory');
}

// ============================================================
// ESCÁNER DE CÓDIGO DE BARRAS
// ============================================================

export async function openScanner() {
  const modal = document.getElementById('modal-scanner');
  const video = document.getElementById('scanner-video');
  const statusEl = document.getElementById('scanner-status');

  if (!modal || !video) return;

  modal.classList.remove('hidden');
  if (statusEl) statusEl.textContent = 'Iniciando cámara...';

  try {
    await scanner.startScanner(video, (code) => {
      // Código detectado
      const codeInput = document.getElementById('product-code');
      if (codeInput) {
        codeInput.value = code;
      }
      closeScanner();
      showToast(`Código capturado: ${code}`, 'success');

      // Feedback háptico si está soportado
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }
    });
    if (statusEl) statusEl.textContent = 'Apunte la cámara al código de barras';
  } catch (err) {
    console.error('Error al abrir scanner:', err);
    closeScanner();
    showToast('No se pudo acceder a la cámara. Ingrese el código manualmente.', 'error');
  }
}

export function closeScanner() {
  scanner.stopScanner();
  const modal = document.getElementById('modal-scanner');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// ============================================================
// MÓDULO DE PEDIR PRECIOS
// ============================================================

export function renderPedirPrecios() {
  const settings = store.getSettings();
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const isTodayPriceDay = store.isPriceRequestDay(today, settings.mondayHoliday);

  // 1. Encabezado de fecha y estado de pedido
  const dayNameEl = document.getElementById('pedir-day-name');
  const dayStatusEl = document.getElementById('pedir-day-status');
  const dayBadgeEl = document.getElementById('pedir-day-badge');
  const toggleHoliday = document.getElementById('toggle-holiday');

  if (toggleHoliday) {
    toggleHoliday.checked = !!settings.mondayHoliday;
  }

  const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const dayName = daysOfWeek[today.getDay()];

  if (dayNameEl) {
    dayNameEl.textContent = `${dayName}, ${formatDateDisplay(todayStr)}`;
  }

  if (dayStatusEl && dayBadgeEl) {
    if (isTodayPriceDay) {
      dayStatusEl.textContent = 'Día programado para solicitud de precios';
      dayBadgeEl.textContent = '¡Día de Pedir!';
      dayBadgeEl.className = 'text-xs font-bold px-3 py-1.5 rounded-full bg-exp-green/20 text-exp-green';
    } else {
      const nextDate = store.getNextPriceRequestDay(today, settings.mondayHoliday);
      const nextDayName = daysOfWeek[nextDate.getDay()];
      dayStatusEl.textContent = `Próximo pedido: ${nextDayName} (${formatDateDisplay(nextDate.toISOString().split('T')[0])})`;
      dayBadgeEl.textContent = 'No programado';
      dayBadgeEl.className = 'text-xs font-bold px-3 py-1.5 rounded-full bg-accent/30 text-text-secondary';
    }
  }

  // 2. Filtrado de productos para pedir
  const container = document.getElementById('pedir-product-list');
  const emptyState = document.getElementById('pedir-empty');
  if (!container) return;

  const filterSinPrecio = document.getElementById('filter-sin-precio');
  const onlySinPrecio = filterSinPrecio ? filterSinPrecio.checked : false;

  // Productos con <= 6 días de vencimiento
  let products = store.getProductsNeedingPrices();

  // Obtener solicitudes registradas hoy
  const todayRequests = store.getPriceRequests(todayStr);

  // Obtener solicitudes registradas ayer
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const yesterdayRequests = store.getPriceRequests(yesterdayStr);

  // Si el filtro "Sin precio del día anterior" está activo:
  // Mostrar productos que ayer NO se les dio precio
  if (onlySinPrecio) {
    products = products.filter(p => {
      const yReq = yesterdayRequests.find(r => r.productId === p.id);
      return !yReq || !yReq.priceGiven;
    });
  }

  if (products.length === 0) {
    container.innerHTML = '';
    if (emptyState) {
      emptyState.classList.remove('hidden');
      emptyState.classList.add('flex');
    }
    return;
  }

  if (emptyState) {
    emptyState.classList.add('hidden');
    emptyState.classList.remove('flex');
  }

  container.innerHTML = products.map(p => {
    const days = store.getDaysUntilExpiry(p.expiryDate);
    const alertLevel = store.getAlertLevel(days);
    const req = todayRequests.find(r => r.productId === p.id);
    const quantity = req ? req.quantity : '';
    const isRequested = req ? req.priceRequested : false;

    // Comprobar si ayer no se le dio precio
    const yReq = yesterdayRequests.find(r => r.productId === p.id);
    const sinPrecioAyer = !yReq || !yReq.priceGiven;

    const alertBadges = {
      ok: 'bg-exp-green/20 text-exp-green',
      warning: 'bg-exp-yellow/20 text-exp-yellow',
      urgent: 'bg-exp-orange/20 text-exp-orange',
      critical: 'bg-exp-red/20 text-exp-red'
    };
    const badgeClass = alertBadges[alertLevel] || alertBadges.warning;
    const unitLabel = p.measureType === 'kilogramos' || p.measureType === 'kg' ? 'Kg' : 'Uds';

    return `
      <div class="pedir-card bg-surface-light rounded-xl p-4 border border-accent/20 shadow-md" data-product-id="${p.id}">
        <div class="flex items-start justify-between mb-2">
          <div class="flex-1 min-w-0 pr-2">
            <h3 class="font-semibold text-sm text-white truncate">${escapeHtml(p.name)}</h3>
            <p class="text-xs text-text-secondary mt-0.5">
              <span class="capitalize text-action/90 font-medium">${p.section}</span>
              ${p.plu ? ` · PLU: ${escapeHtml(p.plu)}` : ''}
              · Existencia: <strong class="text-white">${p.quantity !== undefined && p.quantity !== null && p.quantity !== '' ? p.quantity : 0} ${unitLabel}</strong>
              ${sinPrecioAyer ? ' · <span class="text-exp-red font-medium">⚠️ Sin precio ayer</span>' : ''}
            </p>
          </div>
          <span class="text-xs px-2.5 py-1 rounded-full font-bold ${badgeClass}">
            ${days <= 0 ? 'Vence HOY' : `${days} días`}
          </span>
        </div>

        <div class="flex items-center gap-3 mt-3 pt-3 border-t border-accent/20">
          <div class="flex items-center gap-1.5 flex-1">
            <span class="text-xs text-text-secondary font-medium mr-1">Pedir:</span>
            <input
              type="number"
              step="any"
              min="0"
              placeholder="${p.quantity || 0}"
              value="${quantity !== undefined && quantity !== null ? quantity : ''}"
              data-product-id="${p.id}"
              class="pedir-quantity w-24 bg-surface rounded-lg px-3 py-2 text-sm text-white placeholder-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-action/50 border border-accent/30"
            >
            <span class="text-xs text-text-secondary font-medium">${unitLabel}</span>
          </div>

          <label class="flex items-center gap-2 cursor-pointer bg-surface/60 px-3 py-2 rounded-lg border border-accent/30 active:scale-95 transition-transform">
            <input
              type="checkbox"
              data-product-id="${p.id}"
              ${isRequested ? 'checked' : ''}
              class="pedir-checkbox w-4 h-4 rounded bg-surface border-accent/40 text-action accent-action focus:ring-action/50"
            >
            <span class="text-xs font-semibold ${isRequested ? 'text-exp-green' : 'text-text-secondary'}">
              ${isRequested ? '✓ Pedido' : 'Pedir'}
            </span>
          </label>
        </div>
      </div>
    `;
  }).join('');
}

export function handlePedirQuantityChange(productId, quantityVal) {
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRequests = store.getPriceRequests(todayStr);
  const existing = todayRequests.find(r => r.productId === productId);
  const product = store.getProduct(productId);
  const unit = product ? product.measureType : 'unidades';

  if (existing) {
    store.updatePriceRequest(existing.id, { quantity: Number(quantityVal) || 0 });
  } else {
    store.savePriceRequest({
      productId,
      date: todayStr,
      quantity: Number(quantityVal) || 0,
      unit,
      priceRequested: false,
      priceGiven: false
    });
  }
}

export function handlePedirStatusChange(productId, isRequested) {
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRequests = store.getPriceRequests(todayStr);
  const existing = todayRequests.find(r => r.productId === productId);
  const product = store.getProduct(productId);
  const unit = product ? product.measureType : 'unidades';

  if (existing) {
    store.updatePriceRequest(existing.id, { priceRequested: isRequested });
  } else {
    store.savePriceRequest({
      productId,
      date: todayStr,
      quantity: 0,
      unit,
      priceRequested: isRequested,
      priceGiven: false
    });
  }

  showToast(isRequested ? 'Marcado como precio pedido' : 'Desmarcado', 'info');
  renderPedirPrecios();
}

export function generateAndShareReport() {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const products = store.getProductsNeedingPrices();
  const requests = store.getPriceRequests(todayStr);

  if (products.length === 0) {
    showToast('No hay productos próximos a vencer para reportar', 'info');
    return;
  }

  let reportText = `🥩 *EL ROTADOR - PEDIDO DE PRECIOS*\n`;
  reportText += `📅 Fecha: ${formatDateDisplay(todayStr)}\n\n`;

  // Agrupar por sección
  const sections = ['autoservicio', 'atendida'];

  sections.forEach(sec => {
    const secProducts = products.filter(p => p.section === sec);
    if (secProducts.length > 0) {
      reportText += `📌 *${sec.toUpperCase()}*:\n`;
      secProducts.forEach((p, index) => {
        const days = store.getDaysUntilExpiry(p.expiryDate);
        const req = requests.find(r => r.productId === p.id);
        const stock = (p.quantity !== undefined && p.quantity !== null && p.quantity !== '') ? p.quantity : '0';
        const qtyToOrder = (req && req.quantity !== undefined && req.quantity !== null && req.quantity !== '') ? req.quantity : stock;
        const unit = p.measureType === 'kilogramos' || p.measureType === 'kg' ? 'kg' : 'uds';
        const status = req && req.priceRequested ? '✅' : '⏳';

        reportText += `${index + 1}. ${p.name} ${p.plu ? `[${p.plu}]` : ''} - Stock: ${stock} ${unit} | A pedir: ${qtyToOrder} ${unit} (Vence en ${days}d) ${status}\n`;
      });
      reportText += '\n';
    }
  });

  // Intentar compartir con Web Share API, sino copiar al portapapeles
  if (navigator.share) {
    navigator.share({
      title: 'Pedido de Precios - El Rotador',
      text: reportText
    }).catch(() => {
      copyToClipboard(reportText);
    });
  } else {
    copyToClipboard(reportText);
  }
}

function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('Reporte copiado al portapapeles', 'success');
    }).catch(() => {
      showToast('No se pudo copiar el reporte', 'error');
    });
  } else {
    // Fallback con textarea
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('Reporte copiado al portapapeles', 'success');
  }
}

// ============================================================
// CONFIGURACIÓN Y RESPALDO
// ============================================================

export function renderSettings() {
  const products = store.getAllProducts();
  const countEl = document.getElementById('settings-product-count');
  if (countEl) {
    const autoCount = products.filter(p => p.section === 'autoservicio').length;
    const atendidaCount = products.filter(p => p.section === 'atendida').length;
    countEl.textContent = `Productos almacenados: ${products.length} (Autoservicio: ${autoCount} | Atendida: ${atendidaCount})`;
  }
}

export function exportBackup() {
  const data = store.exportData();
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `el-rotador-backup-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Respaldo descargado exitosamente', 'success');
}

export function importBackupFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      store.importData(e.target.result);
      showToast('Datos restaurados correctamente', 'success');
      renderProductList();
      renderSettings();
    } catch (err) {
      console.error(err);
      showToast('Error al importar el archivo JSON', 'error');
    }
  };
  reader.readAsText(file);
}

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================

let toastTimeout = null;

export function showToast(message, type = 'info') {
  const toastEl = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-message');
  const toastIcon = document.getElementById('toast-icon');

  if (!toastEl || !toastMsg) return;

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  const iconColors = {
    success: 'text-exp-green',
    error: 'text-exp-red',
    warning: 'text-exp-yellow',
    info: 'text-action'
  };

  if (toastIcon) {
    toastIcon.textContent = icons[type] || 'ℹ';
    toastIcon.className = `text-lg font-bold ${iconColors[type] || 'text-white'}`;
  }

  toastMsg.textContent = message;
  toastEl.classList.remove('hidden');

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toastEl.classList.add('hidden');
  }, 3000);
}

// ============================================================
// HELPERS
// ============================================================

function formatDateDisplay(isoDate) {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
