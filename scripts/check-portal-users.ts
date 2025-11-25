import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPortalUsers() {
  console.log('Verificando usuarios del portal...\n');
  
  const customers = await prisma.customer.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      portalActive: true,
      portalPassword: true,
      portalLastLogin: true,
    },
  });

  console.log(`Total de clientes: ${customers.length}\n`);

  customers.forEach((customer, index) => {
    console.log(`Cliente ${index + 1}:`);
    console.log(`  Nombre: ${customer.name}`);
    console.log(`  Email: ${customer.email}`);
    console.log(`  Portal activo: ${customer.portalActive}`);
    console.log(`  Tiene contraseña: ${customer.portalPassword ? 'Sí' : 'No'}`);
    console.log(`  Último login: ${customer.portalLastLogin || 'Nunca'}`);
    console.log('');
  });

  await prisma.$disconnect();
}

checkPortalUsers().catch(console.error);
