const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
async function main() {
  const userId = 'cmjnflyds00004yvsi7feipxt'
  const companyId = 'cmjnfngxx00024yvszbcr5yf1'

  console.log('Attempting prisma.uploadedDocument.create...')
  const doc = await p.uploadedDocument.create({
    data: {
      filename: 'test.pdf',
      originalName: 'test.pdf',
      mimeType: 'application/pdf',
      fileSize: 1234,
      status: 'ANALYZED',
      documentType: 'OTHER',
      uploadedById: userId,
      companyId: companyId,
      aiAnalysis: undefined,
      extractedData: undefined,
      suggestedCategory: null,
      aiConfidence: null,
      processingTime: null,
      amount: null,
      invoiceNumber: null,
      description: null,
    }
  })
  console.log('SUCCESS. Created doc:', doc.id)

  // cleanup
  await p.uploadedDocument.delete({ where: { id: doc.id } })
  console.log('Cleaned up test doc.')
}
main().catch(e => {
  console.error('ERROR:', e.message)
  console.error('Code:', e.code)
  console.error('Meta:', JSON.stringify(e.meta))
}).finally(() => p.$disconnect())
