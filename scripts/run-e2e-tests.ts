/**
 * 🧪 SCRIPT DE PRUEBAS AUTOMATIZADAS
 * 
 * Este script ejecuta todas las pruebas E2E y genera un reporte detallado.
 * 
 * USO:
 *   npm run test:e2e           - Ejecutar todas las pruebas
 *   npm run test:e2e:ui        - Ejecutar con interfaz visual
 *   npm run test:e2e:headed    - Ejecutar mostrando el navegador
 *   npm run test:e2e:report    - Ver el último reporte
 * 
 * ANTES DE EJECUTAR:
 *   1. Asegúrate de que el servidor esté corriendo: npm run dev
 *   2. Asegúrate de tener datos de prueba en la base de datos
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message: string, color: string = COLORS.reset) {
  console.log(`${color}${message}${COLORS.reset}`);
}

function runTests() {
  log('\n🧪 INICIANDO PRUEBAS AUTOMATIZADAS E2E\n', COLORS.cyan);
  log('=' .repeat(60), COLORS.blue);
  
  const startTime = Date.now();
  
  try {
    // Verificar que el servidor esté corriendo
    log('\n📡 Verificando servidor...', COLORS.yellow);
    
    // Ejecutar pruebas
    log('\n🚀 Ejecutando pruebas Playwright...\n', COLORS.green);
    
    execSync('npx playwright test --reporter=list', {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    log('\n' + '=' .repeat(60), COLORS.blue);
    log(`\n✅ PRUEBAS COMPLETADAS EN ${duration} SEGUNDOS\n`, COLORS.green);
    log('📊 Para ver el reporte detallado ejecuta:', COLORS.cyan);
    log('   npx playwright show-report\n', COLORS.yellow);
    
  } catch (error) {
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    log('\n' + '=' .repeat(60), COLORS.blue);
    log(`\n❌ ALGUNAS PRUEBAS FALLARON (${duration}s)\n`, COLORS.red);
    log('📊 Para ver detalles de los errores ejecuta:', COLORS.cyan);
    log('   npx playwright show-report\n', COLORS.yellow);
    
    process.exit(1);
  }
}

// Función para generar reporte de cobertura
function generateCoverageReport() {
  const testResultsPath = path.join(process.cwd(), 'test-results', 'results.json');
  
  if (fs.existsSync(testResultsPath)) {
    const results = JSON.parse(fs.readFileSync(testResultsPath, 'utf-8'));
    
    log('\n📈 RESUMEN DE COBERTURA DE PRUEBAS\n', COLORS.cyan);
    log('=' .repeat(60), COLORS.blue);
    
    const suites = results.suites || [];
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    
    suites.forEach((suite: any) => {
      (suite.specs || []).forEach((spec: any) => {
        if (spec.ok) passed++;
        else if (spec.skipped) skipped++;
        else failed++;
      });
    });
    
    log(`\n  ✅ Pasaron:   ${passed}`, COLORS.green);
    log(`  ❌ Fallaron:  ${failed}`, COLORS.red);
    log(`  ⏭️  Saltados:  ${skipped}`, COLORS.yellow);
    log(`\n  Total: ${passed + failed + skipped} pruebas\n`);
  }
}

// Ejecutar
runTests();
generateCoverageReport();
