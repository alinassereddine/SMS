import "dotenv/config";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

async function addUsers() {
  console.log("Adding new user accounts...");

  // CEO Admin Account
  const [existingCEO] = await db
    .select()
    .from(users)
    .where(eq(users.username, "ceo@topupapp.online"))
    .limit(1);

  if (existingCEO) {
    console.log("CEO account already exists, updating...");
    await db
      .update(users)
      .set({
        password: "9613985747",
        displayName: "CEO",
        role: "admin",
        permissions: [],
        archived: false,
      })
      .where(eq(users.id, existingCEO.id));
    console.log("✓ CEO account updated");
  } else {
    await db.insert(users).values({
      username: "ceo@topupapp.online",
      password: "9613985747",
      displayName: "CEO",
      role: "admin",
      permissions: [],
    });
    console.log("✓ CEO account created");
  }

  // Saleh Bros Employee Account
  const [existingSaleh] = await db
    .select()
    .from(users)
    .where(eq(users.username, "saleh-bros@live.com"))
    .limit(1);

  if (existingSaleh) {
    console.log("Saleh Bros account already exists, updating...");
    await db
      .update(users)
      .set({
        password: "9613985747",
        displayName: "Saleh Bros",
        role: "cashier",
        permissions: [],
        archived: false,
      })
      .where(eq(users.id, existingSaleh.id));
    console.log("✓ Saleh Bros account updated");
  } else {
    await db.insert(users).values({
      username: "saleh-bros@live.com",
      password: "9613985747",
      displayName: "Saleh Bros",
      role: "cashier",
      permissions: [],
    });
    console.log("✓ Saleh Bros account created");
  }

  console.log("\nAll users added successfully!");
  console.log("\nAccount details:");
  console.log("================");
  console.log("1. CEO Account (Admin):");
  console.log("   Email: ceo@topupapp.online");
  console.log("   Password: 9613985747");
  console.log("\n2. Saleh Bros Account (Cashier):");
  console.log("   Email: saleh-bros@live.com");
  console.log("   Password: 9613985747");

  process.exit(0);
}

addUsers().catch((error) => {
  console.error("Error adding users:", error);
  process.exit(1);
});
