-- Cuentas contables para VENECORO (Transporte)
-- Company ID: cmis3j65t000712d2bx4izgfy

-- GASTOS OPERATIVOS
INSERT INTO chart_of_accounts (id, code, name, type, description, balance, "companyId", "createdAt", "updatedAt") VALUES
(gen_random_uuid()::text, '5001', 'Combustible', 'EXPENSE', 'Gasolina, diesel para vehiculos', 0, 'cmis3j65t000712d2bx4izgfy', NOW(), NOW());

INSERT INTO chart_of_accounts (id, code, name, type, description, balance, "companyId", "createdAt", "updatedAt") VALUES
(gen_random_uuid()::text, '5002', 'Seguro de Vehiculos', 'EXPENSE', 'Polizas de seguro de transporte', 0, 'cmis3j65t000712d2bx4izgfy', NOW(), NOW());

INSERT INTO chart_of_accounts (id, code, name, type, description, balance, "companyId", "createdAt", "updatedAt") VALUES
(gen_random_uuid()::text, '5003', 'Salarios Choferes', 'EXPENSE', 'Pagos a conductores', 0, 'cmis3j65t000712d2bx4izgfy', NOW(), NOW());

INSERT INTO chart_of_accounts (id, code, name, type, description, balance, "companyId", "createdAt", "updatedAt") VALUES
(gen_random_uuid()::text, '5004', 'Mantenimiento Vehiculos', 'EXPENSE', 'Reparaciones y mantenimiento preventivo', 0, 'cmis3j65t000712d2bx4izgfy', NOW(), NOW());

INSERT INTO chart_of_accounts (id, code, name, type, description, balance, "companyId", "createdAt", "updatedAt") VALUES
(gen_random_uuid()::text, '5005', 'Permisos y Licencias', 'EXPENSE', 'Stickers, permisos de operacion, licencias', 0, 'cmis3j65t000712d2bx4izgfy', NOW(), NOW());

INSERT INTO chart_of_accounts (id, code, name, type, description, balance, "companyId", "createdAt", "updatedAt") VALUES
(gen_random_uuid()::text, '5006', 'Peajes', 'EXPENSE', 'Peajes y estacionamiento', 0, 'cmis3j65t000712d2bx4izgfy', NOW(), NOW());

INSERT INTO chart_of_accounts (id, code, name, type, description, balance, "companyId", "createdAt", "updatedAt") VALUES
(gen_random_uuid()::text, '5007', 'Repuestos y Llantas', 'EXPENSE', 'Compra de repuestos y llantas', 0, 'cmis3j65t000712d2bx4izgfy', NOW(), NOW());

INSERT INTO chart_of_accounts (id, code, name, type, description, balance, "companyId", "createdAt", "updatedAt") VALUES
(gen_random_uuid()::text, '5008', 'Gastos Administrativos', 'EXPENSE', 'Gastos de oficina y administracion', 0, 'cmis3j65t000712d2bx4izgfy', NOW(), NOW());

-- PASIVOS (Deudas)
INSERT INTO chart_of_accounts (id, code, name, type, description, balance, "companyId", "createdAt", "updatedAt") VALUES
(gen_random_uuid()::text, '2001', 'Prestamo Vehiculo', 'LIABILITY', 'Financiamiento/letra del carro', 0, 'cmis3j65t000712d2bx4izgfy', NOW(), NOW());

-- INGRESOS
INSERT INTO chart_of_accounts (id, code, name, type, description, balance, "companyId", "createdAt", "updatedAt") VALUES
(gen_random_uuid()::text, '4001', 'Ingresos por Transporte', 'REVENUE', 'Servicios de transporte prestados', 0, 'cmis3j65t000712d2bx4izgfy', NOW(), NOW());

INSERT INTO chart_of_accounts (id, code, name, type, description, balance, "companyId", "createdAt", "updatedAt") VALUES
(gen_random_uuid()::text, '4002', 'Ingresos por Fletes', 'REVENUE', 'Servicios de flete y mudanzas', 0, 'cmis3j65t000712d2bx4izgfy', NOW(), NOW());

-- ACTIVOS
INSERT INTO chart_of_accounts (id, code, name, type, description, balance, "companyId", "createdAt", "updatedAt") VALUES
(gen_random_uuid()::text, '1001', 'Caja', 'ASSET', 'Efectivo en caja', 0, 'cmis3j65t000712d2bx4izgfy', NOW(), NOW());

INSERT INTO chart_of_accounts (id, code, name, type, description, balance, "companyId", "createdAt", "updatedAt") VALUES
(gen_random_uuid()::text, '1002', 'Banco', 'ASSET', 'Cuentas bancarias', 0, 'cmis3j65t000712d2bx4izgfy', NOW(), NOW());

INSERT INTO chart_of_accounts (id, code, name, type, description, balance, "companyId", "createdAt", "updatedAt") VALUES
(gen_random_uuid()::text, '1003', 'Vehiculos', 'ASSET', 'Flota de vehiculos', 0, 'cmis3j65t000712d2bx4izgfy', NOW(), NOW());

-- Categorias de gastos para expenses
INSERT INTO expense_categories (id, name, description, type, "taxRate", "companyId", "createdAt", "updatedAt") VALUES
(gen_random_uuid()::text, 'Combustible', 'Gasolina y diesel', 'OPERATING', 0, 'cmis3j65t000712d2bx4izgfy', NOW(), NOW());

INSERT INTO expense_categories (id, name, description, type, "taxRate", "companyId", "createdAt", "updatedAt") VALUES
(gen_random_uuid()::text, 'Seguro', 'Seguros de vehiculos', 'OPERATING', 0, 'cmis3j65t000712d2bx4izgfy', NOW(), NOW());

INSERT INTO expense_categories (id, name, description, type, "taxRate", "companyId", "createdAt", "updatedAt") VALUES
(gen_random_uuid()::text, 'Salarios Choferes', 'Pagos a conductores', 'OPERATING', 0, 'cmis3j65t000712d2bx4izgfy', NOW(), NOW());

INSERT INTO expense_categories (id, name, description, type, "taxRate", "companyId", "createdAt", "updatedAt") VALUES
(gen_random_uuid()::text, 'Mantenimiento', 'Reparaciones y mantenimiento', 'OPERATING', 0, 'cmis3j65t000712d2bx4izgfy', NOW(), NOW());

INSERT INTO expense_categories (id, name, description, type, "taxRate", "companyId", "createdAt", "updatedAt") VALUES
(gen_random_uuid()::text, 'Permisos y Licencias', 'Stickers, permisos, licencias', 'ADMINISTRATIVE', 0, 'cmis3j65t000712d2bx4izgfy', NOW(), NOW());

INSERT INTO expense_categories (id, name, description, type, "taxRate", "companyId", "createdAt", "updatedAt") VALUES
(gen_random_uuid()::text, 'Peajes', 'Peajes y estacionamiento', 'OPERATING', 0, 'cmis3j65t000712d2bx4izgfy', NOW(), NOW());

INSERT INTO expense_categories (id, name, description, type, "taxRate", "companyId", "createdAt", "updatedAt") VALUES
(gen_random_uuid()::text, 'Repuestos', 'Repuestos y llantas', 'OPERATING', 0, 'cmis3j65t000712d2bx4izgfy', NOW(), NOW());

INSERT INTO expense_categories (id, name, description, type, "taxRate", "companyId", "createdAt", "updatedAt") VALUES
(gen_random_uuid()::text, 'Letra Vehiculo', 'Pago financiamiento de vehiculo', 'FINANCIAL', 0, 'cmis3j65t000712d2bx4izgfy', NOW(), NOW());

INSERT INTO expense_categories (id, name, description, type, "taxRate", "companyId", "createdAt", "updatedAt") VALUES
(gen_random_uuid()::text, 'Gastos Administrativos', 'Oficina y administracion', 'ADMINISTRATIVE', 0, 'cmis3j65t000712d2bx4izgfy', NOW(), NOW());
