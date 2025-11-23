import { prisma } from '../src/lib/prisma'

async function seedFloridaTaxRates() {
  console.log('Seeding Florida sales tax rates...')
  
  // Florida state sales tax is 6%
  // County surtax varies by county (0.5% - 2.5%)
  
  const floridaCounties = [
    { county: 'Miami-Dade', countyTax: 0.01 },     // 1%
    { county: 'Broward', countyTax: 0.01 },        // 1%
    { county: 'Palm Beach', countyTax: 0.01 },     // 1%
    { county: 'Orange', countyTax: 0.005 },        // 0.5%
    { county: 'Hillsborough', countyTax: 0.0085 }, // 0.85%
    { county: 'Pinellas', countyTax: 0.01 },       // 1%
    { county: 'Duval', countyTax: 0.0075 },        // 0.75%
    { county: 'Lee', countyTax: 0.01 },            // 1%
    { county: 'Polk', countyTax: 0.01 },           // 1%
    { county: 'Brevard', countyTax: 0.01 }         // 1%
  ]
  
  const stateTaxRate = 0.06 // 6% Florida state sales tax
  
  for (const countyData of floridaCounties) {
    await (prisma as any).salesTaxRate.upsert({
      where: {
        state_county_city_zipCode_effectiveDate: {
          state: 'FL',
          county: countyData.county,
          city: '',
          zipCode: '',
          effectiveDate: new Date('2024-01-01')
        }
      },
      create: {
        state: 'FL',
        county: countyData.county,
        city: '',
        zipCode: '',
        stateTaxRate,
        countyTaxRate: countyData.countyTax,
        cityTaxRate: 0,
        specialTaxRate: 0,
        totalTaxRate: stateTaxRate + countyData.countyTax,
        effectiveDate: new Date('2024-01-01'),
        isActive: true,
        description: `${countyData.county} County, Florida sales tax`
      },
      update: {
        stateTaxRate,
        countyTaxRate: countyData.countyTax,
        totalTaxRate: stateTaxRate + countyData.countyTax,
        isActive: true
      }
    })
    
    console.log(`✓ ${countyData.county} County: ${((stateTaxRate + countyData.countyTax) * 100).toFixed(2)}%`)
  }
  
  console.log('Florida sales tax rates seeded successfully!')
}

async function main() {
  try {
    await seedFloridaTaxRates()
    console.log('\n✓ All seed data created successfully')
  } catch (error) {
    console.error('Error seeding database:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
