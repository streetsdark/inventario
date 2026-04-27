//Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCFKYJ9W7vuVib2KYUo_MKAqWHOijXdeSo",
  authDomain: "almacen-e14cc.firebaseapp.com",
  projectId: "almacen-e14cc",
  storageBucket: "almacen-e14cc.firebasestorage.app",
  messagingSenderId: "1089730632082",
  appId: "1:1089730632082:web:220f0f8622dac2a73b894b",
  measurementId: "G-ZHLTR1YSH4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
//const analytics = getAnalytics(app);