import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function cleanup() {
  console.log("🚀 Starting cleanup...");

  // 🔥 1. get all product images
  const { data: products } = await supabase
    .from("products")
    .select("images_json");

  const usedImages = new Set<string>();

  products?.forEach((p) => {
    if (Array.isArray(p.images_json)) {
      p.images_json.forEach((img: string) => {
        if (img.includes("/storage/v1/object/public/")) {
          const path = img.split(
            "/storage/v1/object/public/"
          )[1];
          usedImages.add(path);
        }
      });
    }
  });

  console.log("✅ Used images:", usedImages.size);

  // 🔥 2. get all files from storage
  const { data: files } = await supabase.storage
    .from("upload")
    .list("product", { limit: 1000 });

  if (!files) {
    console.log("❌ No files found");
    return;
  }

  // 🔥 3. detect unused files
  const unused = files
    .map((file) => `upload/product/${file.name}`)
    .filter((path) => !usedImages.has(path));

  console.log("🗑️ Unused images:", unused.length);

  // 🔥 4. delete unused
  if (unused.length > 0) {
    const { error } = await supabase.storage
      .from("upload")
      .remove(unused);

    if (error) {
      console.error("❌ Delete error:", error);
    } else {
      console.log("✅ Cleanup done");
    }
  } else {
    console.log("🎉 Nothing to delete");
  }
}

cleanup();