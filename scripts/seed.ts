import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const adminEmail = "admin@anomaly.com";
  
  const existingUser = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (!existingUser) {
    const hashedPassword = await bcrypt.hash("admin", 10);
    await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: "SOC Admin",
        role: "ADMIN",
      }
    });
    console.log(`Created admin user: ${adminEmail} / admin`);
  } else {
    console.log(`Admin user ${adminEmail} already exists`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
