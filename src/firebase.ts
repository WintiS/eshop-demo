import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCna_CcviQBqRWK9k8fxkdJbrzelCkWfTU",
  authDomain: "stripe-backend-checkout.firebaseapp.com",
  projectId: "stripe-backend-checkout",
  storageBucket: "stripe-backend-checkout.firebasestorage.app",
  messagingSenderId: "950415532737",
  appId: "1:950415532737:web:e2639cd7b234fcae88ea40",
};

let app: FirebaseApp;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const db = getFirestore(app);

export { db };
