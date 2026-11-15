const { MongoMemoryServer } = require('mongodb-memory-server');

async function main() {
  console.log('[Setup] Pre-caching MongoDB in-memory server binary...');
  const mongod = await MongoMemoryServer.create({
    binary: {
      version: '6.0.14'
    }
  });
  console.log('[Setup] MongoDB binary successfully verified! URI:', mongod.getUri());
  await mongod.stop();
  console.log('[Setup] Binary cached successfully.');
  process.exit(0);
}

main().catch(err => {
  console.error('[Setup] Error caching MongoDB binary:', err.message);
  process.exit(1);
});

