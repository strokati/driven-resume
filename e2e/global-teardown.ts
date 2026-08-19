import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export default async function globalTeardown() {
  console.log('\n🧹 Cleaning up E2E test data...');

  // Delete applications whose vacancy company name starts with "E2E"
  const e2eVacancies = await prisma.vacancy.findMany({
    where: { companyName: { startsWith: 'E2E' } },
    select: { id: true },
  });

  if (e2eVacancies.length > 0) {
    const vacancyIds = e2eVacancies.map((v) => v.id);

    // Delete children first (foreign key constraints)
    await prisma.applicationNote.deleteMany({
      where: { application: { vacancyId: { in: vacancyIds } } },
    });
    await prisma.coverLetterDraft.deleteMany({
      where: { application: { vacancyId: { in: vacancyIds } } },
    });
    await prisma.resumeDraft.deleteMany({
      where: { application: { vacancyId: { in: vacancyIds } } },
    });
    await prisma.application.deleteMany({
      where: { vacancyId: { in: vacancyIds } },
    });
    await prisma.vacancy.deleteMany({
      where: { id: { in: vacancyIds } },
    });

    console.log(`   Removed ${e2eVacancies.length} test application(s)`);
  }

  // Delete work roles created via "Add Role" with E2E company names
  const e2eRoles = await prisma.workRole.findMany({
    where: { company: { name: { startsWith: 'E2E' } } },
    select: { id: true, company: { select: { id: true } } },
  });

  if (e2eRoles.length > 0) {
    const roleIds = e2eRoles.map((r) => r.id);
    const companyIds = [...new Set(e2eRoles.map((r) => r.company.id))];

    await prisma.workProject.deleteMany({ where: { roleId: { in: roleIds } } });
    await prisma.workRole.deleteMany({ where: { id: { in: roleIds } } });
    await prisma.workCompany.deleteMany({ where: { id: { in: companyIds } } });

    console.log(`   Removed ${e2eRoles.length} test work role(s)`);
  }

  if (e2eVacancies.length === 0 && e2eRoles.length === 0) {
    console.log('   No test data found');
  }

  await prisma.$disconnect();
}
