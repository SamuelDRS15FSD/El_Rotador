/**
 * app.js - Punto de entrada principal para El Rotador
 * Inicializa PWA, Service Worker, y enlaza todos los eventos del DOM
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

  // 4. Configurar todos los event listeners
  setupNavigationEvents();
  setupInventoryEvents();
  setupProductFormEvents();
  setupScannerEvents();
  setupPedirPreciosEvents();
  setupSettingsEvents();

  // 5. Mostrar vista inicial
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
 * permitiendo al usuario probar la app de inmediato.
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
      // AUTOSERVICIO
      {
        name: 'Bife de Chorizo Premium',
        plu: '7791234567890',
        expiryDate: addDays(1), // Crítico (1 día)
        section: 'autoservicio',
        measureType: 'kilogramos',
        quantity: 14.5,
        notes: 'Bandeja envasada al vacío - Lote A1'
      },
      {
        name: 'Pechuga de Pollo Fresca',
        plu: '7792345678901',
        expiryDate: addDays(3), // Urgente (3 días)
        section: 'autoservicio',
        measureType: 'kilogramos',
        quantity: 22.0,
        notes: 'Proveedor Avícola Central'
      },
      {
        name: 'Hamburguesas Caseras x4',
        plu: '7793456789012',
        expiryDate: addDays(5), // Precaución (5 días)
        section: 'autoservicio',
        measureType: 'unidades',
        quantity: 30,
        notes: 'Elaboración del lunes'
      },
      {
        name: 'Colita de Cuadril Envasada',
        plu: '7794567890123',
        expiryDate: addDays(10), // OK (>6 días)
        section: 'autoservicio',
        measureType: 'kilogramos',
        quantity: 8.7,
        notes: 'Lote B14'
      },
      // ATENDIDA
      {
        name: 'Milanesas de Carne Preparadas',
        plu: '4011',
        expiryDate: addDays(0), // Vence HOY (Crítico)
        section: 'atendida',
        measureType: 'kilogramos',
        quantity: 18.2,
        notes: 'Mostrador principal'
      },
      {
        name: 'Chorizo Bombón Especial',
        plu: '4022',
        expiryDate: addDays(2), // Urgente (2 días)
        section: 'atendida',
        measureType: 'kilogramos',
        quantity: 12.0,
        notes: 'Lote embutido artesanal'
      },
      {
        name: 'Matambre de Cerdo',
        plu: '4033',
        expiryDate: addDays(6), // Precaución (6 días)
        section: 'atendida',
        measureType: 'kilogramos',
        quantity: 9.4,
        notes: 'Cámara 2'
      },
      {
        name: 'Asado de Tira Especial',
        plu: '4044',
        expiryDate: addDays(14), // OK
        section: 'atendida',
        measureType: 'kilogramos',
        quantity: 35.0,
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
  // Tabs: Autoservicio / Atendida
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

    // Actualizar indicador de unidad al cambiar entre Unidades y Kilogramos
    form.querySelectorAll('input[name="measure"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const unitEl = document.getElementById('product-quantity-unit');
        if (unitEl) {
          unitEl.textContent = e.target.value === 'kilogramos' ? 'Kg' : 'Uds';
        }
      });
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
 * Eventos del módulo de pedir precios
 */
function setupPedirPreciosEvents() {
  // Toggle lunes festivo
  const toggleHoliday = document.getElementById('toggle-holiday');
  if (toggleHoliday) {
    toggleHoliday.addEventListener('change', (e) => {
      store.saveSettings({ mondayHoliday: e.target.checked });
      ui.renderPedirPrecios();
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
    // Cambio en input de cantidad
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
        // Reset file input para permitir subir el mismo archivo nuevamente si se desea
        fileInput.value = '';
      }
    });
  }
}

