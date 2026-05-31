import { PrismaClient } from "@prisma/client";
import { seedDatabase } from "../lib/seed-data";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database…");
  const summary = await seedDatabase(prisma);
  console.log("Seed complete:");
  console.log(`  ${summary.members} members, ${summary.sessions} sessions, ${summary.bookings} bookings`);
  console.log("  Owner login:  owner@demo.com / password");
  console.log("  Member login: member@demo.com / password");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
