/* ========================================
   CONFIGURACIÓN FIREBASE - NanyBeauty
   Versión Compatible (sin módulos)
   ======================================== */

// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCLk5Bl3OW9g1F2se8sKlVaFQbF8djf1is",
  authDomain: "nanybeauty-cb8c5.firebaseapp.com",
  databaseURL: "https://nanybeauty-cb8c5-default-rtdb.firebaseio.com",
  projectId: "nanybeauty-cb8c5",
  storageBucket: "nanybeauty-cb8c5.appspot.com",
  messagingSenderId: "668686913430",
  appId: "1:668686913430:web:4719e0ee341cd7838d57b7",
  measurementId: "G-0N95VVF8ZS"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Referencias globales
const auth = firebase.auth();
const database = firebase.database();

// Función para verificar si es admin
async function verificarSiEsAdmin(email) {
    return new Promise((resolve) => {
        database.ref(`admins/${email.replace(/\./g, '_')}`).once('value', (snapshot) => {
            resolve(snapshot.exists());
        });
    });
}

// Función para hacer admin
async function hacerAdmin(email) {
    try {
        await database.ref(`admins/${email.replace(/\./g, '_')}`).set({
            email: email,
            fechaCreacion: new Date().toISOString(),
            activo: true
        });
        console.log('✅ Usuario hecho admin:', email);
    } catch (error) {
        console.error('Error al hacer admin:', error);
    }
}

console.log('✅ Firebase configurado correctamente con NanyBeauty');
