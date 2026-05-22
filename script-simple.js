/* ========================================
   BEAUTY STORE - LÓGICA PRINCIPAL
   ======================================== */

// ========================================
// VARIABLES GLOBALES
// ========================================

let usuarioActual = null;
let productosActuales = [];
let esAdmin = false;
let imagenBase64 = null; // imagen subida desde galería

// ========================================
// FORMATO MONEDA COLOMBIANA
// ========================================

// Convierte "69.000" o "69000" → número 69000
function parsearPrecioCOP(valor) {
    return parseInt(String(valor).replace(/\./g, '').replace(/[^\d]/g, ''), 10) || 0;
}

// Convierte 69000 → "69.000"
function formatearPrecioCOP(numero) {
    return Number(numero).toLocaleString('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}


// ========================================
// INICIALIZACIÓN
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Aplicación iniciada');
    
    verificarUsuarioLogueado();
    configurarEventListeners();
    cargarProductos();
});

// ========================================
// AUTENTICACIÓN
// ========================================

function verificarUsuarioLogueado() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            usuarioActual = user;
            
            // Verificar si es admin
            esAdmin = await verificarSiEsAdmin(user.email);
            
            // Mostrar/ocultar botón admin
            const adminBtn = document.getElementById('adminBtn');
            if (esAdmin) {
                adminBtn.style.display = 'inline-flex';
                adminBtn.innerHTML = '<i class="fas fa-crown"></i> Admin';
                adminBtn.style.color = '#fbbf24';
                adminBtn.title = 'Eres Administrador';
            } else {
                adminBtn.style.display = 'none';
            }
            
            document.getElementById('loginBtn').style.display = 'none';
            document.getElementById('logoutBtn').style.display = 'inline-flex';
            document.getElementById('logoutBtn').innerHTML = `<i class="fas fa-sign-out-alt"></i> ${user.email}`;
            
            console.log('✅ Usuario logueado:', user.email);
            console.log('🔐 ¿Es Admin?:', esAdmin);
        } else {
            usuarioActual = null;
            esAdmin = false;
            document.getElementById('loginBtn').style.display = 'inline-flex';
            document.getElementById('logoutBtn').style.display = 'none';
            document.getElementById('adminBtn').style.display = 'none';
            console.log('❌ Usuario no logueado');
        }
    });
}

// Login
document.getElementById('loginForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    auth.signInWithEmailAndPassword(email, password)
        .then(async (userCredential) => {
            mostrarNotificacion('¡Bienvenido! Sesión iniciada correctamente', 'success');
            cerrarModal('loginModal');
            usuarioActual = userCredential.user;
            esAdmin = await verificarSiEsAdmin(userCredential.user.email);
            cargarProductos();
        })
        .catch((error) => {
            mostrarNotificacion('Error: ' + error.message, 'error');
        });
});

// Signup
document.getElementById('signupForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirm = document.getElementById('signupConfirm').value;
    
    if (password !== confirm) {
        mostrarNotificacion('Las contraseñas no coinciden', 'error');
        return;
    }
    
    if (password.length < 6) {
        mostrarNotificacion('La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }
    
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            mostrarNotificacion('¡Cuenta creada! Ahora inicia sesión', 'success');
            toggleForm();
            document.getElementById('signupForm').reset();
        })
        .catch((error) => {
            mostrarNotificacion('Error: ' + error.message, 'error');
        });
});

// Toggle entre Login y Signup
document.getElementById('toggleSignup')?.addEventListener('click', function(e) {
    e.preventDefault();
    toggleForm();
});

document.getElementById('toggleLogin')?.addEventListener('click', function(e) {
    e.preventDefault();
    toggleForm();
});

function toggleForm() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const toggleLogin = document.getElementById('toggleLogin');
    const toggleSignup = document.getElementById('toggleSignup');
    
    loginForm.style.display = loginForm.style.display === 'none' ? 'block' : 'none';
    signupForm.style.display = signupForm.style.display === 'none' ? 'block' : 'none';
    toggleLogin.style.display = toggleLogin.style.display === 'none' ? 'block' : 'none';
    toggleSignup.style.display = toggleSignup.style.display === 'none' ? 'block' : 'none';
}

// Logout
document.getElementById('logoutBtn')?.addEventListener('click', function() {
    auth.signOut().then(() => {
        mostrarNotificacion('Sesión cerrada', 'info');
        usuarioActual = null;
        esAdmin = false;
        cambiarSeccion('tiendaSection', 'tiendaBtn');
        document.getElementById('loginBtn').style.display = 'inline-flex';
        document.getElementById('logoutBtn').style.display = 'none';
        document.getElementById('adminBtn').style.display = 'none';
    });
});

// ========================================
// NAVEGACIÓN
// ========================================

function configurarEventListeners() {
    document.getElementById('tiendaBtn').addEventListener('click', () => {
        cambiarSeccion('tiendaSection', 'tiendaBtn');
    });
    
    document.getElementById('adminBtn').addEventListener('click', () => {
        if (!usuarioActual) {
            abrirModal('loginModal');
            return;
        }
        if (!esAdmin) {
            mostrarNotificacion('❌ No tienes permisos de administrador', 'error');
            return;
        }
        cambiarSeccion('adminSection', 'adminBtn');
        cargarProductosAdmin();
    });
    
    document.getElementById('loginBtn').addEventListener('click', () => {
        abrirModal('loginModal');
    });
    
    document.getElementById('formProducto').addEventListener('submit', agregarProducto);

    // --- Uploader de imagen ---
    const imagenArchivo = document.getElementById('imagenArchivo');
    const imagenUrlInput = document.getElementById('imagen');
    const imagenPreview = document.getElementById('imagenPreview');
    const imagenPreviewImg = document.getElementById('imagenPreviewImg');
    const quitarImagen = document.getElementById('quitarImagen');

    imagenArchivo.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            imagenBase64 = ev.target.result;
            imagenPreviewImg.src = imagenBase64;
            imagenPreview.style.display = 'flex';
            imagenUrlInput.value = '';
            imagenUrlInput.removeAttribute('required');
        };
        reader.readAsDataURL(file);
    });

    imagenUrlInput.addEventListener('input', () => {
        if (imagenUrlInput.value) {
            imagenBase64 = null;
            imagenArchivo.value = '';
            imagenPreview.style.display = 'none';
        }
    });

    quitarImagen.addEventListener('click', () => {
        imagenBase64 = null;
        imagenArchivo.value = '';
        imagenPreview.style.display = 'none';
        imagenUrlInput.setAttribute('required', '');
    });
    document.getElementById('searchInput').addEventListener('input', filtrarProductos);
    document.getElementById('categoryFilter').addEventListener('change', filtrarProductos);
    
    document.querySelectorAll('.close').forEach(close => {
        close.addEventListener('click', (e) => {
            e.target.closest('.modal').classList.remove('show');
        });
    });
    
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('show');
        }
    });
}

function cambiarSeccion(seccionId, botonId) {
    document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.btn-nav').forEach(btn => btn.classList.remove('active'));
    document.getElementById(seccionId).classList.add('active');
    document.getElementById(botonId).classList.add('active');
}

// ========================================
// MODALES
// ========================================

function abrirModal(modalId) {
    document.getElementById(modalId).classList.add('show');
}

function cerrarModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

// ========================================
// GESTIÓN DE PRODUCTOS
// ========================================

async function agregarProducto(e) {
    e.preventDefault();
    
    if (!usuarioActual) {
        mostrarNotificacion('Debes iniciar sesión primero', 'error');
        return;
    }
    
    if (!esAdmin) {
        mostrarNotificacion('❌ Solo los administradores pueden agregar productos', 'error');
        return;
    }
    
    const nombre    = document.getElementById('nombre').value.trim();
    const categoria = document.getElementById('categoria').value.trim();
    const precio    = parsearPrecioCOP(document.getElementById('precio').value);
    const descripcion = document.getElementById('descripcion').value.trim();
    const imagen    = imagenBase64 || document.getElementById('imagen').value.trim();
    const linkCompra = document.getElementById('linkCompra').value.trim();

    // Validación: no guardar si faltan campos obligatorios
    if (!nombre || !categoria || !precio || !imagen || !linkCompra) {
        mostrarNotificacion('⚠️ Completa todos los campos obligatorios', 'error');
        return;
    }

    const producto = {
        nombre,
        categoria,
        precio,
        descripcion,
        imagen,
        linkCompra,
        usuarioId: usuarioActual.uid,
        email: usuarioActual.email,
        fechaCreacion: new Date().toISOString()
    };
    
    try {
        const ref = await database.ref('productos').push(producto);
        producto.id = ref.key;

        // Actualizar lista local sin volver a consultar Firebase
        productosActuales.push(producto);
        mostrarProductos(productosActuales);

        // Limpiar formulario
        mostrarNotificacion('✅ Producto agregado exitosamente', 'success');
        document.getElementById('formProducto').reset();
        imagenBase64 = null;
        const prev = document.getElementById('imagenPreview');
        if (prev) prev.style.display = 'none';
        const imgInput = document.getElementById('imagen');
        if (imgInput) imgInput.setAttribute('required', '');

        // Recargar panel admin en segundo plano (sin esperar)
        cargarProductosAdmin();
    } catch (error) {
        mostrarNotificacion('Error al agregar producto: ' + error.message, 'error');
    }
}

function cargarProductos() {
    const productosGrid = document.getElementById('productosGrid');
    
    productosGrid.innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Cargando productos...</p>
        </div>
    `;
    
    database.ref('productos').once('value').then((snapshot) => {
        productosActuales = [];
        const data = snapshot.val();
        
        if (data) {
            Object.entries(data).forEach(([key, producto]) => {
                producto.id = key;
                productosActuales.push(producto);
            });
        }
        
        mostrarProductos(productosActuales);
    }, (error) => {
        console.error('Error cargando productos:', error);
        productosGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Error al cargar productos</p>';
    });
}

function mostrarProductos(productos) {
    const productosGrid = document.getElementById('productosGrid');
    const sinProductos = document.getElementById('sinProductos');
    
    if (productos.length === 0) {
        productosGrid.innerHTML = '';
        sinProductos.style.display = 'flex';
        return;
    }
    
    sinProductos.style.display = 'none';
    
    productosGrid.innerHTML = productos.map(producto => `
        <div class="producto-card">
            <img src="${producto.imagen}" alt="${producto.nombre}" class="producto-imagen" onerror="this.src='https://via.placeholder.com/400x300?text=${producto.nombre}'">
            <div class="producto-contenido">
                <span class="producto-categoria">${producto.categoria}</span>
                <h3 class="producto-nombre">${producto.nombre}</h3>
                <p class="producto-descripcion">${producto.descripcion}</p>
                <p class="producto-precio">$ ${formatearPrecioCOP(producto.precio)}</p>
                <div class="producto-botones">
                    <button class="btn-detalles" onclick="abrirDetalleProducto('${producto.id}')">
                        <i class="fas fa-info-circle"></i> Detalles
                    </button>
                    <a href="${producto.linkCompra}" target="_blank" class="btn-comprar">
                        <i class="fas fa-shopping-bag"></i> Comprar
                    </a>
                </div>
            </div>
        </div>
    `).join('');
}

function abrirDetalleProducto(productoId) {
    const producto = productosActuales.find(p => p.id === productoId);
    
    if (!producto) return;
    
    document.getElementById('detalleImagen').src = producto.imagen;
    document.getElementById('detalleNombre').textContent = producto.nombre;
    document.getElementById('detalleCategoria').textContent = producto.categoria;
    document.getElementById('detallePrecio').textContent = `$${formatearPrecioCOP(producto.precio)}`;
    document.getElementById('detalleDescripcion').textContent = producto.descripcion;
    
    const linkBtn = document.getElementById('linkCompraBtn');
    linkBtn.href = producto.linkCompra;
    linkBtn.target = '_blank';
    
    abrirModal('detalleModal');
}

function filtrarProductos() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const categoryFilter = document.getElementById('categoryFilter').value;
    
    const productosFiltrados = productosActuales.filter(producto => {
        const coincideNombre = producto.nombre.toLowerCase().includes(searchTerm);
        const coincideCategoria = categoryFilter === '' || producto.categoria === categoryFilter;
        return coincideNombre && coincideCategoria;
    });
    
    mostrarProductos(productosFiltrados);
}

// ========================================
// PANEL ADMIN
// ========================================

function cargarProductosAdmin() {
    const productosAdmin = document.getElementById('productosAdmin');
    
    if (!usuarioActual) {
        productosAdmin.innerHTML = '<p>Debes iniciar sesión</p>';
        return;
    }
    
    productosAdmin.innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Cargando tus productos...</p>
        </div>
    `;
    
    database.ref('productos').orderByChild('usuarioId').equalTo(usuarioActual.uid).once('value').then((snapshot) => {
        const productos = [];
        const data = snapshot.val();
        
        if (data) {
            Object.entries(data).forEach(([key, producto]) => {
                producto.id = key;
                productos.push(producto);
            });
        }
        
        if (productos.length === 0) {
            productosAdmin.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #9ca3af;">
                    <i class="fas fa-inbox" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                    <p>No has agregado productos aún</p>
                </div>
            `;
            return;
        }
        
        productosAdmin.innerHTML = productos.map(producto => `
            <div class="admin-producto-item">
                <div class="admin-producto-info">
                    <h3>${producto.nombre}</h3>
                    <p><strong>Categoría:</strong> ${producto.categoria}</p>
                    <p><strong>Precio:</strong> $${formatearPrecioCOP(producto.precio)}</p>
                    <p><strong>Link:</strong> <a href="${producto.linkCompra}" target="_blank" style="color: #d946a6;">Ver link</a></p>
                </div>
                <div class="admin-producto-actions">
                    <button class="btn-edit" onclick="editarProducto('${producto.id}')">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn-danger" onclick="eliminarProducto('${producto.id}')">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        `).join('');
    });
}

function editarProducto(productoId) {
    database.ref(`productos/${productoId}`).once('value', (snapshot) => {
        const producto = snapshot.val();
        
        if (!producto) return;
        
        document.getElementById('nombre').value = producto.nombre;
        document.getElementById('categoria').value = producto.categoria;
        document.getElementById('precio').value = formatearPrecioCOP(producto.precio);
        document.getElementById('descripcion').value = producto.descripcion;
        document.getElementById('imagen').value = producto.imagen;
        document.getElementById('linkCompra').value = producto.linkCompra;
        
        const form = document.getElementById('formProducto');
        const botonSubmit = form.querySelector('button[type="submit"]');

        // Scroll hasta el formulario para que el admin lo vea
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });

        botonSubmit.innerHTML = '<i class="fas fa-save"></i> Actualizar Producto';

        // Eliminar TODOS los listeners anteriores clonando el form
        const formNuevo = form.cloneNode(true);
        form.parentNode.replaceChild(formNuevo, form);
        const formActivo = document.getElementById('formProducto');
        const botonActivo = formActivo.querySelector('button[type="submit"]');
        botonActivo.innerHTML = '<i class="fas fa-save"></i> Actualizar Producto';

        // Re-adjuntar el uploader de imagen al nuevo form
        document.getElementById('imagenArchivo').addEventListener('change', (ev) => {
            const file = ev.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evr) => {
                imagenBase64 = evr.target.result;
                document.getElementById('imagenPreviewImg').src = imagenBase64;
                document.getElementById('imagenPreview').style.display = 'flex';
                document.getElementById('imagen').value = '';
            };
            reader.readAsDataURL(file);
        });
        document.getElementById('imagen').addEventListener('input', () => {
            if (document.getElementById('imagen').value) {
                imagenBase64 = null;
                document.getElementById('imagenArchivo').value = '';
                document.getElementById('imagenPreview').style.display = 'none';
            }
        });
        document.getElementById('quitarImagen').addEventListener('click', () => {
            imagenBase64 = null;
            document.getElementById('imagenArchivo').value = '';
            document.getElementById('imagenPreview').style.display = 'none';
        });

        formActivo.onsubmit = async (e) => {
            e.preventDefault();

            const nombre     = document.getElementById('nombre').value.trim();
            const categoria  = document.getElementById('categoria').value.trim();
            const precio     = parsearPrecioCOP(document.getElementById('precio').value);
            const descripcion = document.getElementById('descripcion').value.trim();
            const imagen     = imagenBase64 || document.getElementById('imagen').value.trim();
            const linkCompra = document.getElementById('linkCompra').value.trim();

            // Validación: no guardar si faltan campos obligatorios
            if (!nombre || !categoria || !precio || !imagen || !linkCompra) {
                mostrarNotificacion('⚠️ Completa todos los campos obligatorios', 'error');
                return;
            }

            const productoActualizado = {
                nombre, categoria, precio, descripcion,
                imagen, linkCompra,
                usuarioId: usuarioActual.uid,
                email: usuarioActual.email,
                fechaCreacion: producto.fechaCreacion
            };
            
            try {
                await database.ref(`productos/${productoId}`).update(productoActualizado);

                // Actualizar lista local sin volver a consultar Firebase
                const idx = productosActuales.findIndex(p => p.id === productoId);
                if (idx !== -1) {
                    productoActualizado.id = productoId;
                    productosActuales[idx] = productoActualizado;
                    mostrarProductos(productosActuales);
                }

                mostrarNotificacion('✅ Producto actualizado correctamente', 'success');
                formActivo.reset();
                imagenBase64 = null;
                const prev = document.getElementById('imagenPreview');
                if (prev) prev.style.display = 'none';
                botonActivo.innerHTML = '<i class="fas fa-plus"></i> Agregar Producto';
                formActivo.onsubmit = agregarProducto;

                // Recargar panel admin en segundo plano (sin esperar)
                cargarProductosAdmin();
            } catch (error) {
                mostrarNotificacion('Error al actualizar: ' + error.message, 'error');
            }
        };
    });
}

function eliminarProducto(productoId) {
    if (confirm('¿Estás seguro que deseas eliminar este producto?')) {
        database.ref(`productos/${productoId}`).remove()
            .then(() => {
                mostrarNotificacion('✅ Producto eliminado', 'success');
                cargarProductosAdmin();
                cargarProductos();
            })
            .catch((error) => {
                mostrarNotificacion('Error al eliminar: ' + error.message, 'error');
            });
    }
}

// ========================================
// NOTIFICACIONES
// ========================================

function mostrarNotificacion(mensaje, tipo = 'info') {
    const notificacion = document.getElementById('notificacion');
    notificacion.textContent = mensaje;
    notificacion.className = `notificacion ${tipo} show`;
    
    setTimeout(() => {
        notificacion.classList.remove('show');
    }, 3000);
}

console.log('✅ Script cargado correctamente');
