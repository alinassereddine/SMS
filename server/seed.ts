import { db } from "./db";
import { users, products, customers, suppliers } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function seedDatabase() {
  const desiredAdminUsername = "alinasseredine@gmail.com";
  const desiredAdminPassword = "admin1230";

  const [existingAnyUser] = await db.select().from(users).limit(1);
  
  if (!existingAnyUser) {
    console.log("Seeding database with initial data...");
    
    await db.insert(users).values([
      {
        username: desiredAdminUsername,
        password: desiredAdminPassword,
        displayName: "Administrator",
        role: "admin",
        permissions: [],
      },
      {
        username: "ceo@topupapp.online",
        password: "9613985747",
        displayName: "CEO",
        role: "admin",
        permissions: [],
      },
      {
        username: "saleh-bros@live.com",
        password: "9613985747",
        displayName: "Saleh Bros",
        role: "cashier",
        permissions: [],
      },
      {
        username: "Alaa",
        password: "Alaa1",
        displayName: "Alaa",
        role: "restricted",
        permissions: [
          'products:read', 'products:write',
          'inventory:read', 'inventory:write',
          'sales:read', 'sales:write',
          'purchases:read', 'purchases:write',
          'customers:read', 'customers:write',
          'suppliers:read', 'suppliers:write',
          'payments:read', 'payments:write',
          'expenses:read', 'expenses:write'
        ],
      }
    ]);

    await db.insert(products).values([
      { name: "iPhone 15 Pro Max", brand: "Apple", category: "Smartphones", specifications: { storage: "256GB", color: "Natural Titanium" } },
      { name: "iPhone 15 Pro", brand: "Apple", category: "Smartphones", specifications: { storage: "128GB", color: "Blue Titanium" } },
      { name: "Samsung Galaxy S24 Ultra", brand: "Samsung", category: "Smartphones", specifications: { storage: "512GB", color: "Titanium Black" } },
      { name: "Google Pixel 8 Pro", brand: "Google", category: "Smartphones", specifications: { storage: "256GB", color: "Obsidian" } },
    ]);

    await db.insert(customers).values([
      { name: "Walk-in Customer", phone: "", balance: 0 },
      { name: "Ahmed Hassan", phone: "+966501234567", email: "ahmed@email.com", balance: 0 },
    ]);

    await db.insert(suppliers).values([
      { name: "Apple Distributor", phone: "+966509876543", email: "supplier@apple.com", balance: 0 },
      { name: "Samsung Distributor", phone: "+966508765432", email: "supplier@samsung.com", balance: 0 },
    ]);

    console.log("Database seeded successfully!");
  } else {
    const [adminByEmail] = await db
      .select()
      .from(users)
      .where(eq(users.username, desiredAdminUsername))
      .limit(1);

    if (adminByEmail) {
      await db
        .update(users)
        .set({
          password: desiredAdminPassword,
          displayName: "Administrator",
          role: "admin",
          permissions: [],
          archived: false,
        })
        .where(eq(users.id, adminByEmail.id));
      console.log("Admin user updated.");
      return;
    }

    const [legacyAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.username, "admin"))
      .limit(1);

    if (legacyAdmin) {
      await db
        .update(users)
        .set({
          username: desiredAdminUsername,
          password: desiredAdminPassword,
          displayName: "Administrator",
          role: "admin",
          permissions: [],
          archived: false,
        })
        .where(eq(users.id, legacyAdmin.id));
      console.log("Legacy admin renamed and updated.");
      return;
    }

    await db.insert(users).values({
      username: desiredAdminUsername,
      password: desiredAdminPassword,
      displayName: "Administrator",
      role: "admin",
      permissions: [],
    });

    console.log("Admin user created.");
  }
}
