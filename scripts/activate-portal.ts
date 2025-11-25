import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function activatePortal() {
  console.log('Activando portal para Juan Pérez...\n');
  
  // Primero encontrar el cliente
  const customerToUpdate = await prisma.customer.findFirst({
    where: { email: 'juan.perez@email.com' },
  });

  if (!customerToUpdate) {
    console.log('❌ Cliente no encontrado');
    return;
  }
  
  const portalPassword = await bcrypt.hash('client123', 10);
  
  const customer = await prisma.customer.update({
    where: { id: customerToUpdate.id },
    data: {
      portalActive: true,
      portalPassword: portalPassword,
    },
  });

  console.log('✅ Portal activado!');
  console.log(`Email: ${customer.email}`);
  console.log(`Contraseña: client123`);
  console.log(`Portal activo: ${customer.portalActive}`);

  await prisma.$disconnect();
}

activatePortal().catch(console.error);
