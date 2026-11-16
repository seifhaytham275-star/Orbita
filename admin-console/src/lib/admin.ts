import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
const COOKIE="orbita_admin_console";
const TTL=60*60*8;
function signature(value:string){const secret=process.env.ORBITA_ADMIN_SESSION_SECRET;if(!secret)throw new Error("Missing admin session secret");return createHmac("sha256",secret).update(value).digest("hex");}
function equal(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
export async function createSession(username:string){const payload=Buffer.from(JSON.stringify({username,exp:Math.floor(Date.now()/1000)+TTL})).toString("base64url");const store=await cookies();store.set(COOKIE,payload+"."+signature(payload),{httpOnly:true,secure:true,sameSite:"strict",path:"/",maxAge:TTL});}
export async function getSession(){const store=await cookies();const token=store.get(COOKIE)?.value;if(!token)return null;const [payload,sig,extra]=token.split(".");if(!payload||!sig||extra)return null;try{if(!equal(sig,signature(payload)))return null;const data=JSON.parse(Buffer.from(payload,"base64url").toString("utf8"));if(typeof data.username!=="string"||typeof data.exp!=="number"||data.exp<=Math.floor(Date.now()/1000))return null;return {username:data.username};}catch{return null;}}
export async function clearSession(){const store=await cookies();store.set(COOKIE,"",{httpOnly:true,secure:true,sameSite:"strict",path:"/",maxAge:0});}
export function adminClient():SupabaseClient{const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error("Admin backend environment is not configured");return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});}
export function originAllowed(request:Request){const origin=request.headers.get("origin");return !origin||origin===new URL(request.url).origin;}
