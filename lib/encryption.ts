import CryptoJS from 'crypto-js';

const SECRET_KEY = "pmu_secret_local_key_2026"; // In a real app, this might be derived from a user pin or something, but a static key hides it from casual localStorage inspection.

export const encryptData = (data: any): string => {
  try {
    const jsonString = JSON.stringify(data);
    return CryptoJS.AES.encrypt(jsonString, SECRET_KEY).toString();
  } catch (error) {
    console.error("Encryption error:", error);
    return "";
  }
};

export const decryptData = (ciphertext: string): any => {
  try {
    if (!ciphertext) return null;
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedString) return null;
    return JSON.parse(decryptedString);
  } catch (error) {
    console.error("Decryption error:", error);
    return null;
  }
};
