const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
async function main() {
  const users = await p.user.count()
  const companies = await p.company.count()
  const cu = await p.companyUser.count()
  const docs = await p.uploadedDocument.count()
  console.log({ users, companies, cu, docs })

  // show first user and first company
  const firstUser = await p.user.findFirst({ select: { id: true, email: true } })
  const firstCompany = await p.company.findFirst({ select: { id: true, name: true } })
  const firstCU = await p.companyUser.findFirst({ select: { userId: true, companyId: true } })
  console.log('First user:', firstUser)
  console.log('First company:', firstCompany)
  console.log('First CompanyUser:', firstCU)
}
main().catch(e => console.error('DB Error:', e.message, e.code)).finally(() => p.$disconnect())
