import bcrypt from "bcryptjs";

// Verify imported hashes unchanged. Never log this function's inputs.
export function isSupportedLegacyBcryptHash(hash: string) {
  return /^\$2[aby]\$(?:0[4-9]|1[0-5])\$[./A-Za-z0-9]{53}$/.test(hash);
}
export async function verifyLegacyBcryptPassword(password: string, hash: string) {
  if (!isSupportedLegacyBcryptHash(hash) || new TextEncoder().encode(password).length>4096) return false;
  // bcrypt's historical 72-byte behavior must be preserved for existing hashes.
  // New password policy is handled separately, not by rewriting old hashes.
  try { return await bcrypt.compare(password,hash); } catch { return false; }
}

const encoder=new TextEncoder();
function encode(value: Uint8Array) {
  return btoa(String.fromCharCode(...value)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
}
function decode(value: string) {
  if(!/^[A-Za-z0-9_-]{1,1024}$/.test(value))throw new Error("Credential envelope unavailable");
  try{return Uint8Array.from(atob(value.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(value.length/4)*4,"=")),c=>c.charCodeAt(0));}
  catch{throw new Error("Credential envelope unavailable");}
}
type CredentialContext={projectId:string;userId:string};
function associatedData(context: CredentialContext) {
  if(!/^[a-z0-9]{20}$/.test(context.projectId)||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(context.userId))throw new Error("Credential context unavailable");
  return encoder.encode(JSON.stringify({format:"legacy-bcrypt-v1",projectId:context.projectId,userId:context.userId}));
}
async function key(secret: string) {
  const bytes=decode(secret);
  if(bytes.length!==32)throw new Error("Credential key unavailable");
  return crypto.subtle.importKey("raw",bytes.buffer,{name:"AES-GCM"},false,["encrypt","decrypt"]);
}
export function generateCredentialKey() { return encode(crypto.getRandomValues(new Uint8Array(32))); }

export async function sealLegacyBcryptHash(hash:string,secret:string,context:CredentialContext) {
  if(!isSupportedLegacyBcryptHash(hash))throw new Error("Unsupported legacy password hash");
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const encrypted=await crypto.subtle.encrypt({name:"AES-GCM",iv,additionalData:associatedData(context)},await key(secret),encoder.encode(hash));
  return `v1.${encode(iv)}.${encode(new Uint8Array(encrypted))}`;
}
export async function openLegacyBcryptHash(envelope:string,secret:string,context:CredentialContext) {
  try{
    const parts=envelope.split(".");if(parts.length!==3||parts[0]!=="v1")throw new Error();
    const iv=decode(parts[1]),ciphertext=decode(parts[2]);if(iv.length!==12||ciphertext.length!==76)throw new Error();
    const raw=await crypto.subtle.decrypt({name:"AES-GCM",iv,additionalData:associatedData(context)},await key(secret),ciphertext.buffer);
    const hash=new TextDecoder().decode(raw);if(!isSupportedLegacyBcryptHash(hash))throw new Error();
    return hash;
  }catch{throw new Error("Credential envelope unavailable");}
}
