import { createServerFn } from "@tanstack/react-start";
import { createHash } from "crypto";

export const CLOUDINARY_CLOUD_NAME = "dmkjoxcz0";
export const CLOUDINARY_API_KEY = "722411546596762";

/**
 * Returns signed upload params for Cloudinary direct upload from the browser.
 * The API secret never leaves the server.
 */
export const signCloudinaryUpload = createServerFn({ method: "POST" })
  .inputValidator((data: { folder: string; eager?: string; resourceType?: "video" | "image" }) => data)
  .handler(async ({ data }) => {
    const secret = process.env.CLOUDINARY_API_SECRET;
    if (!secret) throw new Error("CLOUDINARY_API_SECRET not configured");

    const timestamp = Math.floor(Date.now() / 1000);

    // Build the params to sign (alphabetical order, exclude file/api_key/signature/resource_type/cloud_name)
    const toSign: Record<string, string | number> = {
      folder: data.folder,
      timestamp,
    };
    if (data.eager) toSign.eager = data.eager;

    const sortedKeys = Object.keys(toSign).sort();
    const paramString = sortedKeys.map((k) => `${k}=${toSign[k]}`).join("&");
    const signature = createHash("sha1").update(paramString + secret).digest("hex");

    return {
      cloud_name: CLOUDINARY_CLOUD_NAME,
      api_key: CLOUDINARY_API_KEY,
      timestamp,
      signature,
      folder: data.folder,
      eager: data.eager ?? null,
      resource_type: data.resourceType ?? "video",
    };
  });
