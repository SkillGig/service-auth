import { decrypt, encrypt } from "../../network-dashboard/helpers/crypt.helper.js";

const secret =
  "7aa7575baee2b92034c5b46dd8127fa891f6d8d10a1da4ba4277ce8b07e99578";

const iv = "ecd2f5fad987eb58a334274b3b65c680";

const encrptedPassword = encrypt("password", "aes-256-cbc", secret);

console.log("The encrpted password is", encrptedPassword);

const decryptedPassword = decrypt(encrptedPassword, "aes-256-cbc", secret);

console.log("The decrypted password is", decryptedPassword);

// import crypto from "crypto";

// console.log(Buffer.from("talentgigskillgig", "utf8").slice(0, 16));
