/**
 * app.js - Punto de entrada principal para El Rotador
 * Inicializa PWA, Service Worker, Catálogo Maestro y enlaza todos los eventos del DOM
 */

import * as store from './store.js';
import * as ui from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Inicializar fecha del encabezado
  ui.updateHeaderDate();

  // 2. Registrar Service Worker para PWA offline
  registerServiceWorker();

  // 3. Cargar datos de muestra si es la primera vez que se abre la app
  initializeSampleData();

  // 4. Cargar datalists del Catálogo Maestro
  ui.updateCatalogDatalists();

  // 5. Configurar todos los event listeners
  setupNavigationEvents();
  setupInventoryEvents();
  setupProductFormEvents();
  setupScannerEvents();
  setupPedirPreciosEvents();
  setupSettingsEvents();
  setupCatalogModalEvents();

  // 6. Mostrar vista inicial (Autoservicio con distinción cromática azul)
  ui.showView('view-inventory');
  ui.setSection('autoservicio');
});

/**
 * Registro de Service Worker
 */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => {
          console.log('Service Worker registrado con éxito:', reg.scope);
        })
        .catch(err => {
          console.warn('Fallo en registro de Service Worker:', err);
        });
    });
  }
}

/**
 * Inserta datos de muestra si el inventario está completamente vacío,
 * permitiendo al usuario probar la app de inmediato con cantidades numéricas y códigos PLU/EAN.
 */
function initializeSampleData() {
  const existing = store.getAllProducts();
  if (existing.length === 0) {
    const today = new Date();
    
    // Función auxiliar para sumar días
    const addDays = (days) => {
      const d = new Date(today);
      d.setDate(d.getDate() + days);
      return d.toISOString().split('T')[0];
    };

    const sampleProducts = [
      // AUTOSERVICIO (Azul)
      {
        name: 'Bife de Chorizo Premium',
        plu: '7791234567890', // EAN (13 dígitos)
        provider: 'Frigorífico Central',
        expiryDate: addDays(1), // Crítico (1 día)
        section: 'autoservicio',
        measureType: 'kilogramos',
        cantidad: 14.5,
        notes: 'Bandeja envasada al vacío - Lote A1'
      },
      {
        name: 'Pechuga de Pollo Fresca',
        plu: '7792345678901', // EAN (13 dígitos)
        provider: 'Avícola San Marcos',
        expiryDate: addDays(3), // Urgente (3 días)
        section: 'autoservicio',
        measureType: 'kilogramos',
        cantidad: 22.0,
        notes: 'Proveedor Avícola Central'
      },
      {
        name: 'Hamburguesas Caseras x4',
        plu: '7793456789012', // EAN (13 dígitos)
        provider: 'Elaboración Propia',
        expiryDate: addDays(5), // Precaución (5 días)
        section: 'autoservicio',
        measureType: 'unidades',
        cantidad: 30, // Entero
        notes: 'Elaboración del lunes'
      },
      {
        name: 'Colita de Cuadril Envasada',
        plu: '7794567890123', // EAN (13 dígitos)
        provider: 'Frigorífico Pampeano',
        expiryDate: addDays(10), // OK (>6 días)
        section: 'autoservicio',
        measureType: 'kilogramos',
        cantidad: 8.75,
        notes: 'Lote B14'
      },
      // ATENDIDA (Ámbar)
      {
        name: 'Milanesas de Carne Preparadas',
        plu: '4011', // PLU (4 dígitos)
        provider: 'Elaboración Mostrador',
        expiryDate: addDays(0), // Vence HOY (Crítico)
        section: 'atendida',
        measureType: 'kilogramos',
        cantidad: 18.5,
        notes: 'Mostrador principal'
      },
      {
        name: 'Chorizo Bombón Especial',
        plu: '4022', // PLU (4 dígitos)
        provider: 'Embutidos Artesanales',
        expiryDate: addDays(2), // Urgente (2 días)
        section: 'atendida',
        measureType: 'kilogramos',
        cantidad: 12.0,
        notes: 'Lote embutido artesanal'
      },
      {
        name: 'Matambre de Cerdo',
        plu: '4033', // PLU (4 dígitos)
        provider: 'Cabaña Porcina',
        expiryDate: addDays(6), // Precaución (6 días)
        section: 'atendida',
        measureType: 'kilogramos',
        cantidad: 9.3,
        notes: 'Cámara 2'
      },
      {
        name: 'Asado de Tira Especial',
        plu: '4044', // PLU (4 dígitos)
        provider: 'Frigorífico Central',
        expiryDate: addDays(14), // OK (>6 días)
        section: 'atendida',
        measureType: 'kilogramos',
        cantidad: 35.0,
        notes: 'Media res fresca'
      }
    ];

    sampleProducts.forEach(p => store.addProduct(p));
  }
}

/**
 * Eventos de la barra inferior de navegación
 */
function setupNavigationEvents() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const viewId = btn.getAttribute('data-view');
      if (viewId) {
        ui.showView(viewId);
      }
    });
  });
}

/**
 * Eventos de la vista de inventario (tabs, filtros, búsqueda, click en tarjeta)
 */
function setupInventoryEvents() {
  // Tabs: Autoservicio (Azul) / Atendida (Ámbar)
  document.querySelectorAll('.inventory-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const section = tab.getAttribute('data-section');
      if (section) {
        ui.setSection(section);
      }
    });
  });

  // Búsqueda en tiempo real
  const searchInput = document.getElementById('inventory-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      ui.setSearchQuery(e.target.value);
    });
  }

  // Chips de ordenamiento
  document.querySelectorAll('.sort-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const sort = chip.getAttribute('data-sort');
      if (sort) ui.setSort(sort);
    });
  });

  // Chips de filtro
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const filter = chip.getAttribute('data-filter');
      if (filter) ui.setFilter(filter);
    });
  });

  // Botón flotante (+) Agregar producto
  const fab = document.getElementById('fab-add-product');
  if (fab) {
    fab.addEventListener('click', () => {
      ui.openAddProductForm(null);
    });
  }

  // Delegación de click en tarjetas de producto para editar
  const productList = document.getElementById('product-list');
  if (productList) {
    productList.addEventListener('click', (e) => {
      const card = e.target.closest('.product-card');
      if (card) {
        const id = card.getAttribute('data-id');
        if (id) {
          ui.openAddProductForm(id);
        }
      }
    });
  }
}

/**
 * Eventos del formulario de agregar/editar producto
 */
function setupProductFormEvents() {
  const form = document.getElementById('product-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      ui.saveProductFromForm();
    });

    // Actualizar reglas de cantidad al alternar entre Unidades y Kilogramos
    form.querySelectorAll('input[name="measure"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        ui.updateQuantityInputRules(e.target.value);
      });
    });
  }

  // Autocompletado del Catálogo Maestro al tipear código
  const codeInput = document.getElementById('product-code');
  if (codeInput) {
    codeInput.addEventListener('input', (e) => {
      ui.updateCodeBadge(e.target.value);
      ui.handleCatalogAutocomplete(e.target.value, 'code');
    });
    codeInput.addEventListener('change', (e) => {
      ui.handleCatalogAutocomplete(e.target.value, 'code');
    });
  }

  // Autocompletado del Catálogo Maestro al tipear o seleccionar nombre
  const nameInput = document.getElementById('product-name');
  if (nameInput) {
    nameInput.addEventListener('input', (e) => {
      ui.handleCatalogAutocomplete(e.target.value, 'name');
    });
    nameInput.addEventListener('change', (e) => {
      ui.handleCatalogAutocomplete(e.target.value, 'name');
    });
  }

  // Botones de cancelar
  const btnCancelTop = document.getElementById('btn-cancel-product');
  const btnCancelBottom = document.getElementById('btn-cancel-product-bottom');

  const handleCancel = () => {
    ui.showView('view-inventory');
  };

  if (btnCancelTop) btnCancelTop.addEventListener('click', handleCancel);
  if (btnCancelBottom) btnCancelBottom.addEventListener('click', handleCancel);

  // Botón eliminar dentro del formulario
  const btnDelete = document.getElementById('btn-delete-product');
  if (btnDelete) {
    btnDelete.addEventListener('click', () => {
      ui.promptDeleteProduct();
    });
  }

  // Modal de confirmación de eliminación
  const btnConfirmCancel = document.getElementById('btn-confirm-delete-cancel');
  const btnConfirmOk = document.getElementById('btn-confirm-delete-ok');

  if (btnConfirmCancel) {
    btnConfirmCancel.addEventListener('click', () => {
      ui.closeDeleteConfirm();
    });
  }

  if (btnConfirmOk) {
    btnConfirmOk.addEventListener('click', () => {
      ui.executeDeleteProduct();
    });
  }
}

/**
 * Eventos del escáner de códigos de barras
 */
function setupScannerEvents() {
  const btnOpen = document.getElementById('btn-open-scanner');
  const btnClose = document.getElementById('btn-close-scanner');
  const btnCancel = document.getElementById('btn-cancel-scanner');

  if (btnOpen) {
    btnOpen.addEventListener('click', () => {
      ui.openScanner();
    });
  }

  const handleCloseScanner = () => {
    ui.closeScanner();
  };

  if (btnClose) btnClose.addEventListener('click', handleCloseScanner);
  if (btnCancel) btnCancel.addEventListener('click', handleCloseScanner);
}

/**
 * Eventos del módulo de pedir precios y festivos
 */
function setupPedirPreciosEvents() {
  // Toggle lunes festivo (traslada tarea de pedir del lunes al martes)
  const toggleHoliday = document.getElementById('toggle-holiday');
  if (toggleHoliday) {
    toggleHoliday.addEventListener('change', (e) => {
      store.saveSettings({ mondayHoliday: e.target.checked });
      ui.renderPedirPrecios();
      ui.showToast(e.target.checked ? 'Regla festivo activa: Pedido trasladado a martes' : 'Regla normal: Lunes y jueves', 'info');
    });
  }

  // Filtro "Sin precio del día anterior"
  const filterSinPrecio = document.getElementById('filter-sin-precio');
  if (filterSinPrecio) {
    filterSinPrecio.addEventListener('change', () => {
      ui.renderPedirPrecios();
    });
  }

  // Delegación de inputs de cantidad y checkboxes de pedido
  const pedirList = document.getElementById('pedir-product-list');
  if (pedirList) {
    // Cambio en input de cantidad a pedir
    pedirList.addEventListener('input', (e) => {
      if (e.target.classList.contains('pedir-quantity')) {
        const productId = e.target.getAttribute('data-product-id');
        ui.handlePedirQuantityChange(productId, e.target.value);
      }
    });

    // Checkbox de estado pedido
    pedirList.addEventListener('change', (e) => {
      if (e.target.classList.contains('pedir-checkbox')) {
        const productId = e.target.getAttribute('data-product-id');
        ui.handlePedirStatusChange(productId, e.target.checked);
      }
    });
  }

  // Botón generar reporte en PDF (únicamente productos con precio pedido)
  const btnExportPdf = document.getElementById('btn-export-pdf');
  if (btnExportPdf) {
    btnExportPdf.addEventListener('click', () => {
      ui.generatePDFReport();
    });
  }

  // Botón generar / compartir reporte
  const btnReport = document.getElementById('btn-generate-report');
  if (btnReport) {
    btnReport.addEventListener('click', () => {
      ui.generateAndShareReport();
    });
  }
}

/**
 * Eventos de la vista de configuración y respaldo
 */
function setupSettingsEvents() {
  // Exportar JSON
  const btnExport = document.getElementById('btn-export-json');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      ui.exportBackup();
    });
  }

  // Importar JSON
  const btnImport = document.getElementById('btn-import-json');
  const fileInput = document.getElementById('import-file-input');

  if (btnImport && fileInput) {
    btnImport.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        ui.importBackupFile(e.target.files[0]);
        fileInput.value = '';
      }
    });
  }
}

/**
 * Eventos del Modal del Catálogo Maestro
 */
function setupCatalogModalEvents() {
  const btnOpen = document.getElementById('btn-open-catalog-modal');
  const btnClose = document.getElementById('btn-close-catalog-modal');
  const searchInput = document.getElementById('catalog-modal-search');
  const listContainer = document.getElementById('catalog-modal-list');

  if (btnOpen) {
    btnOpen.addEventListener('click', () => {
      ui.openCatalogModal();
    });
  }

  if (btnClose) {
    btnClose.addEventListener('click', () => {
      ui.closeCatalogModal();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      ui.renderCatalogModalList(e.target.value);
    });
  }

  if (listContainer) {
    listContainer.addEventListener('click', (e) => {
      const btnUse = e.target.closest('.btn-use-catalog-item');
      if (btnUse) {
        const name = btnUse.getAttribute('data-name');
        const code = btnUse.getAttribute('data-code');
        const provider = btnUse.getAttribute('data-provider');
        const measure = btnUse.getAttribute('data-measure');
        const section = btnUse.getAttribute('data-section');

        ui.closeCatalogModal();
        ui.openAddProductForm(null);

        // Rellenar formulario con los datos del catálogo
        const nameInput = document.getElementById('product-name');
        const codeInput = document.getElementById('product-code');
        const providerInput = document.getElementById('product-provider');
        const sectionSelect = document.getElementById('product-section');

        if (nameInput) nameInput.value = name || '';
        if (codeInput) codeInput.value = code || '';
        if (providerInput) providerInput.value = provider || '';
        if (sectionSelect) sectionSelect.value = section || 'autoservicio';

        const isKg = measure === 'kilogramos' || measure === 'kg';
        document.querySelectorAll('input[name="measure"]').forEach(r => {
          r.checked = isKg ? r.value === 'kilogramos' : r.value === 'unidades';
        });
        ui.updateQuantityInputRules(measure);
        ui.updateCodeBadge(code);

        // Enfocar el campo obligatorio de cantidad
        setTimeout(() => {
          document.getElementById('product-quantity')?.focus();
        }, 150);

        ui.showToast(`Cargado desde catálogo: "${name}"`, 'success');
      }
    });
  }
}
