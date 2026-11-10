# 🥩 El Rotador

**Control de Vencimientos y Gestión de Precios para Carnicería / Supermercado**

PWA (Progressive Web App) diseñada para el control diario de fechas de vencimiento de productos cárnicos y la gestión de solicitudes de precios. Pensada para uso en dispositivos móviles con una sola mano.

---

## ✨ Características

- 📦 **Gestión de inventario** — Registra productos con nombre, código PLU/EAN, fecha de vencimiento, sección y tipo de medida.
- 🔴🟠🟡🟢 **Alertas visuales por vencimiento** — Indicadores de color automáticos según los días restantes:
  - 🟢 Verde: más de 6 días
  - 🟡 Amarillo: 6 días o menos
  - 🟠 Naranja: 3 días o menos
  - 🔴 Rojo: 1 día o menos / vencido
- 📸 **Escáner de códigos de barras** — Escanea códigos EAN/UPC directamente con la cámara del dispositivo usando ZXing.
- 💰 **Módulo "Pedir Precios"** — Genera reportes de productos que necesitan nuevo precio según la política de Lunes y Jueves.
- 🗂️ **Secciones** — Organiza productos en "Autoservicio" y "Atendida".
- 📲 **PWA instalable** — Funciona offline, se instala en la pantalla de inicio como una app nativa.
- 💾 **Respaldo y restauración** — Exporta e importa datos en formato JSON.
- 📱 **Mobile-first** — Interfaz optimizada para uso con una sola mano en móvil.

---

## 🚀 Instalación

### Opción 1: GitHub Pages

1. Haz fork de este repositorio.
2. Ve a **Settings → Pages**.
3. En **Source**, selecciona la rama `main` y la carpeta `/ (root)`.
4. Haz clic en **Save**.
5. Accede a la URL generada (ej: `https://tu-usuario.github.io/El_Rotador/`).
6. En tu dispositivo móvil, abre la URL y selecciona **"Agregar a pantalla de inicio"**.

### Opción 2: Servidor local

```bash
# Clona el repositorio
git clone https://github.com/tu-usuario/El_Rotador.git
cd El_Rotador

# Sirve con cualquier servidor estático, por ejemplo:
npx serve .
# o
python -m http.server 8000
```

> **Nota:** El Service Worker requiere HTTPS o `localhost` para funcionar.

---

## 🛠️ Tecnologías

| Tecnología | Uso |
|---|---|
| **HTML5** | Estructura semántica de la aplicación |
| **Tailwind CSS** | Framework de utilidades CSS (vía CDN) |
| **JavaScript ES Modules** | Lógica modular sin bundler |
| **ZXing** | Lectura de códigos de barras desde la cámara |
| **PWA** | Service Worker, manifest, instalación offline |
| **LocalStorage** | Persistencia de datos en el dispositivo |

---

## 📁 Estructura del Proyecto

```
El_Rotador/
├── index.html          # Página principal de la aplicación
├── manifest.json       # Manifiesto PWA
├── sw.js               # Service Worker (cache offline)
├── README.md           # Este archivo
├── js/
│   ├── app.js          # Punto de entrada, inicialización
│   ├── store.js        # Gestión de datos y LocalStorage
│   ├── ui.js           # Renderizado de interfaz
│   └── scanner.js      # Integración con ZXing para escaneo
└── icons/
    └── icon.svg        # Icono de la aplicación
```

---

## 📄 Licencia

Este proyecto está bajo la licencia [MIT](https://opensource.org/licenses/MIT).

```
MIT License

Copyright (c) 2024 El Rotador

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
