import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const statuses = [
  'presupuesto_generado',
  'oc_recibida',
  'facturado',
  'pago_recibido',
  'documentacion_enviada',
  'documentacion_aprobada',
  'service_programado',
  'en_ejecucion',
  'completado',
  'cancelado'
];

const priorities = ['baja', 'media', 'alta'];

async function seed() {
  console.log('🌱 Seeding database...');

  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: { name: 'admin' }
  });

  const techRole = await prisma.role.upsert({
    where: { name: 'tecnico' },
    update: {},
    create: { name: 'tecnico' }
  });

  const password = await bcrypt.hash('ChangeMe123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@dcm.local' },
    update: {},
    create: {
      first_name: 'Admin',
      last_name: 'DCM',
      email: 'admin@dcm.local',
      password,
      role_id: adminRole.id
    }
  });

  const techEmails = ['tecnico1@dcm.local', 'tecnico2@dcm.local', 'tecnico3@dcm.local'];
  const techs = [];

  for (let i = 0; i < techEmails.length; i += 1) {
    const tech = await prisma.user.upsert({
      where: { email: techEmails[i] },
      update: {},
      create: {
        first_name: `Tecnico${i + 1}`,
        last_name: 'DCM',
        email: techEmails[i],
        password,
        role_id: techRole.id
      }
    });
    techs.push(tech);
  }
  console.log('✅ Users seeded');

  const clients = [];
  for (let i = 1; i <= 5; i += 1) {
    const client = await prisma.client.upsert({
      where: { id: `seed-client-${i}` },
      update: {},
      create: {
        id: `seed-client-${i}`,
        nombre_empresa: `Cliente ${i}`,
        email: `cliente${i}@mail.com`,
        telefono: `+54114000000${i}`,
        persona_contacto: `Contacto ${i}`,
        direccion: `Calle ${i} 123`,
        fecha_vencimiento_documentacion: new Date(Date.now() + (i - 3) * 86400000 * 10),
        observaciones: `Observación cliente ${i}`
      }
    });
    clients.push(client);
  }
  console.log('✅ Clients seeded');

  const equipmentStates = ['operativo', 'mantenimiento', 'fuera_servicio', 'en_revision'];
  for (let i = 1; i <= 10; i += 1) {
    await prisma.equipment.upsert({
      where: { numero_serie: `SN-DCM-${1000 + i}` },
      update: {},
      create: {
        client_id: clients[i % clients.length].id,
        tipo_equipo: `Equipo tipo ${((i - 1) % 4) + 1}`,
        modelo: `Model-${i}`,
        numero_serie: `SN-DCM-${1000 + i}`,
        ubicacion_planta: `Planta ${((i - 1) % 3) + 1}`,
        estado_actual: equipmentStates[i % 4]
      }
    });
  }
  console.log('✅ Equipments seeded');

  for (let i = 1; i <= 20; i += 1) {
    const estado = statuses[i % statuses.length];
    const prioridad = priorities[i % priorities.length];
    const orderId = `seed-order-${i}`;

    const order = await prisma.serviceOrder.upsert({
      where: { id: orderId },
      update: {},
      create: {
        id: orderId,
        client_id: clients[i % clients.length].id,
        estado,
        prioridad,
        prioridad_peso: prioridad === 'alta' ? 3 : prioridad === 'media' ? 2 : 1,
        fecha_programada: new Date(Date.now() + (i - 8) * 86400000),
        direccion_service: `Dirección servicio ${i}`,
        contacto_planta: `Contacto planta ${i}`,
        telefono_contacto_planta: `+5411500000${i}`,
        observaciones: `Observaciones ${i}`
      }
    });

    await prisma.serviceOrderTechnician.upsert({
      where: {
        service_order_id_technician_id: {
          service_order_id: order.id,
          technician_id: techs[i % techs.length].id
        }
      },
      update: {},
      create: {
        service_order_id: order.id,
        technician_id: techs[i % techs.length].id,
        asignado_por: admin.email
      }
    });

    await prisma.serviceOrderTechnician.upsert({
      where: {
        service_order_id_technician_id: {
          service_order_id: order.id,
          technician_id: techs[(i + 1) % techs.length].id
        }
      },
      update: {},
      create: {
        service_order_id: order.id,
        technician_id: techs[(i + 1) % techs.length].id,
        asignado_por: admin.email
      }
    });

    await prisma.serviceOrderStatusHistory.upsert({
      where: { id: `seed-history-${i}` },
      update: {},
      create: {
        id: `seed-history-${i}`,
        service_order_id: order.id,
        estado_anterior: null,
        estado_nuevo: estado,
        campo_modificado: 'estado',
        valor_anterior: null,
        valor_nuevo: estado,
        comentario: 'Seed inicial',
        usuario_id: admin.id
      }
    });
  }

  console.log('✅ Service orders seeded');
  console.log('🌱 Seed finished');
}

try {
  await seed();
} catch (error) {
  console.error('Seed error:', error);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
