#!/usr/bin/env node

import { DelegatedKeyManager } from '../utils/delegatedKey';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('\n🔑 kumbo Delegated Key Manager\n');
  console.log('1. Generate new delegated key');
  console.log('2. List all delegated keys');
  console.log('3. Show delegated key for wallet');
  console.log('4. Exit\n');

  const choice = await question('Select option (1-4): ');

  switch (choice) {
    case '1':
      await generateKey();
      break;
    case '2':
      listKeys();
      break;
    case '3':
      await showKey();
      break;
    case '4':
      process.exit(0);
    default:
      console.log('Invalid option');
  }

  // Show menu again
  await main();
}

async function generateKey() {
  const walletAddress = await question('\nEnter wallet address: ');
  
  if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
    console.log('❌ Invalid wallet address');
    return;
  }

  const existing = DelegatedKeyManager.getDelegatedKey(walletAddress);
  if (existing) {
    console.log('\n⚠️  Delegated key already exists for this wallet:');
    console.log(`   Address: ${existing.address}`);
    const overwrite = await question('\nOverwrite? (y/n): ');
    if (overwrite.toLowerCase() !== 'y') {
      return;
    }
  }

  const delegatedKey = DelegatedKeyManager.generateDelegatedKey(walletAddress);
  
  console.log('\n✅ Delegated key generated successfully!');
  console.log(`   Main Wallet: ${walletAddress}`);
  console.log(`   Delegated Address: ${delegatedKey.address}`);
  console.log('\n⚠️  IMPORTANT: You must authorize this delegated address on Kuma Exchange!');
  console.log('   Go to Kuma Exchange and associate this address with your main wallet.\n');
}

function listKeys() {
  const keys = DelegatedKeyManager.listDelegatedKeys();
  
  if (keys.length === 0) {
    console.log('\n📭 No delegated keys found\n');
    return;
  }

  console.log('\n📋 Delegated Keys:\n');
  keys.forEach((key, index) => {
    console.log(`${index + 1}. Main Wallet: ${key.mainWallet}`);
    console.log(`   Delegated: ${key.delegatedAddress}`);
    console.log(`   Created: ${key.createdAt}\n`);
  });
}

async function showKey() {
  const walletAddress = await question('\nEnter wallet address: ');
  
  const delegatedKey = DelegatedKeyManager.getDelegatedKey(walletAddress);
  
  if (!delegatedKey) {
    console.log('\n❌ No delegated key found for this wallet\n');
    return;
  }

  console.log('\n✅ Delegated key found:');
  console.log(`   Address: ${delegatedKey.address}\n`);
}

// Run the CLI
main().catch(console.error); 