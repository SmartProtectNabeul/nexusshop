const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.oierrahjocfaeoffysqw:MRmidonajjar123@aws-0-eu-west-1.pooler.supabase.com:5432/postgres'
});

async function main() {
  await client.connect();
  
  try {
    console.log('Altering table...');
    await client.query(`ALTER TABLE "Payment" DROP COLUMN IF EXISTS "reference";`);
    await client.query(`ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "transactionId" TEXT NOT NULL;`);
    await client.query(`ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "senderPhone" TEXT NOT NULL;`);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "Payment_transactionId_key" ON "Payment"("transactionId");`);
    console.log('Success!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

main();
