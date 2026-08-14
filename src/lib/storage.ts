import { createClient } from "@supabase/supabase-js";

// إعداد عميل Supabase المستقل
const SUPABASE_URL = "https://ximllvsgpfeqmhharjin.supabase.co";
const SUPABASE_KEY = "sb_publishable_gjpclJMqOF6g74NMKVEM9Q_ndgM4rqX";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/** Upload a file to a Supabase Storage bucket under the user's folder. Returns the storage path. */
export async function uploadUserFile(bucket: string, userId: string, file: File, prefix = ""): Promise<string> {
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${userId}/${prefix}${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export function publicUrl(bucket: string, path: string): string {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export async function signedUrl(bucket: string, path: string, expires = 3600): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expires);
  if (error) throw error;
  return data.signedUrl;
}
