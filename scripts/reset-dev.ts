import { createAdminClient } from "../lib/supabase/admin";

const supabase = createAdminClient();
const isDryRun = process.argv.includes("--dry-run");

async function resetDev() {
  console.log(isDryRun ? "🔍 DRY RUN — no changes will be made\n" : "⚠️  RESETTING dev data...\n");

  // Order matters for FK constraints
  const tables = [
    "chunk_concept_links",
    "content_chunks",
    "user_documents",
    "magic_link_uses",
    "question_attempts",
    "study_sessions",
    "user_concept_states",
    "referrals",
    "question_feedback",
    "questions",
    "user_achievements",
  ] as const;

  for (const table of tables) {
    if (isDryRun) {
      const { count } = await supabase.from(table).select("*", { count: "exact", head: true });
      console.log(`  Would delete ${count ?? 0} rows from ${table}`);
    } else {
      const { error, count } = await supabase.from(table).delete({ count: "exact" }).neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) {
        console.error(`❌ Failed to delete from ${table}:`, error.message);
      } else {
        console.log(`✓ Deleted ${count ?? 0} rows from ${table}`);
      }
    }
  }

  if (!isDryRun) {
    // Re-seed knowledge graph
    console.log("\n🌱 Re-seeding knowledge graph...");
    const { execSync } = await import("child_process");
    execSync("npx tsx scripts/seed-aws-saa.ts", { stdio: "inherit" });
  }

  console.log(isDryRun ? "\n✅ Dry run complete" : "\n✅ Dev reset complete");
}

resetDev().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
