import { initializeApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey: "AIzaSyA_UfiVmVo9L9Re_irXdkJd_Wae_1ucw-Q",
  authDomain: "student-dashboard-a4f04.firebaseapp.com",
  projectId: "student-dashboard-a4f04",
  storageBucket: "student-dashboard-a4f04.firebasestorage.app",
  messagingSenderId: "172044342156",
  appId: "1:172044342156:web:87c576308a318813487ca9",
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const storage = getStorage(app)
