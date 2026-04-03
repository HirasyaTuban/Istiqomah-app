import { auth } from "../firebase/firebaseConfig.js";

import {
  createUserWithEmailAndPassword,
  sendEmailVerification
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

export async function registerOwner(email, password) {

  try {

    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    await sendEmailVerification(userCredential.user);

    alert("Verification email sent");

  } catch (error) {

    console.error(error);
    alert(error.message);

  }

}