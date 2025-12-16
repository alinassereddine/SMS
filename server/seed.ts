import { db } from "./db";
import { users, products, customers, suppliers } from "@shared/schema";

export async function seedDatabase() {
  const existingAdmin = await db.select().from(users).limit(1);
  
  if (existingAdmin.length === 0) {
    console.log("Seeding database with initial data...");
    
    await db.insert(users).values({
      username: "admin",
      password: "admin123",
      displayName: "Administrator",
      role: "admin",
      permissions: [],
    });

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
    console.log("Database already has data, skipping seed.");
  }
}
