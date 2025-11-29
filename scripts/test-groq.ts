/**
 * Script de prueba para verificar Groq AI
 * 
 * Ejecutar: npx ts-node --skip-project scripts/test-groq.ts
 * O: npx tsx scripts/test-groq.ts
 */

import Groq from 'groq-sdk'

async function testGroq() {
  console.log('\n🧪 Probando conexión con Groq AI...\n')
  
  // Verificar API Key
  const apiKey = process.env.GROQ_API_KEY
  
  if (!apiKey) {
    console.log('❌ GROQ_API_KEY no está configurada')
    console.log('\n📋 Pasos para configurar:')
    console.log('1. Ve a https://console.groq.com')
    console.log('2. Crea cuenta y genera API Key')
    console.log('3. Agrega a .env.local:')
    console.log('   GROQ_API_KEY=gsk_tu_key_aqui')
    console.log('4. Reinicia el servidor')
    return
  }
  
  console.log('✅ GROQ_API_KEY encontrada:', apiKey.substring(0, 10) + '...')
  
  try {
    const groq = new Groq({ apiKey })
    
    console.log('\n📤 Enviando mensaje de prueba...')
    
    const startTime = Date.now()
    
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: 'Responde solo con "¡Groq funciona correctamente!" sin explicaciones adicionales.'
        }
      ],
      temperature: 0,
      max_tokens: 50
    })
    
    const endTime = Date.now()
    const content = response.choices[0]?.message?.content
    
    console.log('\n📥 Respuesta de Groq:')
    console.log(`   "${content}"`)
    console.log(`\n⚡ Tiempo de respuesta: ${endTime - startTime}ms`)
    console.log(`📊 Modelo: ${response.model}`)
    console.log(`🔢 Tokens usados: ${response.usage?.total_tokens || 'N/A'}`)
    
    console.log('\n✅ ¡Groq está funcionando correctamente!\n')
    
    // Prueba adicional: categorización de gasto
    console.log('🧾 Probando categorización de gasto...\n')
    
    const categorizeResponse = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'user',
          content: `Categoriza este gasto para contabilidad en Florida:
"OFFICE DEPOT #1234 - $156.99"

Responde solo con JSON:
{"category": "nombre", "accountCode": "XXXX", "deductible": true/false}`
        }
      ],
      temperature: 0.1,
      max_tokens: 100,
      response_format: { type: 'json_object' }
    })
    
    const categoryResult = categorizeResponse.choices[0]?.message?.content
    console.log('📂 Categorización:')
    console.log(categoryResult)
    
    console.log('\n🎉 ¡Todas las pruebas pasaron!\n')
    
  } catch (error: any) {
    console.log('\n❌ Error al conectar con Groq:')
    console.log(error.message)
    
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.log('\n⚠️  La API Key parece ser inválida')
      console.log('   Verifica que copiaste la key correctamente')
    }
    
    if (error.message.includes('rate limit')) {
      console.log('\n⚠️  Límite de rate alcanzado')
      console.log('   Espera unos segundos e intenta de nuevo')
    }
  }
}

// Cargar variables de entorno
import * as fs from 'fs'
import * as path from 'path'

// Leer .env.local manualmente
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').replace(/^["']|["']$/g, '')
      process.env[key.trim()] = value.trim()
    }
  })
}

testGroq()
